import { NextRequest, NextResponse } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import type { SandboxState } from '@/types/sandbox';
import { selectFilesForEdit, getFileContents, formatFilesForAI } from '@/lib/context-selector';
import { executeSearchPlan, formatSearchResultsForAI, selectTargetFile } from '@/lib/file-search-executor';
import { FileManifest } from '@/types/file-manifest';
import type { ConversationState, ConversationMessage, ConversationEdit } from '@/types/conversation';
import { appConfig } from '@/config/app.config';
import { resolveModel } from '@/lib/model-resolver';

// Fallback NVIDIA NIM — OpenAI-compatible endpoint
const nvidia = createOpenAI({
  apiKey: process.env.NVIDIA_API_KEY ?? '',
  baseURL: 'https://integrate.api.nvidia.com/v1',
});


// Helper function to analyze user preferences from conversation history
function analyzeUserPreferences(messages: ConversationMessage[]): {
  commonPatterns: string[];
  preferredEditStyle: 'targeted' | 'comprehensive';
} {
  const userMessages = messages.filter(m => m.role === 'user');
  const patterns: string[] = [];
  
  // Count edit-related keywords
  let targetedEditCount = 0;
  let comprehensiveEditCount = 0;
  
  userMessages.forEach(msg => {
    const content = msg.content.toLowerCase();
    
    // Check for targeted edit patterns
    if (content.match(/\b(update|change|fix|modify|edit|remove|delete)\s+(\w+\s+)?(\w+)\b/)) {
      targetedEditCount++;
    }
    
    // Check for comprehensive edit patterns
    if (content.match(/\b(rebuild|recreate|redesign|overhaul|refactor)\b/)) {
      comprehensiveEditCount++;
    }
    
    // Extract common request patterns
    if (content.includes('hero')) patterns.push('hero section edits');
    if (content.includes('header')) patterns.push('header modifications');
    if (content.includes('color') || content.includes('style')) patterns.push('styling changes');
    if (content.includes('button')) patterns.push('button updates');
    if (content.includes('animation')) patterns.push('animation requests');
  });
  
  return {
    commonPatterns: [...new Set(patterns)].slice(0, 3), // Top 3 unique patterns
    preferredEditStyle: targetedEditCount > comprehensiveEditCount ? 'targeted' : 'comprehensive'
  };
}

