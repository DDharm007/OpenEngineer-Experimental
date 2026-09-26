'use client';

import React, { useState } from 'react';
import LatticeLoader from './LatticeLoader';
import { Plus, Mic, Paperclip, ArrowUp, Square, Download, Code, Key, ChevronDown, Check, X } from 'lucide-react';
import type { EngineerPlanResponse } from '@/app/api/open-engineer/plan/route';

export interface OpenEngineerWorkspaceProps {
  chatMessages: Array<{
    type: 'user' | 'ai' | 'system' | 'command' | 'error' | 'file-update';
    content: string;
    timestamp?: Date;
    metadata?: any;
  }>;
  generationProgress: {
    isThinking: boolean;
    thinkingText?: string;
    status: string;
    files: Array<{ path: string; content: string; type: string; completed: boolean; edited?: boolean }>;
    isGenerating: boolean;
    isStreaming: boolean;
  };
  openEngineerPlan: {
    summary?: string;
    architecture?: any;
    files?: Array<{ path: string; description: string }>;
    questions?: Array<{ id: string; question: string; options: string[]; multiple?: boolean }>;
    reasoning?: string;
  } | null;
  selectedEngineerAnswers: Record<string, string>;
  onSelectAnswer: (qId: string, option: string) => void;
  onApproveBuild: (customPrompt?: string) => void;
  aiChatInput: string;
  setAiChatInput: (v: string) => void;
  onSendMessage: (msg?: string) => void;
  onDownloadZip: () => void;
  hasSandboxKey: boolean;
  sandboxData: any;
  onInspectCode: () => void;
  onOpenApiKeysModal: () => void;
  aiModel: string;
  setAiModel: (m: string) => void;
  availableModels: string[];
  unlockedModels: string[];
  modelDisplayNames: Record<string, string>;
  modelTags: Record<string, string>;
  attachedFiles: File[];
  setAttachedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  onCancelGeneration: () => void;
  chatMessagesRef: React.RefObject<HTMLDivElement | null>;
  isSplit?: boolean;
}

