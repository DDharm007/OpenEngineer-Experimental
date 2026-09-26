import { NextRequest, NextResponse } from 'next/server';
import { Sandbox } from '@e2b/code-interpreter';
import type { SandboxState } from '@/types/sandbox';
import type { ConversationState } from '@/types/conversation';

declare global {
  var conversationState: ConversationState | null;
  var activeSandbox: any;
  var existingFiles: Set<string>;
  var sandboxState: SandboxState;
}

interface ParsedResponse {
  explanation: string;
  template: string;
  files: Array<{ path: string; content: string }>;
  packages: string[];
  commands: string[];
  structure: string | null;
}

// Sanitize file content to remove leaked XML tags from AI output
function sanitizeFileContent(content: string, filePath: string): string {
  let sanitized = content;
  
  // Remove leaked <file path="..."> tags that got mixed into content
  sanitized = sanitized.replace(/<file\s+path="[^"]*"\s*>/g, '');
  // Remove leaked </file> tags
  sanitized = sanitized.replace(/<\/file>/g, '');
  // Remove leaked <explanation>...</explanation> blocks
  sanitized = sanitized.replace(/<explanation>[\s\S]*?<\/explanation>/g, '');
  // Remove leaked <packages>...</packages> blocks
  sanitized = sanitized.replace(/<packages>[\s\S]*?<\/packages>/g, '');
  // Remove leaked <package>...</package> blocks  
  sanitized = sanitized.replace(/<package>[^<]*<\/package>/g, '');
  
  // For JSX/JS files, do additional validation
  if (filePath.match(/\.(jsx?|tsx?)$/)) {
    // Remove any lines that are JUST a <file> tag (common leak pattern)
    sanitized = sanitized.replace(/^\s*<file\s+path=.*$/gm, '');
    // Remove markdown code fences that leaked in
    sanitized = sanitized.replace(/^```[\w]*\s*$/gm, '');
    
    // ========== ICON LIBRARY REMOVAL ==========
    // Step 1: Extract icon names from imports BEFORE removing them
    const iconNames: string[] = [];
    const iconImportRegex = /import\s+\{([^}]+)\}\s+from\s+['"](?:react-icons\/[^'"]+|lucide-react|@heroicons\/[^'"]+)['"];?\s*\n?/g;
    let iconMatch;
    while ((iconMatch = iconImportRegex.exec(sanitized)) !== null) {
      const names = iconMatch[1].split(',').map(n => n.trim().split(/\s+as\s+/).pop()?.trim()).filter(Boolean);
      iconNames.push(...(names as string[]));
    }
    
    // Step 2: Remove the import lines
    sanitized = sanitized.replace(/import\s+\{[^}]*\}\s+from\s+['"]react-icons\/[^'"]+['"];?\s*\n?/g, '');
    sanitized = sanitized.replace(/import\s+\{[^}]*\}\s+from\s+['"]lucide-react['"];?\s*\n?/g, '');
    sanitized = sanitized.replace(/import\s+\{[^}]*\}\s+from\s+['"]@heroicons\/[^'"]+['"];?\s*\n?/g, '');
    
    // Step 3: Replace ALL references to extracted icon names
    for (const iconName of iconNames) {
      if (!iconName || iconName.length < 2) continue;
      // Replace JSX self-closing: <IconName ... />
      sanitized = sanitized.replace(new RegExp(`<${iconName}[^>]*/>`, 'g'), '<span className="inline-block">●</span>');
      // Replace JSX open+close: <IconName ...>...</IconName>
      sanitized = sanitized.replace(new RegExp(`<${iconName}[^>]*>[\\s\\S]*?</${iconName}>`, 'g'), '<span>●</span>');
      // Replace JSX expression usage: {IconName} 
      sanitized = sanitized.replace(new RegExp(`\\{${iconName}\\}`, 'g'), '{() => "●"}');
      // Replace as prop value: icon={IconName}
      sanitized = sanitized.replace(new RegExp(`=\\{${iconName}\\}`, 'g'), '={"●"}');
    }
    
    // Step 4: Catch any remaining icon-prefixed JSX that wasn't in imports
    // Matches <FiSomething />, <FaSomething />, etc with ANY props
    sanitized = sanitized.replace(/<(?:Fi|Hi|Ai|Bs|Md|Io|Fa|Ri|Ti|Gi|Bi|Si|Cg|Vsc|Tb|Lu)[A-Z]\w*[^>]*\/>/g, '<span className="inline-block">●</span>');
    sanitized = sanitized.replace(/<(?:Fi|Hi|Ai|Bs|Md|Io|Fa|Ri|Ti|Gi|Bi|Si|Cg|Vsc|Tb|Lu)[A-Z]\w*[^>]*>[\s\S]*?<\/(?:Fi|Hi|Ai|Bs|Md|Io|Fa|Ri|Ti|Gi|Bi|Si|Cg|Vsc|Tb|Lu)\w+>/g, '<span>●</span>');
    // ========== END ICON LIBRARY REMOVAL ==========
  }
  
  return sanitized.trim();
}

function parseAIResponse(response: string): ParsedResponse {
  const sections = {
    files: [] as Array<{ path: string; content: string }>,
    commands: [] as string[],
    packages: [] as string[],
    structure: null as string | null,
    explanation: '',
    template: ''
  };

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

          // Log important packages for debugging
          if (packageName === 'react-router-dom' || packageName.includes('router') || packageName.includes('icon')) {
            console.log(`[apply-ai-code-stream] Detected package from imports: ${packageName}`);
          }
        }
      }
    }

    return packages;
  }

  // Parse file sections - handle duplicates and prefer complete versions
  const fileMap = new Map<string, { content: string; isComplete: boolean }>();

  // First pass: Find all file declarations
  const fileRegex = /<file path="([^"]+)">([\s\S]*?)(?:<\/file>|$)/g;
  let match;
  while ((match = fileRegex.exec(response)) !== null) {
    const filePath = match[1];
    let content = match[2].trim();
    // Strip markdown code block markers that Gemini may include inside <file> tags
    // e.g. ```css ... ``` or ```jsx ... ```
    content = content.replace(/^```[\w]*\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
    const hasClosingTag = response.substring(match.index, match.index + match[0].length).includes('</file>');

    // Check if this file already exists in our map
    const existing = fileMap.get(filePath);

    // Decide whether to keep this version
    let shouldReplace = false;
    if (!existing) {
      shouldReplace = true; // First occurrence
    } else if (!existing.isComplete && hasClosingTag) {
      shouldReplace = true; // Replace incomplete with complete
      console.log(`[apply-ai-code-stream] Replacing incomplete ${filePath} with complete version`);
    } else if (existing.isComplete && hasClosingTag && content.length > existing.content.length) {
      shouldReplace = true; // Replace with longer complete version
      console.log(`[apply-ai-code-stream] Replacing ${filePath} with longer complete version`);
    } else if (!existing.isComplete && !hasClosingTag && content.length > existing.content.length) {
      shouldReplace = true; // Both incomplete, keep longer one
    }

    if (shouldReplace) {
      // Additional validation: reject obviously broken content
      if (content.includes('...') && !content.includes('...props') && !content.includes('...rest')) {
        console.warn(`[apply-ai-code-stream] Warning: ${filePath} contains ellipsis, may be truncated`);
        // Still use it if it's the only version we have
        if (!existing) {
          fileMap.set(filePath, { content, isComplete: hasClosingTag });
        }
      } else {
        fileMap.set(filePath, { content, isComplete: hasClosingTag });
      }
    }
  }

  // Convert map to array for sections.files
  for (const [path, { content, isComplete }] of fileMap.entries()) {
    if (!isComplete) {
      console.log(`[apply-ai-code-stream] Warning: File ${path} appears to be truncated (no closing tag)`);
    }

    sections.files.push({
      path,
      content
    });

    // Extract packages from file content
    const filePackages = extractPackagesFromCode(content);
    for (const pkg of filePackages) {
      if (!sections.packages.includes(pkg)) {
        sections.packages.push(pkg);
        console.log(`[apply-ai-code-stream] 📦 Package detected from imports: ${pkg}`);
      }
    }
  }

  // Also parse markdown code blocks with file paths
  const markdownFileRegex = /```(?:file )?path="([^"]+)"\n([\s\S]*?)```/g;
  while ((match = markdownFileRegex.exec(response)) !== null) {
    const filePath = match[1];
    const content = match[2].trim();
    sections.files.push({
      path: filePath,
      content: content
    });

    // Extract packages from file content
    const filePackages = extractPackagesFromCode(content);
    for (const pkg of filePackages) {
      if (!sections.packages.includes(pkg)) {
        sections.packages.push(pkg);
        console.log(`[apply-ai-code-stream] 📦 Package detected from imports: ${pkg}`);
      }
    }
  }

  // Parse plain text format like "Generated Files: Header.jsx, index.css"
  const generatedFilesMatch = response.match(/Generated Files?:\s*([^\n]+)/i);
  if (generatedFilesMatch) {
    // Split by comma first, then trim whitespace, to preserve filenames with dots
    const filesList = generatedFilesMatch[1]
      .split(',')
      .map(f => f.trim())
      .filter(f => f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.css') || f.endsWith('.json') || f.endsWith('.html'));
    console.log(`[apply-ai-code-stream] Detected generated files from plain text: ${filesList.join(', ')}`);

    // Try to extract the actual file content if it follows
    for (const fileName of filesList) {
      // Look for the file content after the file name
      const fileContentRegex = new RegExp(`${fileName}[\\s\\S]*?(?:import[\\s\\S]+?)(?=Generated Files:|Applying code|$)`, 'i');
      const fileContentMatch = response.match(fileContentRegex);
      if (fileContentMatch) {
        // Extract just the code part (starting from import statements)
        const codeMatch = fileContentMatch[0].match(/^(import[\s\S]+)$/m);
        if (codeMatch) {
          const filePath = fileName.includes('/') ? fileName : `src/components/${fileName}`;
          sections.files.push({
            path: filePath,
            content: codeMatch[1].trim()
          });
          console.log(`[apply-ai-code-stream] Extracted content for ${filePath}`);

          // Extract packages from this file
          const filePackages = extractPackagesFromCode(codeMatch[1]);
          for (const pkg of filePackages) {
            if (!sections.packages.includes(pkg)) {
              sections.packages.push(pkg);
              console.log(`[apply-ai-code-stream] Package detected from imports: ${pkg}`);
            }
          }
        }
      }
    }
  }

  // Also try to parse if the response contains raw JSX/JS code blocks
  const codeBlockRegex = /```(?:jsx?|tsx?|javascript|typescript)?\n([\s\S]*?)```/g;
  while ((match = codeBlockRegex.exec(response)) !== null) {
    const content = match[1].trim();
    // Try to detect the file name from comments or context
    const fileNameMatch = content.match(/\/\/\s*(?:File:|Component:)\s*([^\n]+)/);
    if (fileNameMatch) {
      const fileName = fileNameMatch[1].trim();
      const filePath = fileName.includes('/') ? fileName : `src/components/${fileName}`;

      // Don't add duplicate files
      if (!sections.files.some(f => f.path === filePath)) {
        sections.files.push({
          path: filePath,
          content: content
        });

        // Extract packages
        const filePackages = extractPackagesFromCode(content);
        for (const pkg of filePackages) {
          if (!sections.packages.includes(pkg)) {
            sections.packages.push(pkg);
          }
        }
      }
    }
  }

  // Parse commands
  const cmdRegex = /<command>(.*?)<\/command>/g;
  while ((match = cmdRegex.exec(response)) !== null) {
    sections.commands.push(match[1].trim());
  }

  // Parse packages - support both <package> and <packages> tags
  const pkgRegex = /<package>(.*?)<\/package>/g;
  while ((match = pkgRegex.exec(response)) !== null) {
    sections.packages.push(match[1].trim());
  }

  // Also parse <packages> tag with multiple packages
  const packagesRegex = /<packages>([\s\S]*?)<\/packages>/;
  const packagesMatch = response.match(packagesRegex);
  if (packagesMatch) {
    const packagesContent = packagesMatch[1].trim();
    // Split by newlines or commas
    const packagesList = packagesContent.split(/[\n,]+/)
      .map(pkg => pkg.trim())
      .filter(pkg => pkg.length > 0);
    sections.packages.push(...packagesList);
  }

  // Parse structure
  const structureMatch = /<structure>([\s\S]*?)<\/structure>/;
  const structResult = response.match(structureMatch);
  if (structResult) {
    sections.structure = structResult[1].trim();
  }

  // Parse explanation
  const explanationMatch = /<explanation>([\s\S]*?)<\/explanation>/;
  const explResult = response.match(explanationMatch);
  if (explResult) {
    sections.explanation = explResult[1].trim();
  }

  // Parse template
  const templateMatch = /<template>(.*?)<\/template>/;
  const templResult = response.match(templateMatch);
  if (templResult) {
    sections.template = templResult[1].trim();
  }

  return sections;
}

export async function POST(request: NextRequest) {
  try {
    const { response, isEdit = false, packages = [], sandboxId } = await request.json();

    if (!response) {
      return NextResponse.json({
        error: 'response is required'
      }, { status: 400 });
    }

    // Debug log the response
    console.log('[apply-ai-code-stream] Received response to parse:');
    console.log('[apply-ai-code-stream] Response length:', response.length);
    console.log('[apply-ai-code-stream] Response preview:', response.substring(0, 500));
    console.log('[apply-ai-code-stream] isEdit:', isEdit);
    console.log('[apply-ai-code-stream] packages:', packages);

    // Parse the AI response
    const parsed = parseAIResponse(response);

    // Log what was parsed
    console.log('[apply-ai-code-stream] Parsed result:');
    console.log('[apply-ai-code-stream] Files found:', parsed.files.length);
    if (parsed.files.length > 0) {
      parsed.files.forEach(f => {
        console.log(`[apply-ai-code-stream] - ${f.path} (${f.content.length} chars)`);
      });
    }
    console.log('[apply-ai-code-stream] Packages found:', parsed.packages);

    // Initialize existingFiles if not already
    if (!global.existingFiles) {
      global.existingFiles = new Set<string>();
    }

    // First, always check the global state for active sandbox
    let sandbox = global.activeSandbox;

    // If we don't have a sandbox in this instance but we have a sandboxId,
    // reconnect to the existing sandbox
    if (!sandbox && sandboxId) {
      console.log(`[apply-ai-code-stream] Sandbox ${sandboxId} not in this instance, attempting reconnect...`);

      try {
        // Reconnect to the existing sandbox using E2B's connect method
        sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY });
        console.log(`[apply-ai-code-stream] Successfully reconnected to sandbox ${sandboxId}`);

        // Store the reconnected sandbox globally for this instance
        global.activeSandbox = sandbox;

        // Update sandbox data if needed
        if (!global.sandboxData) {
          const host = (sandbox as any).getHost(5173);
          global.sandboxData = {
            sandboxId,
            url: `https://${host}`
          };
        }

        // Initialize existingFiles if not already
        if (!global.existingFiles) {
          global.existingFiles = new Set<string>();
        }
      } catch (reconnectError) {
        console.warn(`[apply-ai-code-stream] Sandbox ${sandboxId} expired/crashed. Attempting to create a new fallback sandbox...`);

        try {
          // Self-healing feature: Create a fresh sandbox if the original one crashed
          const createResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/create-ai-sandbox`, {
            method: 'POST'
          });
          
          if (!createResponse.ok) {
            throw new Error(`Failed to create fallback sandbox: ${createResponse.statusText}`);
          }
          
          const newSandboxData = await createResponse.json();
          console.log('[apply-ai-code-stream] Successfully created fallback sandbox:', newSandboxData.sandboxId);
          
          // Connect to the NEW sandbox
          sandbox = await Sandbox.connect(newSandboxData.sandboxId, { apiKey: process.env.E2B_API_KEY });
          
          // Update global state
          global.activeSandbox = sandbox;
          global.sandboxData = newSandboxData;
          if (global.existingFiles) {
             global.existingFiles.clear();
          } else {
             global.existingFiles = new Set<string>();
          }
          
        } catch (createError) {
          console.error(`[apply-ai-code-stream] Fallback sandbox creation failed:`, createError);

          // If fallback fails, return the meaningful error response
          return NextResponse.json({
            success: false,
            error: `Failed to reconnect to sandbox ${sandboxId} and fallback creation failed. The sandbox may have expired or crashed.`,
            results: {
              filesCreated: [],
              packagesInstalled: [],
              commandsExecuted: [],
              errors: [`Sandbox reconnection failed: ${(reconnectError as Error).message}`, `Fallback creation failed: ${(createError as Error).message}`]
            },
            explanation: parsed.explanation,
            structure: parsed.structure,
            parsedFiles: parsed.files,
            message: `Parsed ${parsed.files.length} files but couldn't apply them - sandbox reconnection failed.`
          });
        }
      }
    }

    // If no sandbox at all and no sandboxId provided, return an error
    if (!sandbox && !sandboxId) {
      console.log('[apply-ai-code-stream] No sandbox available and no sandboxId provided');
      return NextResponse.json({
        success: false,
        error: 'No active sandbox found. Please create a sandbox first.',
        results: {
          filesCreated: [],
          packagesInstalled: [],
          commandsExecuted: [],
          errors: ['No sandbox available']
        },
        explanation: parsed.explanation,
        structure: parsed.structure,
        parsedFiles: parsed.files,
        message: `Parsed ${parsed.files.length} files but no sandbox available to apply them.`
      });
    }

    // Create a response stream for real-time updates
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Function to send progress updates
    const sendProgress = async (data: any) => {
      const message = `data: ${JSON.stringify(data)}\n\n`;
      await writer.write(encoder.encode(message));
    };

    // Start processing in background (pass sandbox and request to the async function)
    (async (sandboxInstance, req) => {
      const results = {
        filesCreated: [] as string[],
        filesUpdated: [] as string[],
        packagesInstalled: [] as string[],
        packagesAlreadyInstalled: [] as string[],
        packagesFailed: [] as string[],
        commandsExecuted: [] as string[],
        errors: [] as string[]
      };

      try {
        await sendProgress({
          type: 'start',
          message: 'Starting code application...',
          totalSteps: 3
        });

        // Step 1: Install packages
        const packagesArray = Array.isArray(packages) ? packages : [];
        const parsedPackages = Array.isArray(parsed.packages) ? parsed.packages : [];

        // Combine and deduplicate packages
        const allPackages = [...packagesArray.filter(pkg => pkg && typeof pkg === 'string'), ...parsedPackages];

        // Use Set to remove duplicates, sanitize, then filter out pre-installed packages
        const isValidPackageName = (pkg: string) => {
          if (!pkg || typeof pkg !== 'string') return false;
          const trimmed = pkg.trim();
          if (trimmed === '') return false;
          // Must be a valid npm package name: lowercase, may start with @, no spaces, no XML tags, no newlines
          if (/[\n\r<>{}()\[\]"'`\\;]/.test(trimmed)) return false;
          // Must match npm package naming: letters, numbers, hyphens, dots, underscores, @ for scoped
          if (!/^(@[a-z0-9\-_.]+\/)?[a-z0-9\-_.]+$/i.test(trimmed)) return false;
          // Must be reasonable length
          if (trimmed.length > 50) return false;
          return true;
        };
        
        const uniquePackages = [...new Set(allPackages)]
          .map(pkg => typeof pkg === 'string' ? pkg.trim() : '')
          .filter(isValidPackageName)
          .filter(pkg => !['react', 'react-dom', 'react-router-dom', 'firebase', 'express', 'cors'].includes(pkg));

        // Log if we found duplicates
        if (allPackages.length !== uniquePackages.length) {
          console.log(`[apply-ai-code-stream] Removed ${allPackages.length - uniquePackages.length} duplicate packages`);
          console.log(`[apply-ai-code-stream] Original packages:`, allPackages);
          console.log(`[apply-ai-code-stream] Deduplicated packages:`, uniquePackages);
        }

        if (uniquePackages.length > 0) {
          await sendProgress({
            type: 'step',
            step: 1,
            message: `Installing ${uniquePackages.length} packages...`,
            packages: uniquePackages
          });

          // Use streaming package installation
          try {
            // Construct the API URL properly for both dev and production
            const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
            const host = req.headers.get('host') || 'localhost:3000';
            const apiUrl = `${protocol}://${host}/api/install-packages`;

            const installResponse = await fetch(apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                packages: uniquePackages,
                sandboxId: sandboxId || (sandboxInstance as any).sandboxId
              })
            });

            if (installResponse.ok && installResponse.body) {
              const reader = installResponse.body.getReader();
              const decoder = new TextDecoder();

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                if (!chunk) continue;
                const lines = chunk.split('\n');

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    try {
                      const data = JSON.parse(line.slice(6));

                      // Forward package installation progress
                      await sendProgress({
                        type: 'package-progress',
                        ...data
                      });

                      // Track results
                      if (data.type === 'success' && data.installedPackages) {
                        results.packagesInstalled = data.installedPackages;
                      }
                    } catch {
                      // Ignore parse errors
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.error('[apply-ai-code-stream] Error installing packages:', error);
            await sendProgress({
              type: 'warning',
              message: `Package installation skipped (${(error as Error).message}). Continuing with file creation...`
            });
            results.errors.push(`Package installation failed: ${(error as Error).message}`);
          }
        } else {
          await sendProgress({
            type: 'step',
            step: 1,
            message: 'No additional packages to install, skipping...'
          });
        }

        // Step 2: Create/update files
        const filesArray = Array.isArray(parsed.files) ? parsed.files : [];
        await sendProgress({
          type: 'step',
          step: 2,
          message: `Creating ${filesArray.length} files...`
        });

        // Filter out config files that shouldn't be created
        const configFiles = ['tailwind.config.js', 'vite.config.js', 'package.json', 'package-lock.json', 'tsconfig.json', 'postcss.config.js'];
        const filteredFiles = filesArray.filter(file => {
          if (!file || typeof file !== 'object') return false;
          const fileName = (file.path || '').split('/').pop() || '';
          return !configFiles.includes(fileName);
        });

        for (const [index, file] of filteredFiles.entries()) {
          try {
            // Send progress for each file
            await sendProgress({
              type: 'file-progress',
              current: index + 1,
              total: filteredFiles.length,
              fileName: file.path,
              action: 'creating'
            });

            // Normalize the file path
            let normalizedPath = file.path;
            if (normalizedPath.startsWith('/')) {
              normalizedPath = normalizedPath.substring(1);
            }
            if (!normalizedPath.startsWith('src/') &&
              !normalizedPath.startsWith('public/') &&
              !normalizedPath.startsWith('server/') &&
              normalizedPath !== 'index.html' &&
              !configFiles.includes(normalizedPath.split('/').pop() || '')) {
              normalizedPath = 'src/' + normalizedPath;
            }

            const fullPath = `/home/user/app/${normalizedPath}`;
            const isUpdate = global.existingFiles.has(normalizedPath);

            // Sanitize: remove any leaked XML tags from AI output
            let fileContent = sanitizeFileContent(file.content, file.path);
            // Strip any remaining markdown code block markers (```css, ```jsx, etc.)
            fileContent = fileContent.replace(/^```[\w]*\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
            if (file.path.endsWith('.jsx') || file.path.endsWith('.js') || file.path.endsWith('.tsx') || file.path.endsWith('.ts')) {
              fileContent = fileContent.replace(/import\s+['"]\.\/(?!index\.css)[^'"]+\.css['"];?\s*\n?/g, '');
            }
            
            // Truncation detection and auto-fix
            const truncationPatterns = /^\s*\.{3}\s*$|\/\/\s*(?:rest of|remaining|\.{3})|\/\*\s*\.{3}\s*\*\/|\/\/\s*\.{3}/m;
            const isTruncated = truncationPatterns.test(fileContent);
            
            if (isTruncated && (file.path.endsWith('.jsx') || file.path.endsWith('.js') || file.path.endsWith('.tsx') || file.path.endsWith('.ts'))) {
              console.log(`[apply-ai-code-stream] ⚠️ Truncated file detected: ${file.path}`);
              await sendProgress({ type: 'info', message: `🔧 Auto-completing truncated ${file.path}...` });
              
              try {
                const { streamText } = await import('ai');
                const { anthropic } = await import('@ai-sdk/anthropic');
                
                const completeResult = await streamText({
                  model: anthropic('claude-sonnet-4-20250514'),
                  messages: [
                    { role: 'system', content: 'Complete this truncated React component. Replace all "..." and "// rest of code" with actual working code. Use export default. Use emoji instead of icon library imports. Output ONLY the complete file — no XML, no markdown fences.' },
                    { role: 'user', content: `Complete this truncated file:\n\nFile: ${file.path}\n\n${fileContent.substring(0, 4000)}\n\nOutput ONLY the complete, working code.` }
                  ],
                  maxTokens: 4096,
                  temperature: 0.3
                } as any);
                
                let completedCode = '';
                for await (const chunk of completeResult.textStream) { completedCode += chunk; }
                completedCode = completedCode.trim();
                if (completedCode.startsWith('```')) completedCode = completedCode.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
                completedCode = sanitizeFileContent(completedCode, file.path);
                
                if (completedCode.length > fileContent.length * 0.5) {
                  fileContent = completedCode;
                  console.log(`[apply-ai-code-stream] ✅ Auto-completed ${file.path} (${completedCode.length} chars)`);
                }
              } catch (completeErr) {
                console.warn(`[apply-ai-code-stream] Auto-complete failed for ${file.path}:`, completeErr);
              }
            }

            // Write the file using Python (code-interpreter SDK)
            const escapedContent = fileContent
              .replace(/\\/g, '\\\\')
              .replace(/"""/g, '\\"\\"\\"')
              .replace(/\$/g, '\\$');

            await sandboxInstance.runCode(`
import os
os.makedirs(os.path.dirname("${fullPath}"), exist_ok=True)
with open("${fullPath}", 'w') as f:
    f.write("""${escapedContent}""")
print(f"File written: ${fullPath}")
            `);

            // Update file cache
            if (global.sandboxState?.fileCache) {
              global.sandboxState.fileCache.files[normalizedPath] = {
                content: fileContent,
                lastModified: Date.now()
              };
            }

            if (isUpdate) {
              if (results.filesUpdated) results.filesUpdated.push(normalizedPath);
            } else {
              if (results.filesCreated) results.filesCreated.push(normalizedPath);
              if (global.existingFiles) global.existingFiles.add(normalizedPath);
            }

            await sendProgress({
              type: 'file-complete',
              fileName: normalizedPath,
              action: isUpdate ? 'updated' : 'created'
            });
          } catch (error) {
            if (results.errors) {
              results.errors.push(`Failed to create ${file.path}: ${(error as Error).message}`);
            }
            await sendProgress({
              type: 'file-error',
              fileName: file.path,
              error: (error as Error).message
            });
          }
        }

        // Step 3: Execute commands
        const commandsArray = Array.isArray(parsed.commands) ? parsed.commands : [];
        if (commandsArray.length > 0) {
          await sendProgress({
            type: 'step',
            step: 3,
            message: `Executing ${commandsArray.length} commands...`
          });

          for (const [index, cmd] of commandsArray.entries()) {
            try {
              await sendProgress({
                type: 'command-progress',
                current: index + 1,
                total: parsed.commands.length,
                command: cmd,
                action: 'executing'
              });

              // Use E2B commands.run() for cleaner execution
              const result = await sandboxInstance.commands.run(cmd, {
                cwd: '/home/user/app',
                timeout: 60,
                on_stdout: async (data: string) => {
                  await sendProgress({
                    type: 'command-output',
                    command: cmd,
                    output: data,
                    stream: 'stdout'
                  });
                },
                on_stderr: async (data: string) => {
                  await sendProgress({
                    type: 'command-output',
                    command: cmd,
                    output: data,
                    stream: 'stderr'
                  });
                }
              });

              if (results.commandsExecuted) {
                results.commandsExecuted.push(cmd);
              }

              await sendProgress({
                type: 'command-complete',
                command: cmd,
                exitCode: result.exitCode,
                success: result.exitCode === 0
              });
            } catch (error) {
              if (results.errors) {
                results.errors.push(`Failed to execute ${cmd}: ${(error as Error).message}`);
              }
              await sendProgress({
                type: 'command-error',
                command: cmd,
                error: (error as Error).message
              });
            }
          }
        }

        // ============ SELF-HEALING: Build + Import Verification ============
        // Refresh sandbox timeout before running checks (prevents 'sandbox not found')
        try {
          (sandboxInstance as any).setTimeout(15 * 60 * 1000); // 15 more minutes
          console.log('[apply-ai-code-stream] Refreshed sandbox timeout for self-healing');
        } catch (timeoutErr) {
          console.warn('[apply-ai-code-stream] Could not refresh sandbox timeout, attempting reconnect...');
          try {
            const reconnectedSandbox = await Sandbox.connect(
              (sandboxInstance as any).sandboxId || sandboxId,
              { apiKey: process.env.E2B_API_KEY }
            );
            sandboxInstance = reconnectedSandbox;
            global.activeSandbox = reconnectedSandbox;
            console.log('[apply-ai-code-stream] Reconnected to sandbox for self-healing');
          } catch (reconnectErr) {
            console.warn('[apply-ai-code-stream] Sandbox reconnect failed, skipping self-healing');
          }
        }
        
        let selfHealAttempts = 0;
        const MAX_HEAL_ATTEMPTS = 3;
        
        // Phase 1: Static import/export fix in sandbox (catches mismatches before build)
        try {
          await sendProgress({ type: 'info', message: '🔍 Scanning for import/export issues...' });
          
          const importFixResult = await sandboxInstance.runCode(`
import os, re

app_dir = '/home/user/app/src'
fixes = []

# Read all generated files
file_contents = {}
for root, dirs, files in os.walk(app_dir):
    for f in files:
        if f.endswith(('.jsx', '.js', '.tsx', '.ts')):
            path = os.path.join(root, f)
            rel = os.path.relpath(path, '/home/user/app')
            with open(path, 'r') as fh:
                file_contents[rel] = fh.read()

# Build export map
export_map = {}
for path, content in file_contents.items():
    m = re.search(r'export\\s+default\\s+(?:function\\s+)?(\\w+)', content)
    if m:
        export_map[path] = ('default', m.group(1))
    else:
        m2 = re.search(r'export\\s+(?:const|function|class)\\s+(\\w+)', content)
        if m2:
            export_map[path] = ('named', m2.group(1))

# Fix each file
for path, content in file_contents.items():
    original = content
    
    # Strip icon library imports and ALL their references
    icon_names = []
    for icon_match in re.finditer(r"import\\s+\\{([^}]+)\\}\\s+from\\s+['\"](?:react-icons/[^'\"]+|lucide-react|@heroicons/[^'\"]+)['\"]", content):
        names = [n.strip().split()[-1] for n in icon_match.group(1).split(',') if n.strip()]
        icon_names.extend(names)
    
    content = re.sub(r"import\\s+\\{[^}]*\\}\\s+from\\s+['\"]react-icons/[^'\"]+['\"];?\\s*\\n?", '', content)
    content = re.sub(r"import\\s+\\{[^}]*\\}\\s+from\\s+['\"]lucide-react['\"];?\\s*\\n?", '', content)
    content = re.sub(r"import\\s+\\{[^}]*\\}\\s+from\\s+['\"]@heroicons/[^'\"]+['\"];?\\s*\\n?", '', content)
    
    # Replace ALL references to extracted icon names
    for icon_name in icon_names:
        if len(icon_name) < 2:
            continue
        content = re.sub(f'<{icon_name}[^>]*/>', '<span>●</span>', content)
        content = re.sub(f'<{icon_name}[^>]*>[\\s\\S]*?</{icon_name}>', '<span>●</span>', content)
        content = re.sub(f'\\{{{icon_name}\\}}', '{\"●\"}', content)
        content = re.sub(f'=\\{{{icon_name}\\}}', '={\"●\"}', content)
    
    # Catch any remaining icon-prefixed JSX
    content = re.sub(r'<(?:Fi|Hi|Ai|Bs|Md|Io|Fa|Ri|Ti|Gi|Bi|Si|Cg|Vsc|Tb|Lu)[A-Z]\\w*[^>]*/>', '<span>●</span>', content)
    
    # Fix import { X } from './Y' where Y has export default
    def fix_import(match):
        named = match.group(1)
        imp_path = match.group(2)
        # Resolve relative path
        base_dir = os.path.dirname(path)
        resolved = os.path.normpath(os.path.join(base_dir, imp_path)).replace('\\\\', '/')
        for ext in ['', '.jsx', '.js', '.tsx', '.ts']:
            check = resolved + ext
            if check in export_map and export_map[check][0] == 'default':
                fixes.append(f"Fixed: {{named}} -> {named} in {path}")
                return f"import {named} from '{imp_path}'"
        return match.group(0)
    
    content = re.sub(r"import\\s+\\{\\s*(\\w+)\\s*\\}\\s+from\\s+['\"](\\./.+?)['\"]", fix_import, content)
    
    if content != original:
        with open(os.path.join('/home/user/app', path), 'w') as fh:
            fh.write(content)
        fixes.append(f"Updated: {path}")

if fixes:
    print("FIXES:" + '|'.join(fixes))
else:
    print("NO_FIXES_NEEDED")
          `, { timeoutMs: 15000 });
          
          const fixOutput = (importFixResult as any).logs?.stdout?.join('') || '';
          if (fixOutput.includes('FIXES:')) {
            const fixList = fixOutput.split('FIXES:')[1]?.split('|') || [];
            console.log(`[apply-ai-code-stream] 🔧 Auto-fixed ${fixList.length} import issues in sandbox`);
            await sendProgress({ type: 'info', message: `🔧 Fixed ${fixList.length} import issues automatically` });
          } else {
            console.log('[apply-ai-code-stream] ✅ No import issues found');
          }
        } catch (importFixErr) {
          console.warn('[apply-ai-code-stream] Import scan failed (non-critical):', importFixErr);
        }
        
        // Phase 2: Build verification with production mode (catches export errors)
        while (selfHealAttempts < MAX_HEAL_ATTEMPTS) {
          try {
            await sendProgress({
              type: 'info',
              message: selfHealAttempts === 0 ? 'Building to verify code...' : `Fixing errors (attempt ${selfHealAttempts + 1})...`
            });
            
            const buildCheck = await sandboxInstance.runCode(`
import subprocess
result = subprocess.run(
    ['npx', 'vite', 'build'],
    cwd='/home/user/app',
    capture_output=True,
    text=True,
    timeout=45
)
output = (result.stdout or '') + '\\n' + (result.stderr or '')
if result.returncode != 0:
    print("BUILD_ERROR:" + output[:3000])
elif 'error' in output.lower():
    print("BUILD_WARNING:" + output[:2000])
else:
    print("BUILD_OK")
            `, { timeoutMs: 60000 });
            
            const buildOutput = (buildCheck as any).logs?.stdout?.join('') || '';
            const buildErrors = (buildCheck as any).logs?.stderr?.join('') || '';
            const fullOutput = buildOutput + buildErrors;
            
            if (fullOutput.includes('BUILD_OK')) {
              console.log('[apply-ai-code-stream] ✅ Production build passed!');
              await sendProgress({ type: 'info', message: '✅ Build verified — code is clean!' });
              break;
            }
            
            // Extract error from BUILD_ERROR or BUILD_WARNING
            const errorMarker = fullOutput.includes('BUILD_ERROR:') ? 'BUILD_ERROR:' : 
                                fullOutput.includes('BUILD_WARNING:') ? 'BUILD_WARNING:' : null;
            
            if (errorMarker) {
              const errorText = fullOutput.split(errorMarker)[1]?.substring(0, 2000) || '';
              console.log('[apply-ai-code-stream] ❌ Build error:', errorText.substring(0, 300));
              
              // Multiple patterns to extract the error file
              const errorFilePatterns = [
                /(?:\/home\/user\/app\/)(src\/[^\s:'"]+)/,
                /(?:src\/[^\s:'"]+\.(?:jsx?|tsx?))/,
                /Could not resolve ['"]\.\/([^'"]+)['"]/,
                /does not provide an export named ['"](\w+)['"]/
              ];
              
              let errorFile: string | null = null;
              for (const pattern of errorFilePatterns) {
                const m = errorText.match(pattern);
                if (m) {
                  errorFile = m[1] || m[0];
                  if (errorFile && !errorFile.startsWith('src/')) errorFile = `src/${errorFile}`;
                  break;
                }
              }
              
              if (errorFile && selfHealAttempts < MAX_HEAL_ATTEMPTS) {
                selfHealAttempts++;
                await sendProgress({ type: 'info', message: `🔧 Auto-fixing ${errorFile}...` });
                
                // Read the broken file
                let brokenContent = '';
                try {
                  const readResult = await sandboxInstance.runCode(`
with open("/home/user/app/${errorFile}", 'r') as f:
    print(f.read())
                  `);
                  brokenContent = (readResult as any).logs?.stdout?.join('') || '';
                } catch (e) { /* ignore */ }
                
                // AI fix
                try {
                  const { streamText } = await import('ai');
                  const { anthropic } = await import('@ai-sdk/anthropic');
                  
                  const fixResult = await streamText({
                    model: anthropic('claude-sonnet-4-20250514'),
                    messages: [
                      { role: 'system', content: 'Fix this React component. Rules: (1) Use export default. (2) NEVER import from react-icons, lucide-react, or heroicons — use emoji instead. (3) Output ONLY the fixed code, no XML, no markdown.' },
                      { role: 'user', content: `File: ${errorFile}\nBuild Error: ${errorText.substring(0, 600)}\n\nCode:\n${brokenContent.substring(0, 3000)}\n\nOutput ONLY the fixed code.` }
                    ],
                    maxTokens: 4096,
                    temperature: 0.2
                  } as any);
                  
                  let fixedCode = '';
                  for await (const chunk of fixResult.textStream) { fixedCode += chunk; }
                  fixedCode = fixedCode.trim();
                  if (fixedCode.startsWith('```')) fixedCode = fixedCode.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
                  fixedCode = sanitizeFileContent(fixedCode, errorFile);
                  
                  const fixPath = `/home/user/app/${errorFile}`;
                  const escapedFix = fixedCode.replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"').replace(/\$/g, '\\$');
                  
                  await sandboxInstance.runCode(`
import os
os.makedirs(os.path.dirname("${fixPath}"), exist_ok=True)
with open("${fixPath}", 'w') as f:
    f.write("""${escapedFix}""")
print(f"Fixed: ${fixPath}")
                  `);
                  
                  console.log(`[apply-ai-code-stream] 🔧 Auto-fixed ${errorFile}`);
                  continue;
                } catch (fixError) {
                  console.warn('[apply-ai-code-stream] Auto-fix failed:', fixError);
                  break;
                }
              } else {
                // Can't identify file — try a general fix
                selfHealAttempts++;
                console.warn('[apply-ai-code-stream] Could not identify error file');
                break;
              }
            } else {
              break;
            }
          } catch (buildCheckError) {
            console.warn('[apply-ai-code-stream] Build check failed (non-critical):', buildCheckError);
            break;
          }
        }
        // ============ END SELF-HEALING (BUILD) ============

        // ============ RUNTIME ERROR DETECTION ============
        // Check if the Vite dev server shows an error overlay
        try {
          // Wait for Vite to rebuild with new files
          await new Promise(r => setTimeout(r, 3000));
          
          const sandboxHost = (sandboxInstance as any).getHost(5173);
          if (sandboxHost) {
            const sandboxUrl = `https://${sandboxHost}`;
            await sendProgress({ type: 'info', message: 'Checking live preview for errors...' });
            
            try {
              const pageResponse = await fetch(sandboxUrl, { 
                signal: AbortSignal.timeout(10000) 
              });
              const pageHtml = await pageResponse.text();
              
              // Check for Vite error overlay markers
              const hasViteError = pageHtml.includes('vite-error-overlay') || 
                                   pageHtml.includes('[plugin:vite') ||
                                   pageHtml.includes('Internal Server Error') ||
                                   pageHtml.includes('SyntaxError') ||
                                   pageHtml.includes('ReferenceError') ||
                                   pageHtml.includes('TypeError');
              
              if (hasViteError) {
                console.log('[apply-ai-code-stream] ⚠️ Runtime error detected in preview');
                
                // Extract error text from HTML
                const errorMatch = pageHtml.match(/(?:Error|error)[:\s]*([^\n<]{10,200})/);
                const errorText = errorMatch ? errorMatch[1] : 'Unknown runtime error';
                
                // Try to identify the file from error
                const fileMatch = pageHtml.match(/(?:src\/[^\s:'"<]+\.(?:jsx?|tsx?))/);
                const errorFile = fileMatch ? fileMatch[0] : null;
                
                if (errorFile) {
                  await sendProgress({ type: 'info', message: `🔧 Fixing runtime error in ${errorFile}...` });
                  
                  try {
                    // Read the broken file
                    let brokenContent = '';
                    try {
                      const readResult = await sandboxInstance.runCode(`
with open("/home/user/app/${errorFile}", 'r') as f:
    print(f.read())
                      `);
                      brokenContent = (readResult as any).logs?.stdout?.join('') || '';
                    } catch (e) { /* ignore read errors */ }
                    
                    const { streamText } = await import('ai');
                    const { anthropic } = await import('@ai-sdk/anthropic');
                    
                    const fixResult = await streamText({
                      model: anthropic('claude-sonnet-4-20250514'),
                      messages: [
                        { role: 'system', content: 'Fix this React component that has a runtime error. Output ONLY the corrected code — no XML tags, no explanation.' },
                        { role: 'user', content: `File: ${errorFile}\nRuntime Error: ${errorText}\n\nCode:\n${brokenContent.substring(0, 3000)}\n\nOutput ONLY the fixed code.` }
                      ],
                      maxTokens: 4096,
                      temperature: 0.2
                    } as any);
                    
                    let fixedCode = '';
                    for await (const chunk of fixResult.textStream) { fixedCode += chunk; }
                    fixedCode = fixedCode.trim();
                    if (fixedCode.startsWith('```')) fixedCode = fixedCode.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
                    fixedCode = sanitizeFileContent(fixedCode, errorFile);
                    
                    const fixPath = `/home/user/app/${errorFile}`;
                    const escapedFix = fixedCode.replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"').replace(/\$/g, '\\$');
                    
                    await sandboxInstance.runCode(`
import os
os.makedirs(os.path.dirname("${fixPath}"), exist_ok=True)
with open("${fixPath}", 'w') as f:
    f.write("""${escapedFix}""")
print(f"Runtime fix applied: ${fixPath}")
                    `);
                    
                    console.log(`[apply-ai-code-stream] 🔧 Runtime error fixed in ${errorFile}`);
                    await sendProgress({ type: 'info', message: `✅ Fixed runtime error in ${errorFile}` });
                  } catch (runtimeFixErr) {
                    console.warn('[apply-ai-code-stream] Runtime fix failed:', runtimeFixErr);
                  }
                }
              } else {
                console.log('[apply-ai-code-stream] ✅ Preview is clean — no runtime errors');
                await sendProgress({ type: 'info', message: '✅ Preview verified — app is running!' });
              }
            } catch (fetchErr) {
              console.warn('[apply-ai-code-stream] Could not fetch preview page (non-critical):', fetchErr);
            }
          }
        } catch (runtimeCheckErr) {
          console.warn('[apply-ai-code-stream] Runtime check skipped:', runtimeCheckErr);
        }
        // ============ END RUNTIME ERROR DETECTION ============

        // Send final results
        await sendProgress({
          type: 'complete',
          results,
          explanation: parsed.explanation,
          structure: parsed.structure,
          message: `Successfully applied ${results.filesCreated.length} files`
        });

        // Track applied files in conversation state
        if (global.conversationState && results.filesCreated.length > 0) {
          const messages = global.conversationState.context.messages;
          if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.role === 'user') {
              lastMessage.metadata = {
                ...lastMessage.metadata,
                editedFiles: results.filesCreated
              };
            }
          }

          // Track applied code in project evolution
          if (global.conversationState.context.projectEvolution) {
            global.conversationState.context.projectEvolution.majorChanges.push({
              timestamp: Date.now(),
              description: parsed.explanation || 'Code applied',
              filesAffected: results.filesCreated || []
            });
          }

          global.conversationState.lastUpdated = Date.now();
        }

      } catch (error) {
        await sendProgress({
          type: 'error',
          error: (error as Error).message
        });
      } finally {
        await writer.close();
      }
    })(sandbox, request);

    // Return the stream
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Apply AI code stream error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse AI code' },
      { status: 500 }
    );
  }
}