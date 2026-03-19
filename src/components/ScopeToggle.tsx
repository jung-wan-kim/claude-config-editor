import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchProjects } from '../lib/claude-fs';
import type { ProjectEntry, Scope } from '../types';

interface ScopeToggleProps {
  scope: Scope;
  onScopeChange: (scope: Scope) => void;
  projectPath: string | null;
  onProjectPathChange: (path: string | null) => void;
}

export function ScopeToggle({ scope, onScopeChange, projectPath, onProjectPathChange }: ScopeToggleProps) {
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    try {
      const result = await fetchProjects();
      setProjects(result.projects);
    } catch {
      setProjects([]);
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    if (scope === 'project' && isDropdownOpen && projects.length === 0) {
      loadProjects();
    }
  }, [scope, isDropdownOpen, projects.length, loadProjects]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleScopeChange = (newScope: Scope) => {
    if (newScope === 'project') {
      setIsDropdownOpen(true);
      if (projects.length === 0) loadProjects();
    } else {
      onScopeChange(newScope);
      onProjectPathChange(null);
      setIsDropdownOpen(false);
    }
  };

  const handleProjectSelect = (entry: ProjectEntry) => {
    onScopeChange('project');
    onProjectPathChange(entry.cwd);
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  const filteredProjects = searchQuery
    ? projects.filter((p) => p.cwd.toLowerCase().includes(searchQuery.toLowerCase()))
    : projects;

  const displayPath = projectPath
    ? projectPath.replace(/^\/Users\/[^/]+/, '~')
    : null;

  return (
    <div className="flex items-center gap-2 relative" ref={dropdownRef}>
      <div
        className="flex items-center gap-1 p-1 rounded-lg"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <button
          onClick={() => handleScopeChange('user')}
          className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
          style={{
            background: scope === 'user' ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
            color: scope === 'user' ? '#93c5fd' : '#64748b',
            border: scope === 'user' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
          }}
        >
          User Scope
        </button>
        <button
          onClick={() => handleScopeChange('project')}
          className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
          style={{
            background: scope === 'project' ? 'rgba(16, 185, 129, 0.3)' : 'transparent',
            color: scope === 'project' ? '#6ee7b7' : '#64748b',
            border: scope === 'project' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
          }}
        >
          Project Scope
        </button>
      </div>

      {/* Project path display + dropdown trigger */}
      {scope === 'project' && (
        <button
          onClick={() => {
            setIsDropdownOpen(!isDropdownOpen);
            if (!isDropdownOpen && projects.length === 0) loadProjects();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all max-w-[500px] group"
          style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            color: '#6ee7b7',
          }}
          title={projectPath ?? 'Select a project'}
        >
          <span className="text-slate-500">&#9660;</span>
          <span className="truncate font-mono">
            {displayPath ?? 'Select project...'}
          </span>
        </button>
      )}

      {/* Dropdown */}
      {isDropdownOpen && (
        <div
          className="absolute top-full left-0 mt-1.5 rounded-xl overflow-hidden shadow-2xl z-50"
          style={{
            background: '#111118',
            border: '1px solid rgba(255,255,255,0.12)',
            width: '420px',
            maxHeight: '360px',
          }}
        >
          {/* Search */}
          <div className="p-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search projects"
              className="w-full px-3 py-1.5 rounded-lg text-xs outline-none font-mono"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#e2e8f0',
              }}
              autoFocus
            />
          </div>

          {/* Project list */}
          <div className="overflow-auto" style={{ maxHeight: '300px' }}>
            {isLoadingProjects && (
              <div className="text-xs text-slate-500 px-4 py-3 animate-pulse">Loading projects...</div>
            )}
            {!isLoadingProjects && filteredProjects.length === 0 && (
              <div className="text-xs text-slate-600 px-4 py-3">No projects found</div>
            )}
            {filteredProjects.map((entry) => {
              const shortPath = entry.cwd.replace(/^\/Users\/[^/]+/, '~');
              const projectName = entry.cwd.split('/').pop() ?? entry.cwd;
              const isSelected = projectPath === entry.cwd;

              return (
                <button
                  key={entry.cwd}
                  onClick={() => handleProjectSelect(entry)}
                  className={`w-full text-left px-4 py-3 text-xs transition-all flex items-center justify-between gap-2 group${!isSelected ? ' hover:bg-white/[0.04]' : ''}`}
                  style={{
                    background: isSelected ? 'rgba(16,185,129,0.15)' : 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <span className="font-medium truncate" style={{ color: isSelected ? '#6ee7b7' : '#e2e8f0' }}>
                      {projectName}
                    </span>
                    <span className="font-mono text-slate-500 truncate text-[10px]">{shortPath}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-slate-600 text-[10px]">
                      {entry.exchangeCount} exchanges
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
