'use client';

import React, { useState, useMemo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  Folder, 
  FolderOpen, 
  FileCode, 
  FileText, 
  FileJson, 
  ChevronRight, 
  ChevronDown, 
  Copy, 
  Check, 
  Download, 
  Search,
  Code2,
  FileSpreadsheet
} from 'lucide-react';

export interface CodeExplorerProps {
  files: Array<{
    path: string;
    content: string;
    type?: string;
    completed?: boolean;
    edited?: boolean;
  }>;
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  onDownloadZip: () => void;
  isGenerating?: boolean;
  currentGeneratingFile?: string;
}

export default function CodeExplorer({
  files,
  selectedFile,
  onSelectFile,
  onDownloadZip,
  isGenerating = false,
  currentGeneratingFile,
}: CodeExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'src': true,
    'src/components': true,
    'src/lib': true,
    'src/hooks': true,
    'public': true
  });

  // Ensure an active file is always selected if files exist
  const activeFilePath = selectedFile || (files.length > 0 ? files[0].path : null);
  const activeFile = files.find(f => f.path === activeFilePath) || files[0];

  const handleCopyCode = async () => {
    if (!activeFile?.content) return;
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }));
  };

  // Filter files by search query
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    return files.filter(f => f.path.toLowerCase().includes(searchQuery.toLowerCase().trim()));
  }, [files, searchQuery]);

  // Group files into tree structure
  const fileTree = useMemo(() => {
    const tree: Record<string, typeof files> = {};

    filteredFiles.forEach(file => {
      const parts = file.path.split('/');
      const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
      if (!tree[dir]) tree[dir] = [];
      tree[dir].push(file);
    });

    return tree;
  }, [filteredFiles]);

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'jsx' || ext === 'tsx' || ext === 'js' || ext === 'ts') {
      return <FileCode className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />;
    }
    if (ext === 'css' || ext === 'scss') {
      return <FileSpreadsheet className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />;
    }
    if (ext === 'json') {
      return <FileJson className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />;
    }
    return <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />;
  };

  const getLanguage = (filepath: string) => {
    const ext = filepath.split('.').pop()?.toLowerCase();
    if (ext === 'css') return 'css';
    if (ext === 'json') return 'json';
    if (ext === 'html') return 'html';
    if (ext === 'ts' || ext === 'tsx') return 'typescript';
    return 'jsx';
  };

  const lineCount = activeFile?.content ? activeFile.content.split('\n').length : 0;

  return (
    <div className="flex h-full w-full bg-[#0a0b0e] text-white overflow-hidden font-sans border-l border-white/[0.08]">
      {/* LEFT: File Tree Sidebar */}
      <div className="w-64 flex-shrink-0 flex flex-col border-r border-white/[0.08] bg-[#0c0d12]">
        {/* Explorer Header */}
        <div className="p-3 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-gray-300" />
            <span className="text-xs font-semibold text-gray-200 tracking-wide uppercase">Explorer</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-gray-400">
            {files.length} file{files.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Search input in Explorer */}
        <div className="p-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-gray-400 focus-within:border-white/20">
            <Search className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="bg-transparent border-none outline-none text-xs text-gray-200 placeholder-gray-500 w-full p-0"
            />
          </div>
        </div>

        {/* File Tree List */}
        <div className="flex-1 overflow-y-auto p-2 scrollbar-hide space-y-1">
          {files.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-500">
              <p>No files generated yet.</p>
              <p className="text-[11px] text-gray-600 mt-1">Prompt Open Engineer to start building.</p>
            </div>
          ) : (
            Object.entries(fileTree).map(([dir, dirFiles]) => {
              const isRoot = !dir;
              const isExpanded = isRoot || expandedFolders[dir] !== false;

              return (
                <div key={dir || 'root'} className="space-y-0.5">
                  {!isRoot && (
                    <button
                      type="button"
                      onClick={() => toggleFolder(dir)}
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-white/[0.04] text-xs text-gray-400 hover:text-gray-200 transition-colors cursor-pointer text-left select-none"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-gray-500" />
                      )}
                      {isExpanded ? (
                        <FolderOpen className="w-3.5 h-3.5 text-gray-300" />
                      ) : (
                        <Folder className="w-3.5 h-3.5 text-gray-400" />
                      )}
                      <span className="font-medium text-gray-300 truncate">{dir.split('/').pop()}</span>
                    </button>
                  )}

                  {isExpanded && (
                    <div className={isRoot ? 'space-y-0.5' : 'pl-4 space-y-0.5'}>
                      {dirFiles.map(file => {
                        const isSelected = activeFilePath === file.path;
                        const isCurrentGenerating = currentGeneratingFile === file.path;
                        const fileName = file.path.split('/').pop() || file.path;

                        return (
                          <button
                            key={file.path}
                            type="button"
                            onClick={() => onSelectFile(file.path)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all text-left cursor-pointer group select-none ${
                              isSelected
                                ? 'bg-white/[0.1] text-white border-l-2 border-white pl-2'
                                : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {getFileIcon(fileName)}
                              <span className="truncate">{fileName}</span>
                            </div>

                            {isCurrentGenerating ? (
                              <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
                            ) : file.completed ? (
                              <Check className="w-3 h-3 text-emerald-400 opacity-60 group-hover:opacity-100" />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Actions inside Sidebar */}
        <div className="p-3 border-t border-white/[0.08] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onDownloadZip}
            disabled={files.length === 0}
            className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-30 border border-white/[0.1] text-gray-200 hover:text-white text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            title="Download complete project ZIP"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download ZIP</span>
          </button>
        </div>
      </div>

      {/* RIGHT: Code Viewer Pane */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#090a0f] overflow-hidden">
        {/* Code Viewer Tab Header */}
        <div className="px-4 py-2 bg-[#0c0d13] border-b border-white/[0.08] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {activeFile && getFileIcon(activeFile.path)}
            <span className="font-mono text-xs text-gray-200 font-medium truncate">
              {activeFilePath || 'No file selected'}
            </span>
            {lineCount > 0 && (
              <span className="text-[10px] text-gray-500 font-mono hidden sm:inline">
                {lineCount} lines
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCode}
              disabled={!activeFile?.content}
              className="px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-gray-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-30"
              title="Copy file code to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 text-[11px]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-gray-400" />
                  <span className="text-[11px]">Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Code Content Area */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#090a0f]">
          {activeFile?.content ? (
            <SyntaxHighlighter
              language={getLanguage(activeFile.path)}
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: '0.5rem',
                fontSize: '0.8rem',
                background: 'transparent',
                lineHeight: '1.6',
              }}
              showLineNumbers={true}
              wrapLongLines={false}
            >
              {activeFile.content}
            </SyntaxHighlighter>
          ) : (
            <div className="flex items-center justify-center h-full text-center text-xs text-gray-500">
              <div className="max-w-xs">
                <Code2 className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="font-medium text-gray-400">No code to display</p>
                <p className="text-[11px] text-gray-600 mt-1">Select a file from the explorer on the left to inspect its implementation.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
