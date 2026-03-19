import { useCallback, useEffect, useState } from 'react';
import { HookFlowCanvas } from '../components/HookFlowCanvas';
import { PipelinePalette } from '../components/PipelinePalette';
import { ScopeToggle } from '../components/ScopeToggle';
import { MarkdownEditor } from '../components/MarkdownEditor';
import { DiffPreview } from '../components/DiffPreview';
import { fetchSettings, saveSettings, fetchFile, saveFile, fetchDiff, fetchPipelineItems } from '../lib/claude-fs';
import { parseHooksToCards, cardsToHooksConfig } from '../lib/hook-parser';
import type { HookCard, HooksConfig, PipelineItem, Scope, SettingsJson } from '../types';

interface HooksPageProps {
  scope: Scope;
  projectPath?: string | null;
  onScopeChange: (scope: Scope) => void;
  onProjectPathChange: (path: string | null) => void;
}

export function HooksPage({ scope, projectPath, onScopeChange, onProjectPathChange }: HooksPageProps) {
  const [cards, setCards] = useState<HookCard[]>([]);
  const [savedCards, setSavedCards] = useState<HookCard[]>([]);
  const [settings, setSettings] = useState<SettingsJson | null>(null);
  const [settingsPath, setSettingsPath] = useState('');
  const [selectedCard, setSelectedCard] = useState<HookCard | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [editorFilePath, setEditorFilePath] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingHooks, setIsSavingHooks] = useState(false);
  const [diffContent, setDiffContent] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [pipelineItems, setPipelineItems] = useState<PipelineItem[]>([]);
  const [isPaletteLoading, setIsPaletteLoading] = useState(false);
  const [showPalette, setShowPalette] = useState(true);

  const resolvedProjectPath = scope === 'project' && projectPath ? projectPath : undefined;

  const hasChanges = JSON.stringify(cards) !== JSON.stringify(savedCards);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await fetchSettings(scope, resolvedProjectPath);
      setSettings(result.settings);
      setSettingsPath(result.path);
      const hooksConfig = (result.settings.hooks as HooksConfig) ?? {};
      const projectCards = parseHooksToCards(hooksConfig).map((c) => ({
        ...c,
        scopeSource: scope as 'user' | 'project',
      }));

      if (scope === 'project') {
        try {
          const userResult = await fetchSettings('user');
          const userHooksConfig = (userResult.settings.hooks as HooksConfig) ?? {};
          const userCards = parseHooksToCards(userHooksConfig).map((c) => ({
            ...c,
            id: `user-${c.id}`,
            scopeSource: 'user' as const,
          }));
          const merged = [...projectCards, ...userCards];
          setCards(merged);
          setSavedCards(merged);
        } catch {
          setCards(projectCards);
          setSavedCards(projectCards);
        }
      } else {
        setCards(projectCards);
        setSavedCards(projectCards);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, [scope, resolvedProjectPath]);

  const loadPipelineItems = useCallback(async () => {
    setIsPaletteLoading(true);
    try {
      const result = await fetchPipelineItems(scope, resolvedProjectPath);
      setPipelineItems(result.items);
    } catch {
      setPipelineItems([]);
    } finally {
      setIsPaletteLoading(false);
    }
  }, [scope, resolvedProjectPath]);

  useEffect(() => {
    loadSettings();
    loadPipelineItems();
  }, [loadSettings, loadPipelineItems]);

  const handleCardsChange = (newCards: HookCard[]) => {
    setCards(newCards);
  };

  const handleCancelChanges = () => {
    setCards(savedCards);
  };

  const handleCardClick = async (card: HookCard) => {
    setSelectedCard(card);
    let commandPath = card.command;
    if (
      commandPath.startsWith('[agent] ') ||
      commandPath.startsWith('[skill] ') ||
      commandPath.startsWith('[command] ')
    ) {
      commandPath = commandPath.replace(/^\[(agent|skill|command)\]\s*/, '');
    }
    try {
      const result = await fetchFile(commandPath);
      setEditorContent(result.content);
      setEditorFilePath(result.path);
    } catch {
      setEditorContent(`# ${card.command}\n\nFile not found or not readable.`);
      setEditorFilePath(card.command);
    }
    setShowDiff(false);
  };

  const handleSaveHooks = async () => {
    if (!settings) return;
    setIsSavingHooks(true);
    try {
      // Only save cards that belong to the current scope (exclude user scope cards when saving project)
      const cardsToSave = scope === 'project'
        ? cards.filter((c) => c.scopeSource !== 'user')
        : cards;
      const newHooksConfig = cardsToHooksConfig(cardsToSave);
      const newSettings = { ...settings, hooks: newHooksConfig };
      await saveSettings(scope, newSettings, resolvedProjectPath);
      setSettings(newSettings);
      setSavedCards(cards);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save hooks');
    } finally {
      setIsSavingHooks(false);
    }
  };

  const handleSaveFile = async () => {
    if (!editorFilePath) return;
    setIsSaving(true);
    try {
      await saveFile(editorFilePath, editorContent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save file');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShowDiff = async () => {
    if (!settingsPath) return;
    try {
      const result = await fetchDiff(settingsPath);
      setDiffContent(result.diff);
      setShowDiff(true);
    } catch {
      setDiffContent('');
      setShowDiff(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-slate-500 animate-pulse">Loading hooks...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-200">Hook Pipeline</h2>
            <p className="text-xs text-slate-500 mt-0.5">{settingsPath}</p>
          </div>
          <div style={{ width: '1px', height: '28px', background: 'var(--border-subtle)' }} />
          <ScopeToggle
            scope={scope}
            onScopeChange={onScopeChange}
            projectPath={projectPath ?? null}
            onProjectPathChange={onProjectPathChange}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPalette(!showPalette)}
            className="px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{
              background: showPalette ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.06)',
              color: showPalette ? '#c4b5fd' : '#94a3b8',
              border: showPalette
                ? '1px solid rgba(168,85,247,0.3)'
                : '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {showPalette ? 'Hide Palette' : 'Show Palette'}
          </button>
          <button
            onClick={handleShowDiff}
            className="px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            Diff Preview
          </button>

        </div>
      </div>

      {error && (
        <div
          className="text-xs text-red-400 px-3 py-2 rounded-lg"
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}
        >
          {error}
        </div>
      )}

      {/* Canvas + Palette */}
      <div className="flex-1 overflow-auto min-h-0 flex gap-3">
        {/* Hook Flow Canvas */}
        <div
          className="flex-1 rounded-xl p-3 overflow-auto"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <HookFlowCanvas
            cards={cards}
            onCardsChange={handleCardsChange}
            onCardClick={handleCardClick}
            pipelineItems={pipelineItems}
            scope={scope}
            projectPath={projectPath}
          />

          {/* Save / Cancel bar — inside canvas, below pipeline */}
          {hasChanges && (
            <div
              className="flex items-center justify-end gap-2 mt-3 px-3 py-2.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <span className="text-xs mr-auto" style={{ color: '#fbbf24' }}>Unsaved changes</span>
              <button
                onClick={handleCancelChanges}
                className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveHooks}
                disabled={isSavingHooks}
                className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: 'rgba(16,185,129,0.2)',
                  color: '#6ee7b7',
                  border: '1px solid rgba(16,185,129,0.3)',
                  opacity: isSavingHooks ? 0.6 : 1,
                }}
              >
                {isSavingHooks ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        {/* Pipeline Palette (right side) */}
        {showPalette && (
          <div
            className="rounded-xl p-3 overflow-auto shrink-0"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              width: '200px',
            }}
          >
            <PipelinePalette items={pipelineItems} isLoading={isPaletteLoading} />
          </div>
        )}
      </div>

      {/* Editor / Diff Panel */}
      {(selectedCard || showDiff) && (
        <div
          className="shrink-0 rounded-xl overflow-hidden"
          style={{
            height: '280px',
            background: '#0d0d18',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {showDiff ? (
            <DiffPreview diff={diffContent} onClose={() => setShowDiff(false)} />
          ) : editorFilePath ? (
            <MarkdownEditor
              key={editorFilePath}
              content={editorContent}
              filePath={editorFilePath}
              onChange={setEditorContent}
              onSave={handleSaveFile}
              isSaving={isSaving}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