declare global {
  var sandboxState: SandboxState;
  var conversationState: ConversationState | null;
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, model = 'openai/gpt-oss-20b', context, isEdit = false, stage = 'frontend' } = await request.json();
    
    console.log('[generate-ai-code-stream] Received request:');
    console.log('[generate-ai-code-stream] - prompt:', prompt);
    console.log('[generate-ai-code-stream] - stage:', stage);
    console.log('[generate-ai-code-stream] - isEdit:', isEdit);
    console.log('[generate-ai-code-stream] - context.sandboxId:', context?.sandboxId);
    console.log('[generate-ai-code-stream] - context.currentFiles:', context?.currentFiles ? Object.keys(context.currentFiles) : 'none');
    console.log('[generate-ai-code-stream] - currentFiles count:', context?.currentFiles ? Object.keys(context.currentFiles).length : 0);
    
    // Initialize conversation state if not exists
    if (!global.conversationState) {
      global.conversationState = {
        conversationId: `conv-${Date.now()}`,
        startedAt: Date.now(),
        lastUpdated: Date.now(),
        context: {
          messages: [],
          edits: [],
          projectEvolution: { majorChanges: [] },
          userPreferences: {}
        }
      };
    }
    
    // Add user message to conversation history
    const userMessage: ConversationMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
      metadata: {
        sandboxId: context?.sandboxId
      }
    };
    global.conversationState.context.messages.push(userMessage);
    
    // Clean up old messages to prevent unbounded growth
    if (global.conversationState.context.messages.length > 20) {
      // Keep only the last 15 messages
      global.conversationState.context.messages = global.conversationState.context.messages.slice(-15);
      console.log('[generate-ai-code-stream] Trimmed conversation history to prevent context overflow');
    }
    
    // Clean up old edits
    if (global.conversationState.context.edits.length > 10) {
      global.conversationState.context.edits = global.conversationState.context.edits.slice(-8);
    }
    
    // Debug: Show a sample of actual file content
    if (context?.currentFiles && Object.keys(context.currentFiles).length > 0) {
      const firstFile = Object.entries(context.currentFiles)[0];
      console.log('[generate-ai-code-stream] - sample file:', firstFile[0]);
      console.log('[generate-ai-code-stream] - sample content preview:', 
        typeof firstFile[1] === 'string' ? firstFile[1].substring(0, 100) + '...' : 'not a string');
    }
    
    if (!prompt) {
      return NextResponse.json({ 
        success: false, 
        error: 'Prompt is required' 
      }, { status: 400 });
    }
    
    // Create a stream for real-time updates
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    
    // Function to send progress updates
    const sendProgress = async (data: any) => {
      const message = `data: ${JSON.stringify(data)}\n\n`;
      await writer.write(encoder.encode(message));
    };
    
    // Start processing in background
    (async () => {
      try {
        // Send initial status with stage info
        await sendProgress({ type: 'status', message: stage === 'backend' ? '🔧 Starting backend generation...' : '🎨 Analyzing your request...' });
        
        // ============ PROMPT ANALYSIS PHASE ============
        let enrichedPrompt = prompt;
        let appType = 'general';
        
        if (!isEdit && stage === 'frontend') {
          // Detect app type from prompt keywords
          const lower = prompt.toLowerCase();
          if (lower.match(/e-?commerce|shop|store|product|cart|checkout/)) appType = 'ecommerce';
          else if (lower.match(/dashboard|admin|analytics|chart|graph/)) appType = 'dashboard';
          else if (lower.match(/portfolio|resume|cv|personal/)) appType = 'portfolio';
          else if (lower.match(/blog|article|post|writing/)) appType = 'blog';
          else if (lower.match(/landing|saas|startup|marketing/)) appType = 'landing';
          else if (lower.match(/task|todo|project|manage|kanban/)) appType = 'taskmanager';
          else if (lower.match(/restaurant|food|menu|order/)) appType = 'restaurant';
          else if (lower.match(/social|chat|messaging|community/)) appType = 'social';
          
          // Enrich vague prompts with specific requirements
          if (prompt.split(' ').length < 10) {
            const enrichments: Record<string, string> = {
              ecommerce: 'with product grid, product detail modal, shopping cart sidebar, and checkout form. Include hero banner, featured products, and footer.',
              dashboard: 'with sidebar navigation, stat cards, data table, and chart section. Include dark theme, responsive layout.',
              portfolio: 'with hero section, about me, projects showcase grid, skills section, and contact form. Modern dark theme.',
              blog: 'with article list, article detail view, sidebar with categories, and responsive layout.',
              landing: 'with hero section, features grid, testimonials, pricing cards, CTA section, and footer.',
              taskmanager: 'with task list, add task form, status toggle, priority badges, and filter options.',
              restaurant: 'with hero banner, menu sections with food cards, reservation form, and footer with location.',
              social: 'with post feed, create post form, user profile card, and sidebar navigation.',
              general: 'with hero section, features section, about section, and footer. Modern responsive design.'
            };
            enrichedPrompt = `${prompt} ${enrichments[appType] || enrichments.general}`;
            console.log(`[generate-ai-code-stream] Enriched prompt (${appType}): ${enrichedPrompt}`);
          }
          
          await sendProgress({ type: 'status', message: `Detected ${appType} app — planning architecture...` });
        }
        
        // No keep-alive needed - sandbox provisioned for 10 minutes
        
        // Check if we have a file manifest for edit mode
        let editContext = null;
        let enhancedSystemPrompt = '';
        
        if (isEdit) {
          console.log('[generate-ai-code-stream] Edit mode detected - starting agentic search workflow');
          console.log('[generate-ai-code-stream] Has fileCache:', !!global.sandboxState?.fileCache);
          console.log('[generate-ai-code-stream] Has manifest:', !!global.sandboxState?.fileCache?.manifest);
          
          const manifest: FileManifest | undefined = global.sandboxState?.fileCache?.manifest;
          
          if (manifest) {
            await sendProgress({ type: 'status', message: '🔍 Creating search plan...' });
            
            const fileContents = global.sandboxState?.fileCache?.files || {};
            console.log('[generate-ai-code-stream] Files available for search:', Object.keys(fileContents).length);
            
            // STEP 1: Get search plan from AI
            try {
              const intentResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/analyze-edit-intent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, manifest, model })
              });
              
              if (intentResponse.ok) {
                const { searchPlan } = await intentResponse.json();
                console.log('[generate-ai-code-stream] Search plan received:', searchPlan);
                
                await sendProgress({ 
                  type: 'status', 
                  message: `🔎 Searching for: "${searchPlan.searchTerms.join('", "')}"`
                });
                
                // STEP 2: Execute the search plan
                const searchExecution = executeSearchPlan(searchPlan, 
                  Object.fromEntries(
                    Object.entries(fileContents).map(([path, data]) => [
                      path.startsWith('/') ? path : `/home/user/app/${path}`,
                      data.content
                    ])
                  )
                );
                
                console.log('[generate-ai-code-stream] Search execution:', {
                  success: searchExecution.success,
                  resultsCount: searchExecution.results.length,
                  filesSearched: searchExecution.filesSearched,
                  time: searchExecution.executionTime + 'ms'
                });
                
                if (searchExecution.success && searchExecution.results.length > 0) {
                  // STEP 3: Select the best target file
                  const target = selectTargetFile(searchExecution.results, searchPlan.editType);
                  
                  if (target) {
                    await sendProgress({ 
                      type: 'status', 
                      message: `✅ Found code in ${target.filePath.split('/').pop()} at line ${target.lineNumber}`
                    });
                    
                    console.log('[generate-ai-code-stream] Target selected:', target);
                    
                    // Create surgical edit context with exact location
                    const normalizedPath = target.filePath.replace('/home/user/app/', '');
                    const fileContent = fileContents[normalizedPath]?.content || '';
                    
                    // Build enhanced context with search results
                    enhancedSystemPrompt = `
${formatSearchResultsForAI(searchExecution.results)}

SURGICAL EDIT INSTRUCTIONS:
You have been given the EXACT location of the code to edit.
- File: ${target.filePath}
- Line: ${target.lineNumber}
- Reason: ${target.reason}

Make ONLY the change requested by the user. Do not modify any other code.
User request: "${prompt}"`;
                    
                    // Set up edit context with just this one file
                    editContext = {
                      primaryFiles: [target.filePath],
                      contextFiles: [],
                      systemPrompt: enhancedSystemPrompt,
                      editIntent: {
                        type: searchPlan.editType,
                        description: searchPlan.reasoning,
                        targetFiles: [target.filePath],
                        confidence: 0.95, // High confidence since we found exact location
                        searchTerms: searchPlan.searchTerms
                      }
                    };
                    
                    console.log('[generate-ai-code-stream] Surgical edit context created');
                  }
                } else {
                  // Search failed - fall back to old behavior but inform user
                  console.warn('[generate-ai-code-stream] Search found no results, falling back to broader context');
                  await sendProgress({ 
                    type: 'status', 
                    message: '⚠️ Could not find exact match, using broader search...'
                  });
                }
              } else {
                console.error('[generate-ai-code-stream] Failed to get search plan');
              }
            } catch (error) {
              console.error('[generate-ai-code-stream] Error in agentic search workflow:', error);
              await sendProgress({ 
                type: 'status', 
                message: '⚠️ Search workflow error, falling back to keyword method...'
              });
              // Fall back to old method on any error if we have a manifest
              if (manifest) {
                editContext = selectFilesForEdit(prompt, manifest);
              }
            }
          } else {
            // Fall back to old method if AI analysis fails
            console.warn('[generate-ai-code-stream] AI intent analysis failed, falling back to keyword method');
            if (manifest) {
              editContext = selectFilesForEdit(prompt, manifest);
            } else {
              console.log('[generate-ai-code-stream] No manifest available for fallback');
              await sendProgress({ 
                type: 'status', 
                message: '⚠️ No file manifest available, will use broad context'
              });
            }
          }
          
          // If we got an edit context from any method, use its system prompt
          if (editContext) {
            enhancedSystemPrompt = editContext.systemPrompt;
            
            await sendProgress({ 
              type: 'status', 
              message: `Identified edit type: ${editContext.editIntent?.description || 'Code modification'}`
            });
          } else if (!manifest) {
            console.log('[generate-ai-code-stream] WARNING: No manifest available for edit mode!');
            
            // Try to fetch files from sandbox if we have one
            if (global.activeSandbox) {
              await sendProgress({ type: 'status', message: 'Fetching current files from sandbox...' });
              
              try {
                // Fetch files directly from sandbox
                const filesResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/get-sandbox-files`, {
                  method: 'GET',
                  headers: { 'Content-Type': 'application/json' }
                });
                
                if (filesResponse.ok) {
                  const filesData = await filesResponse.json();
                  
                  if (filesData.success && filesData.manifest) {
                    console.log('[generate-ai-code-stream] Successfully fetched manifest from sandbox');
                    const manifest = filesData.manifest;
                    
                    // Now try to analyze edit intent with the fetched manifest
                    try {
                      const intentResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/analyze-edit-intent`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt, manifest, model })
                      });
                      
                      if (intentResponse.ok) {
                        const { searchPlan } = await intentResponse.json();
                        console.log('[generate-ai-code-stream] Search plan received (after fetch):', searchPlan);
                        
                        // For now, fall back to keyword search since we don't have file contents for search execution
                        // This path happens when no manifest was initially available
                        let targetFiles: string[] = [];
                        if (!searchPlan || searchPlan.searchTerms.length === 0) {
                          console.warn('[generate-ai-code-stream] No target files after fetch, searching for relevant files');
                          
                          const promptLower = prompt.toLowerCase();
                          const allFilePaths = Object.keys(manifest.files);
                          
                          // Look for component names mentioned in the prompt
                          if (promptLower.includes('hero')) {
                            targetFiles = allFilePaths.filter(p => p.toLowerCase().includes('hero'));
                          } else if (promptLower.includes('header')) {
                            targetFiles = allFilePaths.filter(p => p.toLowerCase().includes('header'));
                          } else if (promptLower.includes('footer')) {
                            targetFiles = allFilePaths.filter(p => p.toLowerCase().includes('footer'));
                          } else if (promptLower.includes('nav')) {
                            targetFiles = allFilePaths.filter(p => p.toLowerCase().includes('nav'));
                          } else if (promptLower.includes('button')) {
                            targetFiles = allFilePaths.filter(p => p.toLowerCase().includes('button'));
                          }
                          
                          if (targetFiles.length > 0) {
                            console.log('[generate-ai-code-stream] Found target files by keyword search after fetch:', targetFiles);
                          }
                        }
                        
                        const allFiles = Object.keys(manifest.files)
                          .filter(path => !targetFiles.includes(path));
                        
                        editContext = {
                          primaryFiles: targetFiles,
                          contextFiles: allFiles,
                          systemPrompt: `
You are an expert senior software engineer performing a surgical, context-aware code modification. Your primary directive is **precision and preservation**.

Think of yourself as a surgeon making a precise incision, not a construction worker demolishing a wall.

## Search-Based Edit
Search Terms: ${searchPlan?.searchTerms?.join(', ') || 'keyword-based'}
Edit Type: ${searchPlan?.editType || 'UPDATE_COMPONENT'}
Reasoning: ${searchPlan?.reasoning || 'Modifying based on user request'}

Files to Edit: ${targetFiles.join(', ') || 'To be determined'}
User Request: "${prompt}"

## Your Mandatory Thought Process (Execute Internally):
Before writing ANY code, you MUST follow these steps:

1. **Understand Intent:**
   - What is the user's core goal? (adding feature, fixing bug, changing style?)
   - Does the conversation history provide extra clues?

2. **Locate the Code:**
   - First examine the Primary Files provided
   - Check the "ALL PROJECT FILES" list to find the EXACT file name
   - "nav" might be Navigation.tsx, NavBar.tsx, Nav.tsx, or Header.tsx
   - DO NOT create a new file if a similar one exists!

3. **Plan the Changes (Mental Diff):**
   - What is the *minimal* set of changes required?
   - Which exact lines need to be added, modified, or deleted?
   - Will this require new packages?

4. **Verify Preservation:**
   - What existing code, props, state, and logic must NOT be touched?
   - How can I make my change without disrupting surrounding code?

5. **Construct the Final Code:**
   - Only after completing steps above, generate the final code
   - Provide the ENTIRE file content with modifications integrated

## Critical Rules & Constraints:

**PRESERVATION IS KEY:** You MUST NOT rewrite entire components or files. Integrate your changes into the existing code. Preserve all existing logic, props, state, and comments not directly related to the user's request.

**MINIMALISM:** Only output files you have actually changed. If a file doesn't need modification, don't include it.

**COMPLETENESS:** Each file must be COMPLETE from first line to last:
- NEVER TRUNCATE - Include EVERY line
- NO ellipsis (...) to skip content
- ALL imports, functions, JSX, and closing tags must be present
- The file MUST be runnable

**SURGICAL PRECISION:**
- Change ONLY what's explicitly requested
- If user says "change background to green", change ONLY the background class
- 99% of the original code should remain untouched
- NO refactoring, reformatting, or "improvements" unless requested

**NO CONVERSATION:** Your output must contain ONLY the code. No explanations or apologies.

## EXAMPLES:

### CORRECT APPROACH for "change hero background to blue":
<thinking>
I need to change the background color of the Hero component. Looking at the file, I see the main div has 'bg-gray-900'. I will change ONLY this to 'bg-blue-500' and leave everything else exactly as is.
</thinking>

Then return the EXACT same file with only 'bg-gray-900' changed to 'bg-blue-500'.

### WRONG APPROACH (DO NOT DO THIS):
- Rewriting the Hero component from scratch
- Changing the structure or reorganizing imports
- Adding or removing unrelated code
- Reformatting or "cleaning up" the code

Remember: You are a SURGEON making a precise incision, not an artist repainting the canvas!`,
                          editIntent: {
                            type: searchPlan?.editType || 'UPDATE_COMPONENT',
                            targetFiles: targetFiles,
                            confidence: searchPlan ? 0.85 : 0.6,
                            description: searchPlan?.reasoning || 'Keyword-based file selection',
                            suggestedContext: []
                          }
                        };
                        
                        enhancedSystemPrompt = editContext.systemPrompt;
                        
                        await sendProgress({ 
                          type: 'status', 
                          message: `Identified edit type: ${editContext.editIntent.description}`
                        });
                      }
                    } catch (error) {
                      console.error('[generate-ai-code-stream] Error analyzing intent after fetch:', error);
                    }
                  } else {
                    console.error('[generate-ai-code-stream] Failed to get manifest from sandbox files');
                  }
                } else {
                  console.error('[generate-ai-code-stream] Failed to fetch sandbox files:', filesResponse.status);
                }
              } catch (error) {
                console.error('[generate-ai-code-stream] Error fetching sandbox files:', error);
                await sendProgress({ 
                  type: 'warning', 
                  message: 'Could not analyze existing files for targeted edits. Proceeding with general edit mode.'
                });
              }
            } else {
              console.log('[generate-ai-code-stream] No active sandbox to fetch files from');
              await sendProgress({ 
                type: 'warning', 
                message: 'No existing files found. Consider generating initial code first.'
              });
            }
          }
        }
        
        // Build conversation context for system prompt
        let conversationContext = '';
        if (global.conversationState && global.conversationState.context.messages.length > 1) {
          console.log('[generate-ai-code-stream] Building conversation context');
          console.log('[generate-ai-code-stream] Total messages:', global.conversationState.context.messages.length);
          console.log('[generate-ai-code-stream] Total edits:', global.conversationState.context.edits.length);
          
          conversationContext = `\n\n## Conversation History (Recent)\n`;
          
          // Include only the last 3 edits to save context
          const recentEdits = global.conversationState.context.edits.slice(-3);
          if (recentEdits.length > 0) {
            console.log('[generate-ai-code-stream] Including', recentEdits.length, 'recent edits in context');
            conversationContext += `\n### Recent Edits:\n`;
            recentEdits.forEach(edit => {
              conversationContext += `- "${edit.userRequest}" → ${edit.editType} (${edit.targetFiles.map(f => f.split('/').pop()).join(', ')})\n`;
            });
          }
          
          // Include recently created files - CRITICAL for preventing duplicates
          const recentMsgs = global.conversationState.context.messages.slice(-5);
          const recentlyCreatedFiles: string[] = [];
          recentMsgs.forEach(msg => {
            if (msg.metadata?.editedFiles) {
              recentlyCreatedFiles.push(...msg.metadata.editedFiles);
            }
          });
          
          if (recentlyCreatedFiles.length > 0) {
            const uniqueFiles = [...new Set(recentlyCreatedFiles)];
            conversationContext += `\n### 🚨 RECENTLY CREATED/EDITED FILES (DO NOT RECREATE THESE):\n`;
            uniqueFiles.forEach(file => {
              conversationContext += `- ${file}\n`;
            });
            conversationContext += `\nIf the user mentions any of these components, UPDATE the existing file!\n`;
          }
          
          // Include only last 5 messages for context (reduced from 10)
          const recentMessages = recentMsgs;
          if (recentMessages.length > 2) { // More than just current message
            conversationContext += `\n### Recent Messages:\n`;
            recentMessages.slice(0, -1).forEach(msg => { // Exclude current message
              if (msg.role === 'user') {
                const truncatedContent = msg.content.length > 100 ? msg.content.substring(0, 100) + '...' : msg.content;
                conversationContext += `- "${truncatedContent}"\n`;
              }
            });
          }
          
          // Include only last 2 major changes
          const majorChanges = global.conversationState.context.projectEvolution.majorChanges.slice(-2);
          if (majorChanges.length > 0) {
            conversationContext += `\n### Recent Changes:\n`;
            majorChanges.forEach(change => {
              conversationContext += `- ${change.description}\n`;
            });
          }
          
          // Keep user preferences - they're concise
          const userPrefs = analyzeUserPreferences(global.conversationState.context.messages);
          if (userPrefs.commonPatterns.length > 0) {
            conversationContext += `\n### User Preferences:\n`;
            conversationContext += `- Edit style: ${userPrefs.preferredEditStyle}\n`;
          }
          
          // Limit total conversation context length
          if (conversationContext.length > 2000) {
            conversationContext = conversationContext.substring(0, 2000) + '\n[Context truncated to prevent length errors]';
          }
        }
        
        // ============ ULTRA-COMPRESSED SYSTEM PROMPT ============
        const systemPrompt = `You are a senior React developer. Generate production-quality code for Vite + Tailwind CSS.
${conversationContext}

OUTPUT FORMAT:
<file path="src/index.css">
@tailwind base;
@tailwind components;
@tailwind utilities;
</file>
<file path="src/App.jsx">
// complete code here
</file>
<file path="src/components/Example.jsx">
// complete code here
</file>

When finished: <explanation>summary</explanation>

CRITICAL RULES (violation = broken app):
1. EVERY file you import MUST exist in YOUR output. If you write "import X from './Y'", you MUST generate file Y.
2. NEVER create Context files (AuthContext, ThemeContext, etc.) — put state in App.jsx or the component.
3. NEVER create custom hooks files — put useState/useEffect directly in the component.
4. NEVER create separate service/API/utils files for simple apps — inline the logic.
5. Each component = one self-contained file with its own imports, logic, and JSX.
6. Use ONLY standard Tailwind classes. NEVER use custom classes like bg-primary, text-foreground.
7. NEVER use inline styles (style={{}}). NEVER import component CSS files.
8. src/index.css MUST only contain @tailwind directives and optional @keyframes.
9. NEVER truncate code with "..." or comments like "// rest of code". Write EVERY line.
10. If you're running low on tokens, STOP after the last COMPLETE file. Never output a half-written file.
11. File order: index.css → App.jsx → components (in dependency order).
12. NEVER create config files (tailwind.config, vite.config, package.json) — they already exist.
13. Aim for 5-8 COMPLETE files. Fewer complete files > many broken files.
14. ALWAYS use \`export default ComponentName\` at the end of EVERY component file. ALWAYS import with default syntax: \`import ComponentName from './path'\`. NEVER use named exports \`export { Name }\` or named imports \`import { Name } from\`. This is the #1 cause of broken apps.
15. NEVER import icon libraries (react-icons, lucide-react, heroicons, @heroicons). Use Unicode emoji (\ud83d\udcca \u2699\ufe0f \u270f\ufe0f \ud83d\uddd1\ufe0f \u2795 \ud83d\udcbe \ud83d\udcdd \ud83d\udd0d) or Tailwind-styled spans instead. Icon library imports cause crashes because AI hallucinates non-existent icon names.
${stage === 'frontend' ? `
FRONTEND-ONLY STAGE:
- This is the FRONTEND stage. NEVER generate firebase files, service files, API files, database files, auth files, or any backend code.
- Use HARDCODED/MOCK data arrays directly inside components. Example: const products = [{id:1, name:'Product', price:29.99}]
- NEVER import from './lib/firebase', './services/', './api/', './utils/api' — these do NOT exist yet.
- If the app needs data, hardcode realistic sample data inside the component.
` : ''}${stage === 'backend' ? `
BACKEND STAGE:
- This is the BACKEND stage. Generate ONLY backend integration files (firebase config, services, API utils).
- Also output UPDATED versions of frontend files that need to use real data instead of mock data.
- The frontend already exists and works with mock data. Your job is to add real data persistence.
- Always generate src/lib/firebase.js with config, and src/services/ files with CRUD operations.
` : ''}${isEdit ? `
EDIT MODE — Surgical precision:
- ONLY modify files directly related to the request
- NEVER regenerate the entire app
- Maximum files: style change = 1 file, new feature = 2-3 files max
${editContext ? `
TARGETED FILES: ${editContext.primaryFiles.join(', ')}
Edit Type: ${editContext.editIntent.type}
ONLY output the files listed above.
` : ''}
` : ''}
`;

        // Build full prompt with context
        let fullPrompt = prompt;
        if (context) {
          const contextParts = [];
          
          if (context.sandboxId) {
            contextParts.push(`Current sandbox ID: ${context.sandboxId}`);
          }
          
          if (context.structure) {
            contextParts.push(`Current file structure:\n${context.structure}`);
          }
          
          // Use backend file cache instead of frontend-provided files
          let backendFiles = global.sandboxState?.fileCache?.files || {};
          let hasBackendFiles = Object.keys(backendFiles).length > 0;
          
          console.log('[generate-ai-code-stream] Backend file cache status:');
          console.log('[generate-ai-code-stream] - Has sandboxState:', !!global.sandboxState);
          console.log('[generate-ai-code-stream] - Has fileCache:', !!global.sandboxState?.fileCache);
          console.log('[generate-ai-code-stream] - File count:', Object.keys(backendFiles).length);
          console.log('[generate-ai-code-stream] - Has manifest:', !!global.sandboxState?.fileCache?.manifest);
          
          // If no backend files and we're in edit mode, try to fetch from sandbox
          if (!hasBackendFiles && isEdit && (global.activeSandbox || context?.sandboxId)) {
            console.log('[generate-ai-code-stream] No backend files, attempting to fetch from sandbox...');
            
            try {
              const filesResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/get-sandbox-files`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
              });
              
              if (filesResponse.ok) {
                const filesData = await filesResponse.json();
                if (filesData.success && filesData.files) {
                  console.log('[generate-ai-code-stream] Successfully fetched', Object.keys(filesData.files).length, 'files from sandbox');
                  
                  // Initialize sandboxState if needed
                  if (!global.sandboxState) {
                    global.sandboxState = {
                      fileCache: {
                        files: {},
                        lastSync: Date.now(),
                        sandboxId: context?.sandboxId || 'unknown'
                      }
                    } as any;
                  } else if (!global.sandboxState.fileCache) {
                    global.sandboxState.fileCache = {
                      files: {},
                      lastSync: Date.now(),
                      sandboxId: context?.sandboxId || 'unknown'
                    };
                  }
                  
                  for (const [path, content] of Object.entries(filesData.files)) {
                    const normalizedPath = path.replace('/home/user/app/', '');
                    if (global.sandboxState.fileCache) {
                      global.sandboxState.fileCache.files[normalizedPath] = {
                        content: content as string,
                        lastModified: Date.now()
                      };
                    }
                  }
                  
                  if (filesData.manifest && global.sandboxState.fileCache) {
                    global.sandboxState.fileCache.manifest = filesData.manifest;
                    
                    // Now try to analyze edit intent with the fetched manifest
                    if (!editContext) {
                      console.log('[generate-ai-code-stream] Analyzing edit intent with fetched manifest');
                      try {
                        const intentResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/analyze-edit-intent`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ prompt, manifest: filesData.manifest, model })
                        });
                        
                        if (intentResponse.ok) {
                          const { searchPlan } = await intentResponse.json();
                          console.log('[generate-ai-code-stream] Search plan received:', searchPlan);
                          
                          // Create edit context from AI analysis
                          // Note: We can't execute search here without file contents, so fall back to keyword method
                          const fileContext = selectFilesForEdit(prompt, filesData.manifest);
                          editContext = fileContext;
                          enhancedSystemPrompt = fileContext.systemPrompt;
                          
                          console.log('[generate-ai-code-stream] Edit context created with', editContext.primaryFiles.length, 'primary files');
                        }
                      } catch (error) {
                        console.error('[generate-ai-code-stream] Failed to analyze edit intent:', error);
                      }
                    }
                  }
                  
                  // Update variables
                  backendFiles = global.sandboxState.fileCache?.files || {};
                  hasBackendFiles = Object.keys(backendFiles).length > 0;
                  console.log('[generate-ai-code-stream] Updated backend cache with fetched files');
                }
              }
            } catch (error) {
              console.error('[generate-ai-code-stream] Failed to fetch sandbox files:', error);
            }
          }
          
          // Include current file contents from backend cache
          if (hasBackendFiles) {
            // If we have edit context, use intelligent file selection
            if (editContext && editContext.primaryFiles.length > 0) {
              contextParts.push('\nEXISTING APPLICATION - TARGETED EDIT MODE');
              contextParts.push(`\n${editContext.systemPrompt || enhancedSystemPrompt}\n`);
              
              // Get contents of primary and context files
              const primaryFileContents = await getFileContents(editContext.primaryFiles, global.sandboxState!.fileCache!.manifest!);
              const contextFileContents = await getFileContents(editContext.contextFiles, global.sandboxState!.fileCache!.manifest!);
              
              // Format files for AI
              const formattedFiles = formatFilesForAI(primaryFileContents, contextFileContents);
              contextParts.push(formattedFiles);
              
              contextParts.push('\nIMPORTANT: Only modify the files listed under "Files to Edit". The context files are provided for reference only.');
            } else {
              // Fallback to showing all files if no edit context
              console.log('[generate-ai-code-stream] WARNING: Using fallback mode - no edit context available');
              contextParts.push('\nEXISTING APPLICATION - TARGETED EDIT REQUIRED');
              contextParts.push('\nYou MUST analyze the user request and determine which specific file(s) to edit.');
              contextParts.push('\nCurrent project files (DO NOT regenerate all of these):');
              
              const fileEntries = Object.entries(backendFiles);
              console.log(`[generate-ai-code-stream] Using backend cache: ${fileEntries.length} files`);
              
              // Show file list first for reference
              contextParts.push('\n### File List:');
              for (const [path] of fileEntries) {
                contextParts.push(`- ${path}`);
              }
              
              // Include ALL files as context in fallback mode
              contextParts.push('\n### File Contents (ALL FILES FOR CONTEXT):');
              for (const [path, fileData] of fileEntries) {
                const content = fileData.content;
                if (typeof content === 'string') {
                  contextParts.push(`\n<file path="${path}">\n${content}\n</file>`);
                }
              }
              
              contextParts.push('\n🚨 CRITICAL INSTRUCTIONS - VIOLATION = FAILURE 🚨');
              contextParts.push('1. Analyze the user request: "' + prompt + '"');
              contextParts.push('2. Identify the MINIMUM number of files that need editing (usually just ONE)');
              contextParts.push('3. PRESERVE ALL EXISTING CONTENT in those files');
              contextParts.push('4. ONLY ADD/MODIFY the specific part requested');
              contextParts.push('5. DO NOT regenerate entire components from scratch');
              contextParts.push('6. DO NOT change unrelated parts of any file');
              contextParts.push('7. Generate ONLY the files that MUST be changed - NO EXTRAS');
              contextParts.push('\n⚠️ FILE COUNT RULE:');
              contextParts.push('- Simple change (color, text, spacing) = 1 file ONLY');
              contextParts.push('- Adding new component = 2 files MAX (new component + parent that imports it)');
              contextParts.push('- DO NOT exceed these limits unless absolutely necessary');
              contextParts.push('\nEXAMPLES OF CORRECT BEHAVIOR:');
              contextParts.push('✅ "add a chart to the hero" → Edit ONLY Hero.jsx, ADD the chart, KEEP everything else');
              contextParts.push('✅ "change header to black" → Edit ONLY Header.jsx, change ONLY the color');
              contextParts.push('✅ "fix spacing in footer" → Edit ONLY Footer.jsx, adjust ONLY spacing');
              contextParts.push('\nEXAMPLES OF FAILURES:');
              contextParts.push('❌ "change header color" → You edit Header, Footer, and App "for consistency"');
              contextParts.push('❌ "add chart to hero" → You regenerate the entire Hero component');
              contextParts.push('❌ "fix button" → You update 5 different component files');
              contextParts.push('\n⚠️ FINAL WARNING:');
              contextParts.push('If you generate MORE files than necessary, you have FAILED');
              contextParts.push('If you DELETE or REWRITE existing functionality, you have FAILED');
              contextParts.push('ONLY change what was EXPLICITLY requested - NOTHING MORE');
            }
          } else if (context.currentFiles && Object.keys(context.currentFiles).length > 0) {
            // Fallback to frontend-provided files if backend cache is empty
            console.log('[generate-ai-code-stream] Warning: Backend cache empty, using frontend files');
            contextParts.push('\nEXISTING APPLICATION - DO NOT REGENERATE FROM SCRATCH');
            contextParts.push('Current project files (modify these, do not recreate):');
            
            const fileEntries = Object.entries(context.currentFiles);
            for (const [path, content] of fileEntries) {
              if (typeof content === 'string') {
                contextParts.push(`\n<file path="${path}">\n${content}\n</file>`);
              }
            }
            contextParts.push('\nThe above files already exist. When the user asks to modify something (like "change the header color to black"), find the relevant file above and generate ONLY that file with the requested changes.');
          }
          
          // Add explicit edit mode indicator
          if (isEdit) {
            contextParts.push('\nEDIT MODE ACTIVE');
            contextParts.push('This is an incremental update to an existing application.');
            contextParts.push('DO NOT regenerate App.jsx, index.css, or other core files unless explicitly requested.');
            contextParts.push('ONLY create or modify the specific files needed for the user\'s request.');
            contextParts.push('\n⚠️ CRITICAL FILE OUTPUT FORMAT - VIOLATION = FAILURE:');
            contextParts.push('YOU MUST OUTPUT EVERY FILE IN THIS EXACT XML FORMAT:');
            contextParts.push('<file path="src/components/ComponentName.jsx">');
            contextParts.push('// Complete file content here');
            contextParts.push('</file>');
            contextParts.push('<file path="src/index.css">');
            contextParts.push('/* CSS content here */');
            contextParts.push('</file>');
            contextParts.push('\n❌ NEVER OUTPUT: "Generated Files: index.css, App.jsx"');
            contextParts.push('❌ NEVER LIST FILE NAMES WITHOUT CONTENT');
            contextParts.push('✅ ALWAYS: One <file> tag per file with COMPLETE content');
            contextParts.push('✅ ALWAYS: Include EVERY file you modified');
          } else if (!hasBackendFiles) {
            // First generation mode - make it beautiful!
            contextParts.push('\n🎨 FIRST GENERATION MODE - CREATE SOMETHING BEAUTIFUL!');
            contextParts.push('\nThis is the user\'s FIRST experience. Make it impressive:');
            contextParts.push('1. **USE TAILWIND PROPERLY** - Use standard Tailwind color classes');
            contextParts.push('2. **NO PLACEHOLDERS** - Use real content, not lorem ipsum');
            contextParts.push('3. **COMPLETE COMPONENTS** - Header, Hero, Features, Footer minimum');
            contextParts.push('4. **VISUAL POLISH** - Shadows, hover states, transitions');
            contextParts.push('5. **STANDARD CLASSES** - bg-white, text-gray-900, bg-blue-500, NOT bg-background');
            contextParts.push('\nCreate a polished, professional application that works perfectly on first load.');
            contextParts.push('\n⚠️ OUTPUT FORMAT:');
            contextParts.push('Use <file path="...">content</file> tags for EVERY file');
            contextParts.push('NEVER output "Generated Files:" as plain text');
          }
          
          // Add conversation context (scraped websites, etc)
          if (context.conversationContext) {
            if (context.conversationContext.scrapedWebsites?.length > 0) {
              contextParts.push('\nScraped Websites in Context:');
              context.conversationContext.scrapedWebsites.forEach((site: any) => {
                contextParts.push(`\nURL: ${site.url}`);
                contextParts.push(`Scraped: ${new Date(site.timestamp).toLocaleString()}`);
                if (site.content) {
                  // Include a summary of the scraped content
                  const contentPreview = typeof site.content === 'string' 
                    ? site.content.substring(0, 1000) 
                    : JSON.stringify(site.content).substring(0, 1000);
                  contextParts.push(`Content Preview: ${contentPreview}...`);
                }
              });
            }
            
            if (context.conversationContext.currentProject) {
              contextParts.push(`\nCurrent Project: ${context.conversationContext.currentProject}`);
            }
          }
          
          if (contextParts.length > 0) {
            fullPrompt = `CONTEXT:\n${contextParts.join('\n')}\n\nUSER REQUEST:\n${prompt}`;
          }
        }
        
        // Track packages that need to be installed
        const packagesToInstall: string[] = [];
        
        // Determine which provider to use based on model
        // Universal resolver supports OpenRouter, Claude, OpenAI, Gemini, DeepSeek, Groq, xAI, NVIDIA NIM, Moonshot, ZAI
        const resolvedLanguageModel = resolveModel(model);
        const modelProvider = (_m?: string) => resolvedLanguageModel;
        const actualModel = model;
        const isAnthropic = model.includes('claude');
        const isOpenAI = model.includes('gpt-') || model.includes('o1') || model.includes('o3');


        // ============ PHASE A: BLUEPRINT PLANNING ============
        let blueprint: any = null;
        
        if (!isEdit) {
          await sendProgress({ type: 'status', message: stage === 'backend' ? 'Planning backend architecture...' : 'Designing application architecture...' });
          await sendProgress({
            type: 'thinking',
            text: `Analyzing requirements: "${prompt}"\n\nInferring user intent and design specifications...\nI'll shape this into a polished, modern application with clean components, responsive layout, and fluid interactions.\n`
          });
          console.log(`[generate-ai-code-stream] Phase A: Generating blueprint (stage: ${stage})...`);
          
          try {
            const blueprintResult = await streamText({
              model: modelProvider(actualModel),
              messages: [
                {
                  role: 'system',
                  content: stage === 'backend' 
                    ? `You are a software architect. Given the user's request and their existing frontend files, output a JSON blueprint for backend integration files.

RESPOND WITH ONLY VALID JSON — no markdown, no explanation, no code fences.

JSON structure:
{
  "appName": "App Name",
  "files": [
    {
      "path": "src/lib/firebase.js",
      "purpose": "Firebase configuration and initialization",
      "estimatedLines": 25,
      "exports": ["db", "auth"]
    },
    {
      "path": "src/services/api.js",
      "purpose": "CRUD operations for the data model",
      "estimatedLines": 60,
      "exports": ["getItems", "addItem", "updateItem", "deleteItem"]
    }
  ],
  "packages": ["firebase"],
  "updatedFrontendFiles": ["src/App.jsx"],
  "dataModel": "Description of data collections and fields"
}

BACKEND RULES:
- Maximum 3-5 backend files
- Always include firebase.js config
- Create service files that match the frontend's data needs
- List which frontend files need updating to use real data
- Only plan files that add real data/auth functionality`
                    : `You are a software architect. Given a user request, output a JSON blueprint for the FRONTEND of a React + Vite + Tailwind CSS application.

RESPOND WITH ONLY VALID JSON — no markdown, no explanation, no code fences.

JSON structure:
{
  "appName": "App Name",
  "appType": "${appType}",
  "layout": "single-page" or "multi-page",
  "colorPalette": { "bg": "#0f172a", "surface": "#1e293b", "primary": "#6366f1", "accent": "#f59e0b", "text": "#f8fafc" },
  "files": [
    {
      "path": "src/index.css",
      "purpose": "Tailwind directives and custom keyframes only",
      "estimatedLines": 10
    },
    {
      "path": "src/App.jsx",
      "purpose": "Root component with routing and global state",
      "estimatedLines": 50,
      "state": ["darkMode", "activeSection"],
      "imports": ["Header", "Hero", "Footer"],
      "exports": ["App"]
    },
    {
      "path": "src/components/Header.jsx",
      "purpose": "Navigation bar with logo and links",
      "estimatedLines": 45,
      "props": ["darkMode", "toggleDarkMode"],
      "renders": "nav with logo, navigation links, dark mode toggle button",
      "exports": ["Header"]
    }
  ],
  "packages": [],
  "dataFlow": "App manages state, passes to children as props",
  "theme": "Dark modern with indigo accents and glass effects",
  "keyFeatures": ["responsive nav", "hero with CTA", "feature cards"],
  "needsBackend": true or false
}

FRONTEND BLUEPRINT RULES:
- This is FRONTEND ONLY — NO firebase, NO API files, NO service files, NO database files
- MAXIMUM 6-8 files for simple apps, 8-10 for complex apps
- NEVER plan Context files, custom hook files, service files, or API files
- ALL state lives in App.jsx — passed down as props
- Use MOCK/HARDCODED data for now (backend will be added later if user wants)
- "renders" field: describe the actual HTML elements (nav, section, div grid, form, etc.)
- "props" field: list exact prop names the component receives
- "state" field: list useState variable names
- colorPalette: pick specific, beautiful hex colors
- "needsBackend": set to true if the app would benefit from a database (e-commerce, task manager, etc.)
- Each file MUST be independent and self-contained when given its props
- Order: index.css → App.jsx → components in dependency order`
                },
                {
                  role: 'user',
                  content: stage === 'backend'
                    ? `Create a backend blueprint for: ${enrichedPrompt}\n\nExisting frontend files: ${context?.conversationContext?.appliedCode?.map((f: any) => f.path || f).join(', ') || 'standard React app'}`
                    : `Create a frontend blueprint for: ${enrichedPrompt}`
                }
              ],
              temperature: appConfig.ai.blueprintTemperature,
              maxTokens: appConfig.ai.blueprintMaxTokens
            } as any);
            
            let blueprintText = '';
            for await (const chunk of blueprintResult.textStream) {
              blueprintText += chunk;
            }
            
            // Clean and parse the blueprint JSON
            blueprintText = blueprintText.trim();
            // Remove markdown fences if AI added them despite instructions
            if (blueprintText.startsWith('```')) {
              blueprintText = blueprintText.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
            }
            
            blueprint = JSON.parse(blueprintText);
            console.log('[generate-ai-code-stream] Blueprint generated:', JSON.stringify(blueprint, null, 2));
            
            await sendProgress({ 
              type: 'status', 
              message: `Planned ${blueprint.files.length} ${stage} files for ${blueprint.appName}` 
            });
            await sendProgress({
              type: 'thinking',
              text: `\nArchitectural Plan — ${blueprint.appName || 'Application'}:\n` +
                (blueprint.files?.map((f: any) => `• ${f.path}: ${f.purpose || f.renders || 'Component'}`).join('\n') || '') +
                `\n\nSynthesizing full production code...\n`
            });
            
          } catch (blueprintError) {
            console.warn('[generate-ai-code-stream] Blueprint generation failed, proceeding without:', blueprintError);
            await sendProgress({ type: 'status', message: 'Planning complete, generating code...' });
          }
        } else {
          await sendProgress({ type: 'status', message: 'Analyzing edit request...' });
          await sendProgress({
            type: 'thinking',
            text: `Analyzing modification request: "${prompt}"...\nTargeting required files for safe in-place updates.\n`
          });
        }
        
        // ============ PHASE B: CODE GENERATION (Blueprint-Guided) ============
        console.log('\n[generate-ai-code-stream] Phase B: Starting code generation...\n');
        
        // Build blueprint context for the code generation prompt
        let blueprintContext = '';
        if (blueprint) {
          blueprintContext = `\n\nARCHITECTURE BLUEPRINT — THIS IS YOUR CONTRACT:\n${JSON.stringify(blueprint, null, 2)}\n\nYOU MUST:\n1. Generate files in EXACTLY this order: ${blueprint.files.map((f: any) => f.path).join(' → ')}\n2. Each component receives these props: check the "props" field\n3. Each component renders: check the "renders" field\n4. Color palette: bg=${blueprint.colorPalette?.bg || '#0f172a'}, primary=${blueprint.colorPalette?.primary || '#6366f1'}, text=${blueprint.colorPalette?.text || '#f8fafc'}\n5. Every file MUST be complete. If running low on tokens, STOP after the last complete </file> tag.\n6. NEVER import a file not listed in this blueprint.\n7. State management: ${blueprint.dataFlow || 'App.jsx manages all state, passes to children via props'}\n`;
        }

        // Make streaming API call with appropriate provider
        const streamOptions: any = {
          model: modelProvider(actualModel),
          messages: [
            { 
              role: 'system', 
              content: systemPrompt
            },
            { 
              role: 'user', 
              content: fullPrompt + blueprintContext + `\n\nCRITICAL: Complete EVERY file you start. Never truncate code. If running out of space, finish the current file and stop — remaining files will be generated in a continuation pass.`
            }
          ],
          maxTokens: appConfig.ai.maxTokens,
          stopSequences: []
        };
        
        // Add temperature for non-reasoning models
        if (!model.startsWith('openai/gpt-5')) {
          streamOptions.temperature = appConfig.ai.codeGenerationTemperature;
        }
        
        // Enable extended thinking for Claude models
        if (isAnthropic) {
          // Remove temperature (not supported with thinking)
          delete streamOptions.temperature;
          streamOptions.providerOptions = {
            anthropic: {
              thinking: { type: 'enabled', budgetTokens: 10000 }
            }
          };
          // Increase max tokens to accommodate thinking + code output
          streamOptions.maxTokens = appConfig.ai.maxTokens + 10000;
          console.log('[generate-ai-code-stream] Claude extended thinking enabled (10k budget)');
        }
        
        // Add reasoning effort for GPT-5 models
        if (isOpenAI) {
          streamOptions.experimental_providerMetadata = {
            openai: {
              reasoningEffort: 'high'
            }
          };
        }
        
        let result: any;
        try {
          result = await streamText(streamOptions);
        } catch (streamErr) {
          console.warn('[generate-ai-code-stream] Primary model failed, trying Groq gpt-oss-120b fallback:', streamErr);
          streamOptions.model = resolveModel('openai/gpt-oss-120b');
          delete streamOptions.experimental_providerMetadata;
          delete streamOptions.providerOptions;
          result = await streamText(streamOptions);
        }
        
        // Stream the response and parse in real-time
        let generatedCode = '';
        let currentFile = '';
        let currentFilePath = '';
        let componentCount = 0;
        let isInFile = false;
        let isInTag = false;
        let conversationalBuffer = '';
        
        // Buffer for incomplete tags
        let tagBuffer = '';
        
        // Stream the response and parse for packages in real-time
        for await (const textPart of result.textStream) {
          const text = textPart || '';
          generatedCode += text;
          currentFile += text;
          
          // Combine with buffer for tag detection
          const searchText = tagBuffer + text;
          
          // Log streaming chunks to console
          process.stdout.write(text);
          
          // Check if we're entering or leaving a tag
          const hasOpenTag = /<(file|package|packages|explanation|command|structure|template)\b/.test(text);
          const hasCloseTag = /<\/(file|package|packages|explanation|command|structure|template)>/.test(text);
          
          if (hasOpenTag) {
            // Send any buffered conversational text before the tag
            if (conversationalBuffer.trim() && !isInTag) {
              await sendProgress({ 
                type: 'conversation', 
                text: conversationalBuffer.trim()
              });
              conversationalBuffer = '';
            }
            isInTag = true;
          }
          
          if (hasCloseTag) {
            isInTag = false;
          }
          
          // If we're not in a tag, buffer as conversational text
          if (!isInTag && !hasOpenTag) {
            conversationalBuffer += text;
          }
          
          // Stream the raw text for live preview
          await sendProgress({ 
            type: 'stream', 
            text: text,
            raw: true 
          });
          
          // Check for package tags in buffered text (ONLY for edits, not initial generation)
          let lastIndex = 0;
          if (isEdit) {
            const packageRegex = /<package>([^<]+)<\/package>/g;
            let packageMatch;
            
            while ((packageMatch = packageRegex.exec(searchText)) !== null) {
              const packageName = packageMatch[1].trim();
              if (packageName && !packagesToInstall.includes(packageName)) {
                packagesToInstall.push(packageName);
                console.log(`[generate-ai-code-stream] Package detected: ${packageName}`);
                await sendProgress({ 
                  type: 'package', 
                  name: packageName,
                  message: `Package detected: ${packageName}`
                });
              }
              lastIndex = packageMatch.index + packageMatch[0].length;
            }
          }
          
          // Keep unmatched portion in buffer for next iteration
          tagBuffer = searchText.substring(Math.max(0, lastIndex - 50)); // Keep last 50 chars
          
          // Check for file boundaries
          if (text.includes('<file path="')) {
            const pathMatch = text.match(/<file path="([^"]+)"/);
            if (pathMatch) {
              currentFilePath = pathMatch[1];
              isInFile = true;
              currentFile = text;
            }
          }
          
          // Check for file end
          if (isInFile && currentFile.includes('</file>')) {
            isInFile = false;
            
            // Send component progress update
            if (currentFilePath.includes('components/')) {
              componentCount++;
              const componentName = currentFilePath.split('/').pop()?.replace('.jsx', '') || 'Component';
              await sendProgress({ 
                type: 'component', 
                name: componentName,
                path: currentFilePath,
                index: componentCount
              });
            } else if (currentFilePath.includes('App.jsx')) {
              await sendProgress({ 
                type: 'app', 
                message: 'Generated main App.jsx',
                path: currentFilePath
              });
            }
            
            currentFile = '';
            currentFilePath = '';
          }
        }
        
        console.log('\n\n[generate-ai-code-stream] Streaming complete.');
        
        // Send any remaining conversational text
        if (conversationalBuffer.trim()) {
          await sendProgress({ 
            type: 'conversation', 
            text: conversationalBuffer.trim()
          });
        }
        
        // Also parse <packages> tag for multiple packages - ONLY for edits
        if (isEdit) {
          const packagesRegex = /<packages>([\s\S]*?)<\/packages>/g;
          let packagesMatch;
          while ((packagesMatch = packagesRegex.exec(generatedCode)) !== null) {
            const packagesContent = packagesMatch[1].trim();
            const packagesList = packagesContent.split(/[\n,]+/)
              .map(pkg => pkg.trim())
              .filter(pkg => pkg.length > 0);
            
            for (const packageName of packagesList) {
              if (!packagesToInstall.includes(packageName)) {
                packagesToInstall.push(packageName);
                console.log(`[generate-ai-code-stream] Package from <packages> tag: ${packageName}`);
                await sendProgress({ 
                  type: 'package', 
                  name: packageName,
                  message: `Package detected: ${packageName}`
                });
              }
            }
          }
        }
        
        // Function to extract packages from import statements
        function extractPackagesFromCode(content: string): string[] {
          const packages: string[] = [];
          // Match ES6 imports
          const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g;
          let importMatch;
          
          while ((importMatch = importRegex.exec(content)) !== null) {
            const importPath = importMatch[1];
            // Skip relative imports and built-in React
            if (!importPath.startsWith('.') && !importPath.startsWith('/') && 
                importPath !== 'react' && importPath !== 'react-dom' &&
                !importPath.startsWith('@/')) {
              // Extract package name (handle scoped packages like @heroicons/react)
              const packageName = importPath.startsWith('@') 
                ? importPath.split('/').slice(0, 2).join('/')
                : importPath.split('/')[0];
              
              if (!packages.includes(packageName)) {
                packages.push(packageName);
              }
            }
          }
          
          return packages;
        }
        
        // Parse files and send progress for each
        const fileRegex = /<file path="([^"]+)">([\s\S]*?)<\/file>/g;
        const files = [];
        let match;
        
        while ((match = fileRegex.exec(generatedCode)) !== null) {
          const filePath = match[1];
          const content = match[2].trim();
          files.push({ path: filePath, content });
          
          // Extract packages from file content - ONLY for edits
          if (isEdit) {
            const filePackages = extractPackagesFromCode(content);
            for (const pkg of filePackages) {
              if (!packagesToInstall.includes(pkg)) {
                packagesToInstall.push(pkg);
                console.log(`[generate-ai-code-stream] Package detected from imports: ${pkg}`);
                await sendProgress({ 
                  type: 'package', 
                  name: pkg,
                  message: `Package detected from imports: ${pkg}`
                });
              }
            }
          }
          
          // Send progress for each file (reusing componentCount from streaming)
          if (filePath.includes('components/')) {
            const componentName = filePath.split('/').pop()?.replace('.jsx', '') || 'Component';
            await sendProgress({ 
              type: 'component', 
              name: componentName,
              path: filePath,
              index: componentCount
            });
          } else if (filePath.includes('App.jsx')) {
            await sendProgress({ 
              type: 'app', 
              message: 'Generated main App.jsx',
              path: filePath
            });
          }
        }
        
        // --- BLUEPRINT-AWARE CONTINUATION + IMPORT VALIDATION ---
        let continuationPasses = 0;
        const MAX_CONTINUATIONS = 4; // Up to 4 extra passes (5 total = ~80k tokens for massive apps)

        // Extract already-generated file paths from complete <file>...</file> tags
        const getGeneratedFiles = (code: string) => {
          const matches = code.match(/<file path="[^"]+">[\s\S]*?<\/file>/g) || [];
          return matches.map(m => m.match(/path="([^"]+)"/)?.[1] || '').filter(Boolean);
        };

        // Extract all relative imports from generated code to find missing files
        const getMissingImports = (code: string, existingFiles: string[]) => {
          const missing: string[] = [];
          const importRegex = /import\s+.*?from\s+['"](\.\/.+?)['"]|import\s+['"](\.\/.+?)['"]/g;
          let m;
          while ((m = importRegex.exec(code)) !== null) {
            let importPath = m[1] || m[2];
            if (!importPath) continue;
            // Normalize: ./contexts/AuthContext -> src/contexts/AuthContext.jsx (or .js)
            let normalized = importPath.replace(/^\.\//,  'src/');
            // Add extension if missing
            if (!normalized.match(/\.(jsx?|tsx?|css|json)$/)) {
              normalized += '.jsx';
            }
            // Check if this file exists in generated code
            if (!existingFiles.some(f => {
              const base = f.replace(/\.(jsx?|tsx?|js)$/, '');
              const normBase = normalized.replace(/\.(jsx?|tsx?|js)$/, '');
              return base === normBase || f === normalized;
            })) {
              if (!missing.includes(normalized)) {
                missing.push(normalized);
              }
            }
          }
          return missing;
        };
        
        // Determine if generation is truly complete
        const isGenerationComplete = (code: string): { complete: boolean; missingBlueprint: string[]; missingImports: string[] } => {
          const generatedFiles = getGeneratedFiles(code);
          let missingBlueprint: string[] = [];
          let missingImports: string[] = [];
          
          // Check against blueprint
          if (blueprint && blueprint.files) {
            const blueprintPaths = blueprint.files.map((f: any) => f.path);
            missingBlueprint = blueprintPaths.filter((p: string) => !generatedFiles.includes(p));
          }
          
          // Check for unresolved imports
          missingImports = getMissingImports(code, generatedFiles);
          
          const complete = missingBlueprint.length === 0 && missingImports.length === 0;
          return { complete, missingBlueprint, missingImports };
        };

        let completionStatus = isGenerationComplete(generatedCode);
        
        while (!completionStatus.complete && continuationPasses < MAX_CONTINUATIONS) {
          continuationPasses++;
          const generatedFiles = getGeneratedFiles(generatedCode);
          const allMissing = [...new Set([...completionStatus.missingBlueprint, ...completionStatus.missingImports])];
          
          console.log(`[generate-ai-code-stream] Pass ${continuationPasses + 1}: Generated ${generatedFiles.length} files, missing ${allMissing.length}: [${allMissing.join(', ')}]`);
          
          // Build continuation context with missing file details
          let continuationContext = '';
          
          if (blueprint && blueprint.files) {
            const generatedManifest = blueprint.files
              .filter((f: any) => generatedFiles.includes(f.path))
              .map((f: any) => `- ${f.path}: ${f.purpose}${f.exports ? ` (exports: ${f.exports.join(', ')})` : ''}`)
              .join('\n');
            
            // Combine blueprint remaining + import-detected missing files
            const remainingFromBlueprint = blueprint.files
              .filter((f: any) => allMissing.includes(f.path))
              .map((f: any) => `- ${f.path}: ${f.purpose} (~${f.estimatedLines || 60} lines)${f.imports ? ` (imports: ${f.imports.join(', ')})` : ''}`);
            
            // Add import-detected missing files not in blueprint  
            const extraMissing = allMissing
              .filter(p => !blueprint.files.some((f: any) => f.path === p))
              .map(p => `- ${p}: (imported by existing files, must be created)`);
            
            const allRemainingManifest = [...remainingFromBlueprint, ...extraMissing].join('\n');
            
            continuationContext = `You MUST generate the following missing files for "${blueprint.appName}".
These files are imported by already-generated code and the app WILL NOT WORK without them.

ALREADY COMPLETED (do NOT regenerate):
${generatedManifest}

MISSING FILES — GENERATE ALL OF THESE NOW:
${allRemainingManifest}

Theme: ${blueprint.theme || 'modern dark'}
Data Flow: ${blueprint.dataFlow || 'standard React props'}
Packages available: ${(blueprint.packages || []).join(', ') || 'none'}

Rules:
1. Output EVERY missing file using <file path="...">complete code</file> tags
2. Match the architecture and imports of already-generated files
3. Each file MUST be complete and runnable
4. When done, end with <explanation>summary</explanation>`;
          } else {
            continuationContext = `The following files are imported but do not exist yet. Generate them NOW:

${allMissing.map(f => `- ${f}`).join('\n')}

Already generated: ${generatedFiles.join(', ')}

Output each file using <file path="...">complete code</file> tags.
When done, end with <explanation>summary</explanation>`;
          }
          
          await sendProgress({
            type: 'info',
            message: `Generating ${allMissing.length} missing files (Pass ${continuationPasses + 1})...`
          });
          
          try {
            const continuationResult = await streamText({
              model: modelProvider(actualModel),
              messages: [
                { role: 'system', content: `You are generating missing React component files. These files are REQUIRED — the app crashes without them. Output ONLY <file> tags with complete, working code. Start immediately with the first <file> tag.` },
                { role: 'user', content: continuationContext }
              ],
              temperature: isOpenAI ? undefined : appConfig.ai.codeGenerationTemperature,
              maxTokens: appConfig.ai.maxTokens
            } as any);

            let continuationCode = '';
            for await (const chunk of continuationResult.textStream) {
              continuationCode += chunk;
              await sendProgress({ type: 'stream', text: chunk, raw: true });
            }
            
            generatedCode += '\n' + continuationCode;
            
            // Re-check completion (blueprint + imports)
            completionStatus = isGenerationComplete(generatedCode);
            
          } catch (contError) {
            console.error(`[generate-ai-code-stream] Continuation pass ${continuationPasses + 1} failed:`, contError);
            break;
          }
        }
        
        if (!completionStatus.complete) {
          console.warn(`[generate-ai-code-stream] Generation incomplete after ${continuationPasses + 1} passes. Missing: [${[...completionStatus.missingBlueprint, ...completionStatus.missingImports].join(', ')}]`);
        } else {
          console.log(`[generate-ai-code-stream] Generation complete after ${continuationPasses + 1} pass(es)!`);
        }
        // --- END BLUEPRINT-AWARE CONTINUATION ---
        
        // Extract explanation
        const explanationMatch = generatedCode.match(/<explanation>([\s\S]*?)<\/explanation>/);
        const explanation = explanationMatch ? explanationMatch[1].trim() : 'Code generated successfully!';
        
        // Validate generated code for truncation issues
        const truncationWarnings: string[] = [];
        
        // Skip ellipsis checking entirely - too many false positives with spread operators, loading text, etc.
        
        // Check for unclosed file tags
        const fileOpenCount = (generatedCode.match(/<file path="/g) || []).length;
        const fileCloseCount = (generatedCode.match(/<\/file>/g) || []).length;
        if (fileOpenCount !== fileCloseCount) {
          truncationWarnings.push(`Unclosed file tags detected: ${fileOpenCount} open, ${fileCloseCount} closed`);
        }
        
        // Check for files that seem truncated (very short or ending abruptly)
        const truncationCheckRegex = /<file path="([^"]+)">([\s\S]*?)(?:<\/file>|$)/g;
        let truncationMatch;
        while ((truncationMatch = truncationCheckRegex.exec(generatedCode)) !== null) {
          const filePath = truncationMatch[1];
          const content = truncationMatch[2];
          
          // Only check for really obvious HTML truncation - file ends with opening tag
          if (content.trim().endsWith('<') || content.trim().endsWith('</')) {
            truncationWarnings.push(`File ${filePath} appears to have incomplete HTML tags`);
          }
          
          // Skip "..." check - too many false positives with loading text, etc.
          
          // Only check for SEVERE truncation issues
          if (filePath.match(/\.(jsx?|tsx?)$/)) {
            // Only check for severely unmatched brackets (more than 3 difference)
            const openBraces = (content.match(/{/g) || []).length;
            const closeBraces = (content.match(/}/g) || []).length;
            const braceDiff = Math.abs(openBraces - closeBraces);
            if (braceDiff > 3) { // Only flag severe mismatches
              truncationWarnings.push(`File ${filePath} has severely unmatched braces (${openBraces} open, ${closeBraces} closed)`);
            }
            
            // Check if file is extremely short and looks incomplete
            if (content.length < 20 && content.includes('function') && !content.includes('}')) {
              truncationWarnings.push(`File ${filePath} appears severely truncated`);
            }
          }
        }
        
        // Handle truncation with automatic retry (if enabled in config)
        if (truncationWarnings.length > 0 && appConfig.codeApplication.enableTruncationRecovery) {
          console.warn('[generate-ai-code-stream] Truncation detected, attempting to fix:', truncationWarnings);
          
          await sendProgress({
            type: 'warning',
            message: 'Detected incomplete code generation. Attempting to complete...',
            warnings: truncationWarnings
          });
          
          // Try to fix truncated files automatically
          const truncatedFiles: string[] = [];
          const fileRegex = /<file path="([^"]+)">([\s\S]*?)(?:<\/file>|$)/g;
          let match;
          
          while ((match = fileRegex.exec(generatedCode)) !== null) {
            const filePath = match[1];
            const content = match[2];
            
            // Check if this file appears truncated - be more selective
            const hasEllipsis = content.includes('...') && 
                               !content.includes('...rest') && 
                               !content.includes('...props') &&
                               !content.includes('spread');
                               
            const endsAbruptly = content.trim().endsWith('...') || 
                                 content.trim().endsWith(',') ||
                                 content.trim().endsWith('(');
                                 
            const hasUnclosedTags = content.includes('</') && 
                                    !content.match(/<\/[a-zA-Z0-9]+>/) &&
                                    content.includes('<');
                                    
            const tooShort = content.length < 50 && filePath.match(/\.(jsx?|tsx?)$/);
            
            // Check for unmatched braces specifically
            const openBraceCount = (content.match(/{/g) || []).length;
            const closeBraceCount = (content.match(/}/g) || []).length;
            const hasUnmatchedBraces = Math.abs(openBraceCount - closeBraceCount) > 1;
            
            // If the match doesn't include the closing tag, it was cut off by the end of the string
            const missingFileClosingTag = !match[0].includes('</file>');
            
            const isTruncated = missingFileClosingTag || 
                               (hasEllipsis && endsAbruptly) || 
                               hasUnclosedTags || 
                               (tooShort && !content.includes('export')) ||
                               hasUnmatchedBraces;
            
            if (isTruncated) {
              truncatedFiles.push(filePath);
            }
          }
          
          // If we have truncated files, try to regenerate them
          if (truncatedFiles.length > 0) {
            console.log('[generate-ai-code-stream] Attempting to regenerate truncated files:', truncatedFiles);
            
            for (const filePath of truncatedFiles) {
              await sendProgress({
                type: 'info',
                message: `Completing ${filePath}...`
              });
              
              try {
                // Create a focused prompt to complete just this file
                const completionPrompt = `Complete the following file that was truncated. Provide the FULL file content.
                
File: ${filePath}
Original request: ${prompt}
                
Provide the complete file content without any truncation. Include all necessary imports, complete all functions, and close all tags properly.`;
                
                // Make a focused API call to complete this specific file
                const completionResult = await streamText({
                  model: modelProvider(actualModel),
                  messages: [
                    { 
                      role: 'system', 
                      content: 'You are completing a truncated file. Provide the complete, working file content.'
                    },
                    { role: 'user', content: completionPrompt }
                  ],
                  temperature: isOpenAI ? undefined : appConfig.ai.defaultTemperature,
                  maxTokens: appConfig.ai.truncationRecoveryMaxTokens
                } as any);
                
                // Get the full text from the stream
                let completedContent = '';
                for await (const chunk of completionResult.textStream) {
                  completedContent += chunk;
                }
                
                // Replace the truncated file in the generatedCode
                const filePattern = new RegExp(
                  `<file path="${filePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">[\\s\\S]*?(?:</file>|$)`,
                  'g'
                );
                
                // Extract just the code content (remove any markdown or explanation)
                let cleanContent = completedContent;
                if (cleanContent.includes('```')) {
                  const codeMatch = cleanContent.match(/```[\w]*\n([\s\S]*?)```/);
                  if (codeMatch) {
                    cleanContent = codeMatch[1];
                  }
                }
                
                generatedCode = generatedCode.replace(
                  filePattern,
                  `<file path="${filePath}">\n${cleanContent}\n</file>`
                );
                
                console.log(`[generate-ai-code-stream] Successfully completed ${filePath}`);
                
              } catch (completionError) {
                console.error(`[generate-ai-code-stream] Failed to complete ${filePath}:`, completionError);
                await sendProgress({
                  type: 'warning',
                  message: `Could not auto-complete ${filePath}. Manual review may be needed.`
                });
              }
            }
            
            // Clear the warnings after attempting fixes
            truncationWarnings.length = 0;
            await sendProgress({
              type: 'info',
              message: 'Truncation recovery complete'
            });
          }
        }
        
        // ============ DEAD ROUTE CLEANUP ============
        // If App.jsx imports components that were never generated, fix it
        if (!isEdit && stage === 'frontend') {
          const generatedFilePaths = getGeneratedFiles(generatedCode);
          const appFileMatch = generatedCode.match(/<file path="src\/App\.jsx">([\s\S]*?)<\/file>/);
          if (appFileMatch) {
            const appContent = appFileMatch[1];
            const importRegex = /import\s+(?:\w+|\{[^}]+\})\s+from\s+['"](\.\/.+?)['"]/g;
            let deadImports: string[] = [];
            let importMatch;
            while ((importMatch = importRegex.exec(appContent)) !== null) {
              const importPath = importMatch[1];
              let normalized = importPath.replace(/^\.\//,  'src/');
              if (!normalized.match(/\.(jsx?|tsx?|css|json)$/)) normalized += '.jsx';
              if (!generatedFilePaths.some(f => f.replace(/\.(jsx?|tsx?)$/, '') === normalized.replace(/\.(jsx?|tsx?)$/, ''))) {
                deadImports.push(importMatch[0]);
              }
            }
            
            if (deadImports.length > 0) {
              console.log(`[generate-ai-code-stream] Found ${deadImports.length} dead imports in App.jsx:`, deadImports);
              await sendProgress({ type: 'info', message: `Cleaning ${deadImports.length} unresolved imports from App.jsx...` });
              
              // Auto-regenerate App.jsx with only valid imports
              try {
                const cleanupResult = await streamText({
                  model: modelProvider(actualModel),
                  messages: [
                    { role: 'system', content: 'You are fixing a React App.jsx that imports components which do not exist. Remove the dead imports AND their usage in JSX. Output ONLY the fixed file content — no XML tags, no explanation.' },
                    { role: 'user', content: `Fix this App.jsx. Remove these dead imports and their JSX usage:\n${deadImports.join('\n')}\n\nCurrent App.jsx:\n${appContent.substring(0, 4000)}\n\nAvailable components: ${generatedFilePaths.filter(f => f !== 'src/App.jsx' && f !== 'src/index.css').join(', ')}\n\nOutput ONLY the fixed code.` }
                  ],
                  maxTokens: 4096,
                  temperature: 0.2
                } as any);
                
                let fixedApp = '';
                for await (const chunk of cleanupResult.textStream) { fixedApp += chunk; }
                fixedApp = fixedApp.trim();
                if (fixedApp.startsWith('```')) fixedApp = fixedApp.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
                
                // Replace the App.jsx in generated code
                generatedCode = generatedCode.replace(/<file path="src\/App\.jsx">[\s\S]*?<\/file>/, `<file path="src/App.jsx">\n${fixedApp}\n</file>`);
                console.log('[generate-ai-code-stream] ✅ Dead routes cleaned from App.jsx');
              } catch (cleanupErr) {
                console.warn('[generate-ai-code-stream] Dead route cleanup failed:', cleanupErr);
              }
            }
          }
        }
        // ============ END DEAD ROUTE CLEANUP ============
        
        // ============ IMPORT/EXPORT VALIDATION ============
        // Fix named vs default export mismatches before code goes to sandbox
        {
          const allFiles = generatedCode.match(/<file path="([^"]+)">([\s\S]*?)<\/file>/g) || [];
          
          // Build a map: filePath -> exportStyle ('default' | 'named')
          const exportMap: Record<string, { style: 'default' | 'named'; name: string }> = {};
          for (const fileBlock of allFiles) {
            const pathMatch = fileBlock.match(/path="([^"]+)"/);
            const contentMatch = fileBlock.match(/<file[^>]*>([\s\S]*?)<\/file>/);
            if (!pathMatch || !contentMatch) continue;
            const filePath = pathMatch[1];
            const content = contentMatch[1];
            
            // Check export style
            const defaultExportMatch = content.match(/export\s+default\s+(?:function\s+)?(\w+)/);
            const namedExportMatch = content.match(/export\s+(?:const|function|class)\s+(\w+)/);
            
            if (defaultExportMatch) {
              exportMap[filePath] = { style: 'default', name: defaultExportMatch[1] };
            } else if (namedExportMatch) {
              exportMap[filePath] = { style: 'named', name: namedExportMatch[1] };
            }
          }
          
          // Now check all imports and fix mismatches
          let fixCount = 0;
          for (const fileBlock of allFiles) {
            const pathMatch = fileBlock.match(/path="([^"]+)"/);
            const contentMatch = fileBlock.match(/<file[^>]*>([\s\S]*?)<\/file>/);
            if (!pathMatch || !contentMatch) continue;
            const filePath = pathMatch[1];
            let content = contentMatch[1];
            let modified = false;
            
            // Find all relative imports in this file
            const importRegex = /import\s+(\{\s*(\w+)\s*\})\s+from\s+['"](\.\/.+?)['"]/g;
            let m;
            while ((m = importRegex.exec(content)) !== null) {
              const namedImport = m[1]; // { Name }
              const componentName = m[2]; // Name
              const importPath = m[3]; // ./path
              
              // Resolve to file path
              let resolved = importPath.replace(/^\.\//,  'src/');
              if (!resolved.match(/\.(jsx?|tsx?|css)$/)) resolved += '.jsx';
              
              const exportInfo = exportMap[resolved];
              if (exportInfo && exportInfo.style === 'default') {
                // Mismatch! Using { Name } but file has export default
                content = content.replace(m[0], `import ${componentName} from '${importPath}'`);
                modified = true;
                fixCount++;
                console.log(`[generate-ai-code-stream] Fixed import: { ${componentName} } → ${componentName} in ${filePath}`);
              }
            }
            
            // Also fix: import Name but file uses named export
            const defaultImportRegex = /import\s+(\w+)\s+from\s+['"](\.\/.+?)['"]/g;
            while ((m = defaultImportRegex.exec(content)) !== null) {
              const componentName = m[1];
              const importPath = m[2];
              if (componentName === 'React') continue; // Skip React
              
              let resolved = importPath.replace(/^\.\//,  'src/');
              if (!resolved.match(/\.(jsx?|tsx?|css)$/)) resolved += '.jsx';
              
              const exportInfo = exportMap[resolved];
              if (exportInfo && exportInfo.style === 'named') {
                content = content.replace(m[0], `import { ${componentName} } from '${importPath}'`);
                modified = true;
                fixCount++;
                console.log(`[generate-ai-code-stream] Fixed import: ${componentName} → { ${componentName} } in ${filePath}`);
              }
            }
            
            if (modified) {
              generatedCode = generatedCode.replace(fileBlock, `<file path="${filePath}">${content}</file>`);
            }
          }
          
          if (fixCount > 0) {
            console.log(`[generate-ai-code-stream] ✅ Fixed ${fixCount} import/export mismatches`);
            await sendProgress({ type: 'info', message: `✅ Fixed ${fixCount} import/export mismatches` });
          }
        }
        // ============ END IMPORT/EXPORT VALIDATION ============
        
        // Send completion with packages info and stage
        await sendProgress({ 
          type: 'complete', 
          generatedCode,
          explanation,
          files: files.length,
          components: componentCount,
          model,
          stage,
          hasBackend: blueprint?.needsBackend || false,
          packagesToInstall: packagesToInstall.length > 0 ? packagesToInstall : undefined,
          warnings: truncationWarnings.length > 0 ? truncationWarnings : undefined
        });
        
        // Track edit in conversation history
        if (isEdit && editContext && global.conversationState) {
          const editRecord: ConversationEdit = {
            timestamp: Date.now(),
            userRequest: prompt,
            editType: editContext.editIntent.type,
            targetFiles: editContext.primaryFiles,
            confidence: editContext.editIntent.confidence,
            outcome: 'success' // Assuming success if we got here
          };
          
          global.conversationState.context.edits.push(editRecord);
          
          // Track major changes
          if (editContext.editIntent.type === 'ADD_FEATURE' || files.length > 3) {
            global.conversationState.context.projectEvolution.majorChanges.push({
              timestamp: Date.now(),
              description: editContext.editIntent.description,
              filesAffected: editContext.primaryFiles
            });
          }
          
          // Update last updated timestamp
          global.conversationState.lastUpdated = Date.now();
          
          console.log('[generate-ai-code-stream] Updated conversation history with edit:', editRecord);
        }
        
      } catch (error) {
        console.error('[generate-ai-code-stream] Stream processing error:', error);
        
        // Check if it's a tool validation error
        if ((error as any).message?.includes('tool call validation failed')) {
          console.error('[generate-ai-code-stream] Tool call validation error - this may be due to the AI model sending incorrect parameters');
          await sendProgress({ 
            type: 'warning', 
            message: 'Package installation tool encountered an issue. Packages will be detected from imports instead.'
          });
          // Continue processing - packages can still be detected from the code
        } else {
          await sendProgress({ 
            type: 'error', 
            error: (error as Error).message 
          });
        }
      } finally {
        try {
          await writer.close();
        } catch {
          // Stream already closed or aborted by client
        }
      }
    })();
    
    // Return the stream
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error) {
    console.error('[generate-ai-code-stream] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}