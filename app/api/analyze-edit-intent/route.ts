import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { resolveModel } from '@/lib/model-resolver';

// Schema for the AI's search plan - not file selection!
const searchPlanSchema = z.object({
  editType: z.enum([
    'UPDATE_COMPONENT',
    'ADD_FEATURE', 
    'FIX_ISSUE',
    'UPDATE_STYLE',
    'REFACTOR',
    'ADD_DEPENDENCY',
    'REMOVE_ELEMENT'
  ]).describe('The type of edit being requested'),
  
  reasoning: z.string().describe('Explanation of the search strategy'),
  
  searchTerms: z.array(z.string()).describe('Specific text to search for (case-insensitive). Be VERY specific - exact button text, class names, etc.'),
  
  regexPatterns: z.array(z.string()).optional().describe('Regex patterns for finding code structures (e.g., "className=[\\"\\\'].*header.*[\\"\\\']")'),
  
  fileTypesToSearch: z.array(z.string()).default(['.jsx', '.tsx', '.js', '.ts']).describe('File extensions to search'),
  
  expectedMatches: z.number().min(1).max(10).default(1).describe('Expected number of matches (helps validate search worked)'),
  
  fallbackSearch: z.object({
    terms: z.array(z.string()),
    patterns: z.array(z.string()).optional()
  }).optional().describe('Backup search if primary fails')
});

export async function POST(request: NextRequest) {
  try {
    const { prompt, manifest, model = 'z-ai/glm-5.2' } = await request.json();
    
    console.log('[analyze-edit-intent] Request received');
    console.log('[analyze-edit-intent] Prompt:', prompt);
    console.log('[analyze-edit-intent] Model:', model);
    console.log('[analyze-edit-intent] Manifest files count:', manifest?.files ? Object.keys(manifest.files).length : 0);
    
    if (!prompt || !manifest) {
      return NextResponse.json({
        error: 'prompt and manifest are required'
      }, { status: 400 });
    }
    
    // Create a summary of available files for the AI
    const validFiles = Object.entries(manifest.files as Record<string, any>)
      .filter(([path]) => {
        // Filter out invalid paths
        return path.includes('.') && !path.match(/\/\d+$/);
      });
    
    const fileSummary = validFiles
      .map(([path, info]: [string, any]) => {
        const componentName = info.componentInfo?.name || path.split('/').pop();
        const childComponents = info.componentInfo?.childComponents?.join(', ') || 'none';
        return `- ${path} (${componentName}, renders: ${childComponents})`;
      })
      .join('\n');
    
    console.log('[analyze-edit-intent] Valid files found:', validFiles.length);
    
    if (validFiles.length === 0) {
      console.error('[analyze-edit-intent] No valid files found in manifest');
      return NextResponse.json({
        success: false,
        error: 'No valid files found in manifest'
      }, { status: 400 });
    }
    
    console.log('[analyze-edit-intent] Analyzing prompt:', prompt);
    console.log('[analyze-edit-intent] File summary preview:', fileSummary.split('\n').slice(0, 5).join('\n'));
    
    // Resolve model using universal provider resolver
    const aiModel = resolveModel(model);
    
    console.log('[analyze-edit-intent] Using AI model:', model);
    
    // Use AI to create a search plan
    const result = await generateObject({
      model: aiModel,
      schema: searchPlanSchema,
      prompt: `Analyze this user request for a project edit and create a SEARCH PLAN to find the target files.

USER REQUEST: "${prompt}"

AVAILABLE PROJECT FILES:
${fileSummary}

SEARCH PLAN GUIDELINES:
1. Identify WHAT element/component the user wants to change
2. Formulate SPECIFIC search terms to find that element in code:
   - Exact text mentioned (e.g., "Get Started", "Hero Title")
   - Likely class names (e.g., "hero", "header", "nav", "footer")
   - Component names (e.g., "Header", "ProductCard")
3. Keep search terms simple and exact - we use string matching!

Return a JSON search plan object according to the schema.`
    });
    
    console.log('[analyze-edit-intent] Search plan generated successfully');
    console.log('[analyze-edit-intent] Search plan editType:', result.object.editType);
    console.log('[analyze-edit-intent] Search terms:', result.object.searchTerms);
    
    return NextResponse.json({
      success: true,
      plan: result.object
    });
    
  } catch (error) {
    console.error('[analyze-edit-intent] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during edit intent analysis'
    }, { status: 500 });
  }
}