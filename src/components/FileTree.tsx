import { useState } from 'react';
import type { FileNode } from '../types';

const DRAG_DATA_KEY = 'application/cc-sync';

function getFileIcon(parentDir: string, fileName: string): { icon: string; color: string } {
  const ext = fileName.split('.').pop() ?? '';
  if (parentDir === 'agents') return { icon: '🤖', color: '#a78bfa' };
  if (parentDir === 'skills') return { icon: '🎯', color: '#22d3ee' };
  if (parentDir === 'commands') return { icon: '⌘', color: '#fbbf24' };
  if (parentDir === 'hooks' || ext === 'sh') return { icon: '⚡', color: '#4f8fff' };
  if (parentDir === 'scripts') return { icon: '▶', color: '#fb7185' };
  if (parentDir === 'rules') return { icon: '📋', color: '#f59e0b' };
  if (ext === 'json') return { icon: '{}', color: '#64748b' };
  return { icon: '📄', color: '#64748b' };
}

function getItemTypeFromDir(parentDir: string): 'agent' | 'skill' | 'command' | 'hook' {
  if (parentDir === 'agents') return 'agent';
  if (parentDir === 'skills') return 'skill';
  if (parentDir === 'commands') return 'command';
  return 'hook';
}

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
  onFileSelect: (path: string) => void;
  selectedPath: string | null;
  activeFiles?: Set<string>;
}

function FileTreeNode({
  node,
  depth,
  onFileSelect,
  selectedPath,
  activeFiles,
}: FileTreeNodeProps) {
  const [isOpen, setIsOpen] = useState(depth < 1);
  const isSelected = selectedPath === node.path;

  const paddingLeft = depth * 12 + 8;

  if (node.type === 'directory') {
    return (
      <div>
        <button
          className="w-full flex items-center gap-1.5 py-2 px-1 text-xs hover:bg-white/5 transition-colors rounded-lg"
          style={{ paddingLeft }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="text-slate-500 text-xs w-3">{isOpen ? '▾' : '▸'}</span>
          <span className="text-slate-400">{node.name}</span>
        </button>
        {isOpen &&
          node.children?.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onFileSelect={onFileSelect}
              selectedPath={selectedPath}
              activeFiles={activeFiles}
            />
          ))}
      </div>
    );
  }

  const parentDir = node.path.split('/')[0] ?? '';
  const { icon, color } = getFileIcon(parentDir, node.name);
  const isActive = activeFiles?.has(node.name) ?? false;
  const itemType = getItemTypeFromDir(parentDir);

  function handleDragStart(e: React.DragEvent) {
    const dragData = JSON.stringify({
      kind: 'palette',
      item: {
        id: node.path,
        itemType,
        name: node.name.replace(/\.(md|sh|json)$/, ''),
        filePath: node.path,
      },
    });
    e.dataTransfer.setData(DRAG_DATA_KEY, dragData);
    e.dataTransfer.effectAllowed = 'copyMove';
  }

  return (
    <button
      draggable
      onDragStart={handleDragStart}
      className={`w-full flex items-center gap-1.5 py-2 px-1 text-xs transition-colors rounded-lg cursor-grab${!isSelected ? ' hover:bg-white/[0.04]' : ''}`}
      style={{
        paddingLeft,
        background: isSelected ? `${color}20` : isActive ? `${color}08` : 'transparent',
        color: isSelected ? color : isActive ? color : '#94a3b8',
      }}
      onClick={() => onFileSelect(node.path)}
    >
      <span className="w-4 text-center text-[11px] shrink-0">{icon}</span>
      <span className="truncate">{node.name}</span>
    </button>
  );
}

interface FileTreeProps {
  tree: FileNode[];
  onFileSelect: (path: string) => void;
  selectedPath: string | null;
  isLoading: boolean;
  activeFiles?: Set<string>;
}

export function FileTree({
  tree,
  onFileSelect,
  selectedPath,
  isLoading,
  activeFiles,
}: FileTreeProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-20">
        <div className="text-xs text-slate-500 animate-pulse">Loading...</div>
      </div>
    );
  }

  if (tree.length === 0) {
    return <div className="text-xs text-slate-600 p-3 text-center">No files found</div>;
  }

  return (
    <div className="py-1">
      {tree.map((node) => (
        <FileTreeNode
          key={node.path}
          node={node}
          depth={0}
          onFileSelect={onFileSelect}
          selectedPath={selectedPath}
          activeFiles={activeFiles}
        />
      ))}
    </div>
  );
}
