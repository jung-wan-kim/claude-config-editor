import { useCallback, useEffect, useState } from 'react';
import { FileTree } from './components/FileTree';
import { HooksPage } from './pages/HooksPage';
import { AgentsPage } from './pages/AgentsPage';
import { SkillsPage } from './pages/SkillsPage';
import { RulesPage } from './pages/RulesPage';
import { SettingsPage } from './pages/SettingsPage';
import { fetchFileTree, fetchSettings } from './lib/claude-fs';
import type { FileNode, HooksConfig, Scope } from './types';
import { getCommandName } from './lib/hook-parser';

type PageId = 'hooks' | 'agents' | 'skills' | 'rules' | 'settings';

interface NavItem {
  id: PageId;
  label: string;
  icon: string;
  color: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'hooks', label: 'Hooks', icon: '⚡', color: '#4f8fff' },
  { id: 'agents', label: 'Agents', icon: '◆', color: '#a78bfa' },
  { id: 'skills', label: 'Skills', icon: '✦', color: '#22d3ee' },
  { id: 'rules', label: 'Rules', icon: '▣', color: '#fbbf24' },
  { id: 'settings', label: 'Settings', icon: '⊙', color: '#64748b' },
];

export function App() {
  const [scope, setScope] = useState<Scope>('user');
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<PageId>('hooks');
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [userTree, setUserTree] = useState<FileNode[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [isTreeLoading, setIsTreeLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeHookFiles, setActiveHookFiles] = useState<Set<string>>(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const resolvedProjectPath = scope === 'project' && projectPath ? projectPath : undefined;

  const loadTree = useCallback(async () => {
    setIsTreeLoading(true);
    try {
      const result = await fetchFileTree(scope, resolvedProjectPath);
      setFileTree(result.tree);
      if (scope === 'project') {
        const userResult = await fetchFileTree('user');
        setUserTree(userResult.tree);
      } else {
        setUserTree([]);
      }
      // Extract active hook file names from settings
      try {
        const settingsResult = await fetchSettings(scope, resolvedProjectPath);
        const hooks = (settingsResult.settings.hooks as HooksConfig) ?? {};
        const fileNames = new Set<string>();
        for (const entries of Object.values(hooks)) {
          for (const entry of entries) {
            for (const hook of entry.hooks) {
              fileNames.add(getCommandName(hook.command));
            }
          }
        }
        if (scope === 'project') {
          const userSettings = await fetchSettings('user');
          const userHooks = (userSettings.settings.hooks as HooksConfig) ?? {};
          for (const entries of Object.values(userHooks)) {
            for (const entry of entries) {
              for (const hook of entry.hooks) {
                fileNames.add(getCommandName(hook.command));
              }
            }
          }
        }
        setActiveHookFiles(fileNames);
      } catch {
        setActiveHookFiles(new Set());
      }
    } catch {
      setFileTree([]);
      setUserTree([]);
    } finally {
      setIsTreeLoading(false);
    }
  }, [scope, resolvedProjectPath]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  const filteredTree = search
    ? filterTree(fileTree, search.toLowerCase())
    : fileTree;

  const filteredUserTree = search
    ? filterTree(userTree, search.toLowerCase())
    : userTree;

  const scopePathDisplay = scope === 'user'
    ? '~/.claude/'
    : projectPath
      ? `${projectPath.replace(/^\/Users\/[^/]+/, '~')}/.claude/`
      : './.claude/';

  return (
    <div className="flex flex-col h-screen relative" style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)', zIndex: 1 }}>
      {/* Top Bar */}
      <header
        className="flex items-center justify-between px-5 py-3 shrink-0 relative"
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 100%)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            aria-label="Toggle sidebar"
            className="w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(79,143,255,0.25) 0%, rgba(167,139,250,0.2) 100%)',
              border: '1px solid rgba(79,143,255,0.3)',
              color: '#93bbff',
              boxShadow: '0 0 20px rgba(79,143,255,0.1)',
              flexShrink: 0,
            }}
          >
            {'<>'}
          </button>
          <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Claude Config Editor
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search files"
              className="pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none w-48 font-mono transition-all focus:w-56"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
            <span aria-hidden="true" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-muted)' }}>
              /
            </span>
          </div>
          <div
            className="px-2.5 py-1.5 rounded-lg text-xs font-mono"
            style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
          >
            {scopePathDisplay}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative" style={{ zIndex: 1 }}>
        {/* Left Sidebar */}
        <aside
          className="shrink-0 flex flex-col overflow-hidden transition-all"
          style={{
            width: isSidebarOpen ? '224px' : '0',
            borderRight: isSidebarOpen ? '1px solid var(--border-subtle)' : 'none',
            background: 'rgba(255,255,255,0.008)',
            overflow: isSidebarOpen ? 'hidden' : 'hidden',
            visibility: isSidebarOpen ? 'visible' : 'hidden',
          }}
        >
          {/* Navigation */}
          <nav className="flex flex-col gap-1 p-3 shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            {NAV_ITEMS.map((item, i) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left w-full animate-slide-in"
                  style={{
                    animationDelay: `${i * 30}ms`,
                    background: isActive
                      ? `linear-gradient(135deg, ${item.color}18 0%, ${item.color}08 100%)`
                      : 'transparent',
                    color: isActive ? item.color : 'var(--text-secondary)',
                    border: isActive ? `1px solid ${item.color}25` : '1px solid transparent',
                    boxShadow: isActive ? `0 0 20px ${item.color}08` : 'none',
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[11px]"
                    style={{
                      background: isActive ? `${item.color}20` : 'rgba(255,255,255,0.04)',
                      color: isActive ? item.color : 'var(--text-muted)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {item.icon}
                  </span>
                  <span className="tracking-wide">{item.label}</span>
                  {isActive && (
                    <span
                      className="ml-auto w-1.5 h-1.5 rounded-full"
                      style={{ background: item.color, boxShadow: `0 0 6px ${item.color}` }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* File Tree */}
          <div className="flex-1 overflow-auto p-3">
            {scope === 'project' && filteredTree.length > 0 && (
              <>
                <div className="text-[10px] uppercase tracking-widest px-2 py-1.5 font-semibold" style={{ color: '#34d399' }}>
                  Project
                </div>
                <FileTree
                  tree={filteredTree}
                  onFileSelect={setSelectedFilePath}
                  selectedPath={selectedFilePath}
                  isLoading={isTreeLoading}
                  activeFiles={activeHookFiles}
                />
                <div className="my-2" style={{ borderTop: '1px solid var(--border-subtle)' }} />
              </>
            )}
            <div className="text-[10px] uppercase tracking-widest px-2 py-1.5 font-semibold" style={{ color: 'var(--text-muted)' }}>
              {scope === 'project' ? 'User Scope' : 'Explorer'}
            </div>
            <FileTree
              tree={scope === 'project' ? filteredUserTree : filteredTree}
              onFileSelect={setSelectedFilePath}
              selectedPath={selectedFilePath}
              isLoading={isTreeLoading}
              activeFiles={activeHookFiles}
            />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden p-4">
          <div className="animate-fade-in h-full">
            {activePage === 'hooks' && <HooksPage scope={scope} projectPath={projectPath} onScopeChange={setScope} onProjectPathChange={setProjectPath} />}
            {activePage === 'agents' && <AgentsPage scope={scope} />}
            {activePage === 'skills' && <SkillsPage scope={scope} />}
            {activePage === 'rules' && <RulesPage scope={scope} />}
            {activePage === 'settings' && <SettingsPage scope={scope} />}
          </div>
        </main>
      </div>
    </div>
  );
}

function filterTree(nodes: FileNode[], query: string): FileNode[] {
  const result: FileNode[] = [];
  for (const node of nodes) {
    if (node.type === 'directory' && node.children) {
      const filtered = filterTree(node.children, query);
      if (filtered.length > 0) {
        result.push({ ...node, children: filtered });
      }
    } else if (node.name.toLowerCase().includes(query)) {
      result.push(node);
    }
  }
  return result;
}
