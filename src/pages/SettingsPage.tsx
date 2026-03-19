import { useCallback, useEffect, useState } from 'react';
import { fetchSettings, saveSettings } from '../lib/claude-fs';
import type { Scope, SettingsJson } from '../types';

interface SettingsPageProps {
  scope: Scope;
}

interface EnvEditorProps {
  env: Record<string, string>;
  onChange: (env: Record<string, string>) => void;
}

function EnvEditor({ env, onChange }: EnvEditorProps) {
  const entries = Object.entries(env);

  const handleValueChange = (key: string, value: string) => {
    onChange({ ...env, [key]: value });
  };

  const handleRemove = (key: string) => {
    const next = { ...env };
    delete next[key];
    onChange(next);
  };

  const handleAdd = () => {
    onChange({ ...env, NEW_KEY: '' });
  };

  return (
    <div className="flex flex-col gap-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 w-48 shrink-0 truncate">{key}</span>
          <input
            type="text"
            value={value}
            onChange={(e) => handleValueChange(key, e.target.value)}
            aria-label={`Value for ${key}`}
            className="flex-1 px-2 py-1 rounded text-xs font-mono bg-transparent outline-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#e2e8f0',
            }}
          />
          <button
            onClick={() => handleRemove(key)}
            aria-label={`Remove ${key}`}
            className="text-xs text-slate-600 hover:text-red-400 transition-colors px-1"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={handleAdd}
        className="text-xs text-slate-600 hover:text-slate-400 transition-colors text-left px-1 py-0.5"
      >
        + Add variable
      </button>
    </div>
  );
}

interface PermissionsEditorProps {
  permissions: NonNullable<SettingsJson['permissions']>;
  onChange: (p: NonNullable<SettingsJson['permissions']>) => void;
}

function PermissionsEditor({ permissions, onChange }: PermissionsEditorProps) {
  const [newAllowRule, setNewAllowRule] = useState('');

  const handleAddAllow = () => {
    if (!newAllowRule.trim()) return;
    onChange({ ...permissions, allow: [...(permissions.allow ?? []), newAllowRule.trim()] });
    setNewAllowRule('');
  };

  const handleRemoveAllow = (rule: string) => {
    onChange({ ...permissions, allow: (permissions.allow ?? []).filter((r) => r !== rule) });
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-xs text-slate-500 mb-2">Allow Rules</div>
        <div className="flex flex-col gap-1 max-h-48 overflow-auto">
          {(permissions.allow ?? []).map((rule) => (
            <div key={rule} className="flex items-center gap-2 group">
              <span
                className="flex-1 text-xs font-mono px-2 py-1 rounded"
                style={{ background: 'rgba(16,185,129,0.08)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.15)' }}
              >
                {rule}
              </span>
              <button
                onClick={() => handleRemoveAllow(rule)}
                aria-label={`Remove rule ${rule}`}
                className="text-xs text-transparent group-hover:text-red-500 transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            value={newAllowRule}
            onChange={(e) => setNewAllowRule(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddAllow()}
            placeholder="e.g. Bash(git:*)"
            aria-label="New permission rule"
            className="flex-1 px-2 py-1 rounded text-xs font-mono outline-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#e2e8f0',
            }}
          />
          <button
            onClick={handleAddAllow}
            className="text-xs px-2 py-1 rounded transition-all"
            style={{ background: 'rgba(16,185,129,0.2)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.3)' }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

interface RawJsonEditorProps {
  settings: SettingsJson;
  onApply: (updated: SettingsJson) => void;
}

function RawJsonEditor({ settings, onApply }: RawJsonEditorProps) {
  const [jsonText, setJsonText] = useState(JSON.stringify(settings, null, 2));
  const [jsonError, setJsonError] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleApply = () => {
    try {
      const parsed = JSON.parse(jsonText) as SettingsJson;
      setJsonError('');
      setIsEditing(false);
      onApply(parsed);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  };

  return (
    <section
      className="rounded-xl p-4"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-300">Raw JSON</h3>
        <div className="flex items-center gap-2">
          {jsonError && <span className="text-[10px] text-red-400">{jsonError}</span>}
          {isEditing ? (
            <>
              <button
                onClick={() => { setJsonText(JSON.stringify(settings, null, 2)); setIsEditing(false); setJsonError(''); }}
                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: 'rgba(16,185,129,0.2)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.3)' }}
              >
                Apply & Save
              </button>
            </>
          ) : (
            <button
              onClick={() => { setJsonText(JSON.stringify(settings, null, 2)); setIsEditing(true); }}
              className="px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Edit JSON
            </button>
          )}
        </div>
      </div>
      {isEditing ? (
        <textarea
          value={jsonText}
          onChange={(e) => { setJsonText(e.target.value); setJsonError(''); }}
          className="w-full text-xs font-mono p-3 rounded-lg outline-none resize-y"
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: jsonError ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)',
            color: '#e2e8f0',
            minHeight: '200px',
            maxHeight: '500px',
          }}
          spellCheck={false}
        />
      ) : (
        <pre
          className="text-xs font-mono text-slate-500 overflow-auto max-h-48 p-3 rounded-lg"
          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {JSON.stringify(settings, null, 2)}
        </pre>
      )}
    </section>
  );
}

export function SettingsPage({ scope }: SettingsPageProps) {
  const [settings, setSettings] = useState<SettingsJson | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await fetchSettings(scope);
      setSettings(result.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    setSavedMsg('');
    try {
      await saveSettings(scope, settings);
      setSavedMsg('Saved!');
      setTimeout(() => setSavedMsg(''), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full text-slate-500 text-sm animate-pulse">Loading settings...</div>;
  }

  if (!settings) {
    return <div className="flex items-center justify-center h-full text-red-400 text-sm">{error}</div>;
  }

  return (
    <div className="flex flex-col h-full gap-4 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-base font-semibold text-slate-200">Settings</h2>
        <div className="flex items-center gap-2">
          {savedMsg && <span className="text-xs text-green-400">{savedMsg}</span>}
          {error && <span className="text-xs text-red-400">{error}</span>}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: 'rgba(59,130,246,0.2)',
              color: '#93c5fd',
              border: '1px solid rgba(59,130,246,0.3)',
              opacity: isSaving ? 0.6 : 1,
            }}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Env Section */}
      <section
        className="rounded-xl p-4"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <h3 className="text-sm font-medium text-slate-300 mb-3">Environment Variables</h3>
        <EnvEditor
          env={(settings.env as Record<string, string>) ?? {}}
          onChange={(env) => setSettings({ ...settings, env })}
        />
      </section>

      {/* Permissions Section */}
      <section
        className="rounded-xl p-4"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <h3 className="text-sm font-medium text-slate-300 mb-3">Permissions</h3>
        <PermissionsEditor
          permissions={settings.permissions ?? {}}
          onChange={(permissions) => setSettings({ ...settings, permissions })}
        />
      </section>

      {/* Raw JSON Editor */}
      <RawJsonEditor
        settings={settings}
        onApply={(updated) => { setSettings(updated); handleSave(); }}
      />
    </div>
  );
}