export default function OpenEngineerWorkspace({
  chatMessages,
  generationProgress,
  openEngineerPlan,
  selectedEngineerAnswers,
  onSelectAnswer,
  onApproveBuild,
  aiChatInput,
  setAiChatInput,
  onSendMessage,
  onDownloadZip,
  hasSandboxKey,
  sandboxData,
  onInspectCode,
  onOpenApiKeysModal,
  aiModel,
  setAiModel,
  availableModels,
  unlockedModels,
  modelDisplayNames,
  attachedFiles,
  setAttachedFiles,
  onCancelGeneration,
  chatMessagesRef,
  isSplit = false,
}: OpenEngineerWorkspaceProps) {
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!generationProgress.isGenerating && aiChatInput.trim()) {
        onSendMessage();
      }
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setAiChatInput(aiChatInput ? `${aiChatInput} ${transcript}` : transcript);
        }
      };

      recognition.start();
    } catch (err) {
      console.error('Speech recognition error:', err);
      setIsRecording(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setAttachedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const activeModelDisplay = modelDisplayNames[aiModel] || aiModel.split('/').pop() || 'gpt-oss-120b';

  return (
    <div className={`flex flex-col h-full ${isSplit ? 'w-full' : 'max-w-3xl mx-auto w-full'} bg-[#0e0f12] text-white relative font-sans`}>
      {/* Top Header Mode Indicator — matching screenshot "Improvement and optimization assistance ⌵" */}
      <div className="px-5 pt-4 pb-1 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-200 transition-colors cursor-pointer select-none">
          <span className="font-normal">Improvement and optimization assistance</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-60" />
        </div>

        {/* Small Thinking Animation in top-right or active status */}
        {(generationProgress.isThinking || generationProgress.isGenerating) && (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-gray-300 animate-in fade-in duration-300">
            <LatticeLoader
              status="working"
              pattern="ripple"
              grid={3}
              shape="round"
              cellSize={2.5}
              gap={1}
              color="#f5f5f5"
              glow={false}
              showTimer={false}
            />
            <span className="font-mono text-[10px] text-gray-400">{generationProgress.status || 'Thinking...'}</span>
          </div>
        )}
      </div>

      {/* Main Conversation Stream */}
      <div
        ref={chatMessagesRef}
        className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-6 scrollbar-hide relative z-10"
      >
        {/* Empty state: Clean minimal guidance */}
        {chatMessages.length === 0 && !generationProgress.isThinking && (
          <div className="flex-1 flex flex-col items-center justify-center my-auto text-center py-16 px-4 animate-in fade-in duration-500">
            {/* Small thinking animation in place of logo */}
            <div className="w-12 h-12 rounded-2xl bg-[#14161f] border border-white/[0.08] flex items-center justify-center mb-4 shadow-xl">
              <LatticeLoader
                status="working"
                pattern="dots"
                grid={3}
                shape="round"
                cellSize={3}
                gap={1.5}
                color="#ffffff"
                glow={false}
                showTimer={false}
              />
            </div>
            <h2 className="text-xl font-medium text-white/95 mb-1.5 tracking-tight">
              Start chatting or describe a task
            </h2>
            <p className="text-xs text-gray-400 max-w-md leading-relaxed mb-6 font-normal">
              Autonomous Systems Engineer. Formulates architecture, creates files, and builds complete web applications.
            </p>

            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {[
                'Build a sleek SaaS landing page with dark theme',
                'Create a crypto & finance real-time dashboard',
                'Build an Animated minimal only black and white developer portfolio website',
                'Design a Kanban task board with drag-and-drop'
              ].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSendMessage(p)}
                  className="px-3 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-xs text-gray-300 hover:text-white transition-all text-left"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message List */}
        {chatMessages.map((msg, idx) => (
          <div key={idx} className="flex flex-col gap-1 w-full animate-in fade-in duration-300">
            {msg.type === 'user' ? (
              /* User Message: Dark blue-slate rounded pill on the right, matching screenshot */
              <div className="flex flex-col items-end">
                <div className="bg-[#18202d] border border-[#263143] text-gray-100 rounded-2xl px-4 py-2.5 max-w-[85%] text-[13px] leading-relaxed font-normal shadow-sm">
                  {msg.content}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono mt-1 px-1">
                  <span className="tracking-tighter">:::</span>
                  <span>Free</span>
                  <span>·</span>
                  <span>Just now</span>
                </div>
              </div>
            ) : (
              /* Assistant / Open Engineer Message: Typography directly on canvas, matching screenshot */
              <div className="flex flex-col items-start max-w-full">
                {/* Subtle thought / reasoning line */}
                {msg.metadata?.reasoning ? (
                  <p className="text-[13px] text-gray-400 font-normal leading-relaxed mb-1.5">
                    {msg.metadata.reasoning}
                  </p>
                ) : null}

                {/* Main message text */}
                <div className="text-[14px] text-gray-200 leading-relaxed font-normal whitespace-pre-wrap">
                  {msg.content}
                </div>

                {/* Optional action/tool badge with small thinking animation */}
                {msg.metadata?.toolAction && (
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-xs text-gray-300 mt-2">
                    <LatticeLoader
                      status="done"
                      pattern="ripple"
                      grid={3}
                      shape="round"
                      cellSize={2}
                      gap={1}
                      color="#f5f5f5"
                      glow={false}
                      showTimer={false}
                    />
                    <span>{msg.metadata.toolAction}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Live Thinking State — with small thinking animation in place of logo */}
        {generationProgress.isThinking && (
          <div className="flex flex-col items-start w-full animate-in fade-in duration-300">
            {/* Dimmed reasoning text stream */}
            {generationProgress.thinkingText && (
              <p className="text-[13px] text-gray-400 font-normal leading-relaxed mb-2 max-w-full whitespace-pre-wrap">
                {generationProgress.thinkingText}
              </p>
            )}

            {/* Compact Tool / Action Pill with small thinking animation */}
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#14161f] border border-white/[0.08] text-xs text-gray-200 shadow-sm">
              <LatticeLoader
                status="working"
                pattern="ripple"
                grid={3}
                shape="round"
                cellSize={2.5}
                gap={1}
                color="#ffffff"
                glow={false}
                showTimer={false}
              />
              <span className="font-mono text-[11px] text-gray-300">
                {generationProgress.status || 'Architecting system...'}
              </span>
            </div>
          </div>
        )}

        {/* Real-Time File Creation Badge Card */}
        {generationProgress.files.length > 0 && (
          <div className="w-full bg-[#12141c] border border-white/[0.08] rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-gray-400 border-b border-white/[0.06] pb-2">
              <div className="flex items-center gap-2">
                <Code className="w-3.5 h-3.5 text-gray-300" />
                <span className="font-medium text-gray-200">Engineered Files</span>
              </div>
              <span className="font-mono text-[10px] text-gray-500">
                {generationProgress.files.length} created
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {generationProgress.files.map((f, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-[11px] text-gray-300 font-mono"
                >
                  <Check className="w-2.5 h-2.5 text-gray-400" />
                  <span>{f.path}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Minimal Black & White Notice Card — when sandbox API is not added */}
        {generationProgress.files.length > 0 && (!hasSandboxKey || !sandboxData?.url) && !generationProgress.isGenerating && (
          <div className="w-full bg-[#121319] border border-white/[0.1] rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-medium text-white tracking-tight">Your sandbox API is not configured or added</h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-gray-300">
                  Ready
                </span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Please download the code by yourself. The Open Engineer has generated {generationProgress.files.length} production-grade files bundled into a runnable Vite project package.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={onDownloadZip}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-white/90 active:scale-95 text-black font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-black" />
                <span>Download Project ZIP</span>
              </button>

              <button
                type="button"
                onClick={onInspectCode}
                className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-gray-300 hover:text-white text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Code className="w-3.5 h-3.5" />
                <span>Inspect Code</span>
              </button>

              <button
                type="button"
                onClick={onOpenApiKeysModal}
                className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-gray-400 hover:text-white transition-all cursor-pointer"
                title="Configure Sandbox API key"
              >
                <Key className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PINNED BOTTOM PROMPT BAR — Identical to User's Screenshot */}
      <div className={`p-4 relative z-20 ${isSplit ? 'border-t border-white/[0.08] bg-[#0e0f12]' : ''}`}>
        <div
          className="bg-[#13151b] border border-[#272a38] rounded-2xl p-3 shadow-2xl relative transition-all focus-within:border-gray-500/50"
        >
          {/* Model Selector Dropdown Popover */}
          {showModelDropdown && (
            <>
              <div className="fixed inset-0 z-[99]" onClick={() => setShowModelDropdown(false)} />
              <div
                className="absolute bottom-[calc(100%+8px)] right-3 w-64 rounded-2xl overflow-hidden border border-white/10 bg-[#161821] shadow-2xl z-[100]"
              >
                <div className="p-1.5 flex flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar">
                  {availableModels.map((m) => {
                    const isUnlocked = unlockedModels.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          if (isUnlocked) {
                            setAiModel(m);
                            setShowModelDropdown(false);
                          } else {
                            setShowModelDropdown(false);
                            onOpenApiKeysModal();
                          }
                        }}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-all ${
                          aiModel === m
                            ? 'bg-white/10 text-white font-medium'
                            : isUnlocked
                            ? 'text-gray-300 hover:bg-white/[0.05] hover:text-white'
                            : 'text-gray-500 hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-1.5 h-1.5 rounded-full ${isUnlocked ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                          <span className="truncate">{modelDisplayNames[m] || m}</span>
                        </div>
                        {!isUnlocked && (
                          <span className="text-[10px] text-gray-500 font-mono">locked</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Attached Files Pills */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2 pb-2 border-b border-white/[0.06]">
              {attachedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[11px] text-gray-300"
                >
                  <span className="truncate max-w-[140px]">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Text Input */}
          <textarea
            value={aiChatInput}
            onChange={(e) => setAiChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Start chatting or describe a task..."
            rows={2}
            className="w-full bg-transparent text-gray-100 placeholder-gray-500 text-[13px] resize-none outline-none border-none p-0 focus:ring-0 leading-relaxed"
          />

          {/* Bottom Bar Controls — Matching Screenshot: Left '+' | Right: '::: Free ⌵', Mic, Paperclip, Send Button */}
          <div className="flex items-center justify-between pt-2 mt-1 border-t border-white/[0.04]">
            {/* Left '+' button */}
            <div className="flex items-center gap-1">
              <label className="w-7 h-7 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.05] flex items-center justify-center cursor-pointer transition-colors">
                <Plus className="w-4 h-4" />
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Right action group */}
            <div className="flex items-center gap-2">
              {/* Model Tag Pill — e.g. "::: Free ⌵" matching screenshot */}
              <button
                type="button"
                onClick={() => setShowModelDropdown(!showModelDropdown)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-gray-300 hover:text-white transition-all cursor-pointer font-mono"
              >
                <span className="tracking-tighter text-gray-400">:::</span>
                <span className="text-[11px] font-sans text-gray-300 font-medium truncate max-w-[120px]">
                  {activeModelDisplay}
                </span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {/* Voice / Mic Button */}
              <button
                type="button"
                onClick={handleVoiceInput}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  isRecording
                    ? 'text-red-400 bg-red-500/10 animate-pulse'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
                }`}
                title="Voice input"
              >
                <Mic className="w-3.5 h-3.5" />
              </button>

              {/* Paperclip / Attachment Button */}
              <label className="w-7 h-7 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.05] flex items-center justify-center cursor-pointer transition-colors">
                <Paperclip className="w-3.5 h-3.5" />
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Submit or Stop Button */}
              {generationProgress.isGenerating ? (
                <button
                  type="button"
                  onClick={onCancelGeneration}
                  className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer"
                  title="Stop generation"
                >
                  <Square className="w-3 h-3 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onSendMessage()}
                  disabled={!aiChatInput.trim()}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-white/90 disabled:opacity-30 disabled:hover:bg-white text-black flex items-center justify-center transition-all cursor-pointer"
                  title="Send message (Enter)"
                >
                  <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
