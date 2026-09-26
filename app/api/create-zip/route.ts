import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

declare global {
  var activeSandbox: any;
}

const DEFAULT_PACKAGE_JSON = {
  name: 'crust-vite-app',
  private: true,
  version: '0.0.0',
  type: 'module',
  scripts: {
    dev: 'vite',
    build: 'vite build',
    preview: 'vite preview'
  },
  dependencies: {
    react: '^18.3.1',
    'react-dom': '^18.3.1',
    'lucide-react': '^0.344.0',
    'clsx': '^2.1.0',
    'tailwind-merge': '^2.2.1'
  },
  devDependencies: {
    '@vitejs/plugin-react': '^4.3.1',
    vite: '^5.3.4',
    autoprefixer: '^10.4.19',
    postcss: '^8.4.38',
    tailwindcss: '^3.4.4'
  }
};

const DEFAULT_VITE_CONFIG = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`;

const DEFAULT_INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Crust Generated App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;

const DEFAULT_MAIN_JSX = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`;

const DEFAULT_TAILWIND_CONFIG = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`;

const DEFAULT_POSTCSS_CONFIG = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`;

export async function POST(req: NextRequest) {
  try {
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      // no JSON body
    }

    // 1. If files are provided in body (or when no sandbox is active)
    if (body?.files && Array.isArray(body.files) && body.files.length > 0) {
      console.log(`[create-zip] Generating client zip with ${body.files.length} files...`);
      const zip = new JSZip();

      const existingPaths = new Set(body.files.map((f: any) => f.path.replace(/^\//, '')));

      // Add user/generated files
      for (const file of body.files) {
        const cleanPath = file.path.replace(/^\//, '');
        zip.file(cleanPath, file.content || '');
      }

      // Add standard Vite project boilerplate files if missing
      if (!existingPaths.has('package.json')) {
        zip.file('package.json', JSON.stringify(DEFAULT_PACKAGE_JSON, null, 2));
      }
      if (!existingPaths.has('vite.config.js') && !existingPaths.has('vite.config.ts')) {
        zip.file('vite.config.js', DEFAULT_VITE_CONFIG);
      }
      if (!existingPaths.has('index.html')) {
        zip.file('index.html', DEFAULT_INDEX_HTML);
      }
      if (!existingPaths.has('src/main.jsx') && !existingPaths.has('src/main.tsx')) {
        zip.file('src/main.jsx', DEFAULT_MAIN_JSX);
      }
      if (!existingPaths.has('tailwind.config.js')) {
        zip.file('tailwind.config.js', DEFAULT_TAILWIND_CONFIG);
      }
      if (!existingPaths.has('postcss.config.js')) {
        zip.file('postcss.config.js', DEFAULT_POSTCSS_CONFIG);
      }
      if (!existingPaths.has('README.md')) {
        zip.file('README.md', `# Crust AI Generated App\n\n## Getting Started\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`);
      }

      const zipBase64 = await zip.generateAsync({ type: 'base64' });
      const dataUrl = `data:application/zip;base64,${zipBase64}`;

      return NextResponse.json({
        success: true,
        dataUrl,
        fileName: body.fileName || 'crust-project.zip',
        message: 'Project zip created successfully'
      });
    }

    // 2. Fallback to sandbox if active
    if (global.activeSandbox) {
      console.log('[create-zip] Creating project zip from active sandbox...');
      await global.activeSandbox.runCode(`
import zipfile
import os
import json
import base64

os.chdir('/home/user/app')

with zipfile.ZipFile('/tmp/project.zip', 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', '.next', 'dist']]
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, '.')
            zipf.write(file_path, arcname)

with open('/tmp/project.zip', 'rb') as f:
    content = f.read()
    encoded = base64.b64encode(content).decode('utf-8')
    print(encoded)
      `);

      // Read stdout
      const readResult = await global.activeSandbox.runCode(`
import base64
with open('/tmp/project.zip', 'rb') as f:
    print(base64.b64encode(f.read()).decode('utf-8'))
      `);
      const base64Content = readResult.logs.stdout.join('').trim();
      const dataUrl = `data:application/zip;base64,${base64Content}`;

      return NextResponse.json({
        success: true,
        dataUrl,
        fileName: 'crust-project.zip',
        message: 'Zip file created successfully from sandbox'
      });
    }

    return NextResponse.json({
      success: false,
      error: 'No active sandbox and no files provided to package'
    }, { status: 400 });

  } catch (error: any) {
    console.error('[create-zip] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create zip'
    }, { status: 500 });
  }
}