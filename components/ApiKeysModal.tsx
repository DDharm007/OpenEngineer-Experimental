'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Key, 
  ExternalLink, 
  Check, 
  Eye, 
  EyeOff, 
  Copy, 
  Sparkles, 
  Server, 
  ShieldCheck, 
  Zap, 
  X, 
  Info,
  RefreshCw
} from 'lucide-react';
import { SUPPORTED_PROVIDERS, type AIProvider } from '@/lib/providers-config';

interface ApiKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeysSaved?: (data: { availableModels: string[]; unlockedModels?: string[]; modelDisplayNames: Record<string, string>; modelTags?: Record<string, string> }) => void;
  initialProviderId?: string | null;
}

export default function ApiKeysModal({ isOpen, onClose, onKeysSaved, initialProviderId }: ApiKeysModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'unified' | 'frontier' | 'open' | 'specialized' | 'sandbox'>('all');
  const [keyValues, setKeyValues] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [configuredKeys, setConfiguredKeys] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [providerPendingRemoval, setProviderPendingRemoval] = useState<AIProvider | null>(null);
  const [isRemovingKey, setIsRemovingKey] = useState(false);

  // If initialProviderId is provided, filter directly to that provider
  useEffect(() => {
    if (!isOpen) return;
    if (initialProviderId) {
      const p = SUPPORTED_PROVIDERS.find(prov => prov.id === initialProviderId);
      if (p) {
        setSearchQuery(p.name);
        setActiveTab('all');
      }
    } else {
      setSearchQuery('');
    }
  }, [isOpen, initialProviderId]);

  // Fetch current configured status on open
  useEffect(() => {
    if (!isOpen) return;

    const fetchConfiguredKeys = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/check-api-keys');
        if (res.ok) {
          const data = await res.json();
          if (data.availableKeys) {
            setConfiguredKeys(data.availableKeys);
          }
        }
      } catch (err) {
        console.error('Failed to fetch configured keys:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfiguredKeys();
  }, [isOpen]);

  const toggleShowKey = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleKeyChange = (envKey: string, val: string) => {
    setKeyValues(prev => ({ ...prev, [envKey]: val }));
  };

  const handlePaste = async (envKey: string) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setKeyValues(prev => ({ ...prev, [envKey]: text.trim() }));
      }
    } catch (e) {
      console.warn('Clipboard read failed:', e);
    }
  };

  const handleSaveSingle = async (envKey: string, val: string) => {
    if (!val?.trim()) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/save-api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: { [envKey]: val.trim() } })
      });
      if (res.ok) {
        const data = await res.json();
        setSaveSuccess(true);
        if (data.availableKeys) {
          setConfiguredKeys(data.availableKeys);
        }
        if (onKeysSaved && data.availableModels && data.modelDisplayNames) {
          onKeysSaved({
            availableModels: data.availableModels,
            unlockedModels: data.unlockedModels,
            modelDisplayNames: data.modelDisplayNames,
            modelTags: data.modelTags
          });
        }
        setKeyValues(prev => {
          const next = { ...prev };
          delete next[envKey];
          return next;
        });
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setErrorMessage('Failed to save API key. Please check your network or key format.');
        setTimeout(() => setErrorMessage(null), 4000);
      }
    } catch (err) {
      console.error('Error saving single key:', err);
      setErrorMessage('Error saving API key.');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/save-api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: keyValues })
      });

      if (res.ok) {
        const data = await res.json();
        setSaveSuccess(true);
        if (data.availableKeys) {
          setConfiguredKeys(data.availableKeys);
        }

        // Call callback to update parent state in page.tsx
        if (onKeysSaved && data.availableModels && data.modelDisplayNames) {
          onKeysSaved({
            availableModels: data.availableModels,
            unlockedModels: data.unlockedModels,
            modelDisplayNames: data.modelDisplayNames,
            modelTags: data.modelTags
          });
        }

        // Clear input state for security while keeping configured status active
        setKeyValues({});

        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
      } else {
        setErrorMessage('Failed to save API keys. Please try again.');
        setTimeout(() => setErrorMessage(null), 4000);
      }
    } catch (err) {
      console.error('Error saving keys:', err);
      setErrorMessage('Error saving API keys.');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProviders = SUPPORTED_PROVIDERS.filter(p => {
    let matchesTab = false;
    if (activeTab === 'all') matchesTab = true;
    else if (activeTab === 'unified') matchesTab = p.id === 'openrouter';
    else if (activeTab === 'frontier') matchesTab = ['openai', 'anthropic', 'google', 'xai'].includes(p.id);
    else if (activeTab === 'open') matchesTab = ['deepseek', 'groq', 'nvidia'].includes(p.id);
    else if (activeTab === 'specialized') matchesTab = ['moonshot', 'minimax', 'qwen', 'mistral', 'zai', 'sakana'].includes(p.id);
    else if (activeTab === 'sandbox') matchesTab = Boolean(p.isSandbox);

    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.envKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.models.some(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.id.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  const configuredCount = Object.values(configuredKeys).filter(Boolean).length;
  const isE2BConfigured = Boolean(configuredKeys.e2b);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          style={{ fontFamily: "'Poppins', sans-serif" }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-[#14151b] border border-white/[0.12] rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08] bg-[#171821]/80 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white">
                <Key className="w-5 h-5 text-white" strokeWidth={2.2} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                    API Keys & AI Providers
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/10 text-white/90 border border-white/15">
                    {configuredCount} Active
                  </span>
                </div>
                <p className="text-xs text-white/50">
                  Configure keys directly inside the app. Automatically saved to <code className="text-white/80 font-mono">.env.local</code>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs & Search */}
          <div className="px-6 py-3 border-b border-white/[0.06] bg-[#15161f] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
              {[
                { id: 'all', label: `All (${SUPPORTED_PROVIDERS.length})` },
                { id: 'unified', label: 'OpenRouter' },
                { id: 'frontier', label: 'OpenAI / Claude / Gemini / xAI' },
                { id: 'open', label: 'DeepSeek / Groq / NVIDIA' },
                { id: 'specialized', label: 'Moonshot / MiniMax / Qwen / Mistral / GLM / Sakana' },
                { id: 'sandbox', label: 'E2B Sandbox' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-56">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search provider or model..."
                className="w-full bg-[#1c1d27] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-all"
              />
            </div>
          </div>

          {/* Sandbox Advisory Banner */}
          {!isE2BConfigured && (
            <div className="mx-6 mt-4 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.1] flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-white/80">
                <Server className="w-4 h-4 text-white flex-shrink-0" />
                <span>
                  <strong>E2B Sandbox API:</strong> Add an E2B key to run live cloud sandboxes with instant Vite previews.
                </span>
              </div>
              <a
                href="https://e2b.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-[11px] flex items-center gap-1 flex-shrink-0 transition-colors"
              >
                <span>Get E2B Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Providers List Container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {filteredProviders.map(provider => {
              const isConfigured = Boolean(configuredKeys[provider.id]);
              const currentInput = keyValues[provider.envKey] || '';
              const isVisible = Boolean(showKeys[provider.id]);

              return (
                <div
                  key={provider.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isConfigured
                      ? 'bg-[#181a24] border-white/[0.16] shadow-sm'
                      : 'bg-[#15161f] border-white/[0.08] hover:border-white/[0.12]'
                  }`}
                >
                  {/* Provider Header */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white tracking-tight">
                          {provider.name}
                        </span>
                        {isConfigured ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-white/15 text-white border border-white/25">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            Configured & Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-white/[0.05] text-white/40 border border-white/[0.08]">
                            Not Configured
                          </span>
                        )}
                        {provider.isSandbox && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-white/80 border border-white/15">
                            Live Execution
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/50 mt-1 max-w-xl">
                        {provider.description}
                      </p>
                    </div>

                    <a
                      href={provider.portalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-white/60 hover:text-white transition-colors flex-shrink-0"
                    >
                      <span>{provider.portalName}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* API Key Input */}
                  <div className="flex items-center gap-2 mt-3">
                    <div className="relative flex-1">
                      <input
                        type={isVisible ? 'text' : 'password'}
                        value={currentInput}
                        onChange={e => handleKeyChange(provider.envKey, e.target.value)}
                        placeholder={isConfigured ? '•••••••••••••••••••••••••••••••• (Key Active in .env.local)' : provider.placeholder}
                        className="w-full bg-[#101117] border border-white/[0.1] rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/40 transition-colors font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowKey(provider.id)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                        title={isVisible ? 'Hide key' : 'Show key'}
                      >
                        {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePaste(provider.envKey)}
                      className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-white/70 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5 flex-shrink-0"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Paste</span>
                    </button>

                    {currentInput && (
                      <button
                        type="button"
                        onClick={() => handleSaveSingle(provider.envKey, currentInput)}
                        disabled={isSaving}
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-white/90 text-black text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95 shadow-sm flex-shrink-0"
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Save</span>
                      </button>
                    )}

                    {isConfigured && !currentInput && (
                      <button
                        type="button"
                        onClick={() => setProviderPendingRemoval(provider)}
                        className="px-2.5 py-2 rounded-xl bg-white/[0.03] hover:bg-red-500/20 hover:text-red-300 border border-white/[0.06] text-white/40 text-xs transition-colors flex-shrink-0 cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Released Models Badges */}
                  {provider.models.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/[0.05]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] text-white/40 font-medium">
                          Unlocked Models ({provider.models.length}):
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {provider.models.map(m => (
                          <span
                            key={m.id}
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] border transition-colors ${
                              isConfigured
                                ? 'bg-white/10 border-white/20 text-white/90'
                                : 'bg-white/[0.03] border-white/[0.06] text-white/40'
                            }`}
                          >
                            <span className="font-medium">{m.name}</span>
                            <span className="text-[9px] font-mono px-1 rounded bg-black/40 text-white/60">
                              {m.tag}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.08] bg-[#171821]/90 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-xs text-white/50">
              <ShieldCheck className="w-4 h-4 text-white/70" />
              <span>Keys stored locally in <code className="text-white/80 font-mono">.env.local</code></span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveAll}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-white hover:bg-white/90 text-black font-semibold text-xs active:scale-95 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving to .env.local...</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                    <span>Saved to Code!</span>
                  </>
                ) : (
                  <>
                    <Key className="w-3.5 h-3.5" />
                    <span>Save All Keys to Code</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* In-App Custom Confirmation Dialog for Removing API Keys */}
        <AnimatePresence>
          {providerPendingRemoval && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !isRemovingKey && setProviderPendingRemoval(null)}
                className="fixed inset-0 bg-black/80 backdrop-blur-md"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 15 }}
                transition={{ duration: 0.2 }}
                style={{ fontFamily: "'Poppins', sans-serif" }}
                className="relative w-full max-w-sm bg-[#161722] border border-white/[0.14] rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] p-6 z-10 flex flex-col overflow-hidden"
              >
                <div className="flex items-start gap-3.5 mb-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center text-red-400 flex-shrink-0">
                    <Key className="w-5 h-5 text-red-400" strokeWidth={2.2} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-tight">
                      Remove {providerPendingRemoval.name} Key?
                    </h3>
                    <p className="text-[11px] text-white/40 mt-0.5">
                      Local configuration change
                    </p>
                  </div>
                </div>

                <p className="text-xs text-white/60 mb-6 leading-relaxed">
                  Are you sure you want to remove your <span className="text-white font-medium">{providerPendingRemoval.name}</span> API key? The {providerPendingRemoval.models.length} associated models will be locked until the key is re-added.
                </p>

                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={isRemovingKey}
                    onClick={() => setProviderPendingRemoval(null)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={isRemovingKey}
                    onClick={async () => {
                      setIsRemovingKey(true);
                      try {
                        const res = await fetch('/api/save-api-keys', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ keys: { [providerPendingRemoval.envKey]: '' } })
                        });
                        const d = await res.json();
                        if (d.success) {
                          setConfiguredKeys(d.availableKeys);
                          if (onKeysSaved) {
                            onKeysSaved(d);
                          }
                        }
                      } catch (err) {
                        console.error('Failed to remove key:', err);
                      } finally {
                        setIsRemovingKey(false);
                        setProviderPendingRemoval(null);
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 hover:text-white text-xs font-medium transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {isRemovingKey ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Removing...</span>
                      </>
                    ) : (
                      <span>Remove Key</span>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}
