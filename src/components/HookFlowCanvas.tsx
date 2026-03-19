import { useState } from 'react';
import type { HookCard, HookType, PipelineItem } from '../types';
import { HOOK_TYPES, HOOK_TYPE_COLORS, HOOK_TYPE_BG, getCommandName } from '../lib/hook-parser';
import { ITEM_TYPE_COLORS, ITEM_TYPE_BG, ITEM_TYPE_ICONS } from './PipelinePalette';

/* ── Helpers ── */

function parsePipelineType(command: string): 'agent' | 'skill' | 'command' | null {
  if (command.startsWith('[agent]')) return 'agent';
  if (command.startsWith('[skill]')) return 'skill';
  if (command.startsWith('[command]')) return 'command';
  return null;
}

function getHookIcon(command: string, matcher?: string): string {
  const pipelineType = parsePipelineType(command);
  if (pipelineType) return ITEM_TYPE_ICONS[pipelineType];

  // Matcher-based icon for regular hook scripts
  if (matcher) {
    if (/Edit|Write/i.test(matcher)) return '✏';
    if (/Bash|shell/i.test(matcher)) return '>';
    if (/Agent/i.test(matcher)) return 'A';
    if (/Read/i.test(matcher)) return '≡';
  }
  return '⚡';
}

/* ── Drag data types ── */

type DragSource =
  | { kind: 'card'; cardId: string }
  | { kind: 'palette'; item: PipelineItem };

function encodeDragData(src: DragSource): string {
  return JSON.stringify(src);
}

function decodeDragData(raw: string): DragSource | null {
  try {
    return JSON.parse(raw) as DragSource;
  } catch {
    return null;
  }
}

const DRAG_DATA_KEY = 'application/cc-sync';

/* ── Pipeline Card ── */

interface PipelineCardProps {
  card: HookCard;
  isDragging: boolean;
  onClick: (card: HookCard) => void;
  onRemove: (cardId: string) => void;
  onDragStart: (e: React.DragEvent, card: HookCard) => void;
  onDragEnd: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

function PipelineCard({ card, isDragging, onClick, onRemove, onDragStart, onDragEnd, onDragOver, onDrop }: PipelineCardProps) {
  const color = HOOK_TYPE_COLORS[card.hookType];
  const bg = HOOK_TYPE_BG[card.hookType];
  const name = getCommandName(card.command);
  const pipelineType = parsePipelineType(card.command);
  const displayColor = pipelineType ? ITEM_TYPE_COLORS[pipelineType] : color;
  const displayBg = pipelineType ? ITEM_TYPE_BG[pipelineType] : bg;
  const icon = getHookIcon(card.command, card.matcher);
  const isUserScope = card.scopeSource === 'user';
  const showMatcher = card.matcher && card.matcher !== '*';

  return (
    <div
      draggable
      role="button"
      aria-label={name}
      tabIndex={0}
      onDragStart={(e) => onDragStart(e, card)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(e); }}
      onDrop={(e) => { onDrop?.(e); }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(card);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(card);
        }
      }}
      className="group flex-shrink-0 px-3 py-2.5 rounded-lg cursor-grab transition-all select-none"
      style={{
        background: displayBg,
        border: isUserScope
          ? `1px dashed ${displayColor}35`
          : `1px solid ${displayColor}40`,
        opacity: isDragging ? 0.3 : isUserScope ? 0.7 : 1,
        minWidth: '120px',
        maxWidth: '190px',
      }}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold shrink-0"
          style={{
            background: `${displayColor}25`,
            color: displayColor,
            border: `1px solid ${displayColor}40`,
          }}
        >
          {icon}
        </span>
        <div className="text-sm font-medium truncate flex-1" style={{ color: displayColor }}>
          {name}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(card.id); }}
          aria-label={`Remove ${name}`}
          className="w-5 h-5 -m-1 p-1 rounded-full flex items-center justify-center text-[10px] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/30"
          style={{ color: '#f87171' }}
          title="Remove from pipeline"
        >
          ×
        </button>
      </div>
      {showMatcher && (
        <div className="text-xs text-slate-500 truncate mt-0.5">{card.matcher}</div>
      )}
    </div>
  );
}

/* ── Drop Lane ── */

interface DropLaneProps {
  laneId: string;
  hookType: HookType;
  cards: HookCard[];
  isOver: boolean;
  draggingCardId: string | null;
  onCardClick: (card: HookCard) => void;
  onRemoveCard: (cardId: string) => void;
  onDragStartCard: (e: React.DragEvent, card: HookCard) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, laneId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, hookType: HookType) => void;
}

function DropLane({
  laneId,
  hookType,
  cards,
  isOver,
  draggingCardId,
  onCardClick,
  onRemoveCard,
  onDragStartCard,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: DropLaneProps) {
  const color = HOOK_TYPE_COLORS[hookType];

  return (
    <div
      data-lane-id={laneId}
      className="flex items-center gap-2 overflow-x-auto flex-1 py-2 px-3 rounded-lg transition-all"
      style={{
        minHeight: '52px',
        background: isOver ? `${color}0a` : 'rgba(255,255,255,0.015)',
        border: isOver ? `2px dashed ${color}55` : '1px solid rgba(255,255,255,0.04)',
      }}
      onDragOver={(e) => onDragOver(e, laneId)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, hookType)}
    >
      {cards.map((card) => (
        <PipelineCard
          key={card.id}
          card={card}
          isDragging={draggingCardId === card.id}
          onClick={onCardClick}
          onRemove={onRemoveCard}
          onDragStart={onDragStartCard}
          onDragEnd={onDragEnd}
          onDragOver={(e) => onDragOver(e, laneId)}
          onDrop={(e) => onDrop(e, hookType)}
        />
      ))}
      {cards.length === 0 && (
        <span className="text-[10px] italic px-1" style={{ color: '#4a5568' }}>
          {isOver ? 'Drop here' : 'No hooks'}
        </span>
      )}
    </div>
  );
}

/* ── Main Canvas ── */

interface HookFlowCanvasProps {
  cards: HookCard[];
  onCardsChange: (cards: HookCard[]) => void;
  onCardClick: (card: HookCard) => void;
  pipelineItems?: PipelineItem[];
  scope?: 'user' | 'project';
  projectPath?: string | null;
}

export function HookFlowCanvas({
  cards,
  onCardsChange,
  onCardClick,
  scope,
  projectPath,
}: HookFlowCanvasProps) {
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [overLaneId, setOverLaneId] = useState<string | null>(null);

  function handleDragStartCard(e: React.DragEvent, card: HookCard) {
    const data: DragSource = { kind: 'card', cardId: card.id };
    e.dataTransfer.setData(DRAG_DATA_KEY, encodeDragData(data));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingCardId(card.id);
  }

  function handleDragEnd() {
    setDraggingCardId(null);
    setOverLaneId(null);
  }

  function handleDragOver(e: React.DragEvent, laneId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setOverLaneId(laneId);
  }

  function handleDragLeave() {
    setOverLaneId(null);
  }

  function handleDrop(e: React.DragEvent, targetType: HookType) {
    e.preventDefault();
    e.stopPropagation();
    setOverLaneId(null);
    setDraggingCardId(null);

    const raw = e.dataTransfer.getData(DRAG_DATA_KEY);
    if (!raw) return;
    const src = decodeDragData(raw);
    if (!src) return;

    if (src.kind === 'palette') {
      const item = src.item;
      const newCard: HookCard = {
        id: `${item.itemType}-${item.name}-${Date.now()}`,
        hookType: targetType,
        matcher: '*',
        command: `[${item.itemType}] ${item.filePath}`,
        entryIndex: 0,
        hookIndex: cards.filter((c) => c.hookType === targetType).length,
        isActive: true,
      };
      onCardsChange([...cards, newCard]);
      return;
    }

    if (src.kind === 'card') {
      const draggedCard = cards.find((c) => c.id === src.cardId);
      if (!draggedCard) return;

      if (draggedCard.hookType !== targetType) {
        // Move to different lane
        onCardsChange(
          cards.map((c) => (c.id === src.cardId ? { ...c, hookType: targetType } : c))
        );
      }
    }
  }

  const isProjectScope = scope === 'project';
  const projectCards = cards.filter((c) => c.scopeSource !== 'user');
  const userCards = cards.filter((c) => c.scopeSource === 'user');

  const projectByType = HOOK_TYPES.reduce<Record<HookType, HookCard[]>>((acc, type) => {
    acc[type] = projectCards.filter((c) => c.hookType === type);
    return acc;
  }, {} as Record<HookType, HookCard[]>);

  const userByType = HOOK_TYPES.reduce<Record<HookType, HookCard[]>>((acc, type) => {
    acc[type] = userCards.filter((c) => c.hookType === type);
    return acc;
  }, {} as Record<HookType, HookCard[]>);

  const shortProjectPath = projectPath
    ? projectPath.replace(/^\/Users\/[^/]+/, '~')
    : '';

  function handleRemoveCard(cardId: string) {
    onCardsChange(cards.filter((c) => c.id !== cardId));
  }

  const commonLaneProps = {
    draggingCardId,
    onCardClick,
    onRemoveCard: handleRemoveCard,
    onDragStartCard: handleDragStartCard,
    onDragEnd: handleDragEnd,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  };

  return (
    <div className="flex flex-col gap-1">
      {isProjectScope ? (
        <div className="flex flex-col">
          {/* Table Header */}
          <div
            className="grid gap-3 px-3 py-3 rounded-t-xl"
            style={{
              gridTemplateColumns: '130px 1fr 1fr',
              background: 'rgba(255,255,255,0.03)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div
              className="text-[10px] uppercase tracking-widest font-semibold"
              style={{ color: 'var(--text-muted)' }}
            >
              Pipeline
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#4f8fff' }} />
              <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#93bbff' }}>
                User
              </span>
              <span className="text-[9px] font-mono" style={{ color: '#4a5568' }}>
                ~/.claude/
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#34d399' }} />
              <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#6ee7b7' }}>
                Project
              </span>
              <span className="text-[9px] font-mono" style={{ color: '#4a5568' }}>
                {shortProjectPath}
              </span>
            </div>
          </div>

          {HOOK_TYPES.map((type) => {
            const color = HOOK_TYPE_COLORS[type];
            const uCards = userByType[type];
            const pCards = projectByType[type];
            const userLaneId = `lane-user-${type}`;
            const projectLaneId = `lane-project-${type}`;
            return (
              <div
                key={type}
                className="grid gap-3 px-3 py-3 items-center"
                style={{
                  gridTemplateColumns: '130px 1fr 1fr',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <div
                  className="text-[11px] font-semibold font-mono px-2.5 py-2 rounded-lg tracking-wide text-center"
                  style={{
                    color,
                    background: `${color}12`,
                    border: `1px solid ${color}20`,
                  }}
                >
                  {type}
                </div>

                <DropLane
                  laneId={userLaneId}
                  hookType={type}
                  cards={uCards}
                  isOver={overLaneId === userLaneId}
                  {...commonLaneProps}
                />

                <DropLane
                  laneId={projectLaneId}
                  hookType={type}
                  cards={pCards}
                  isOver={overLaneId === projectLaneId}
                  {...commonLaneProps}
                />
              </div>
            );
          })}
        </div>
      ) : (
        HOOK_TYPES.map((type) => {
          const color = HOOK_TYPE_COLORS[type];
          const typeCards = cards.filter((c) => c.hookType === type);
          const laneId = `lane-${type}`;
          return (
            <div
              key={type}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                className="flex-shrink-0 text-[11px] font-semibold font-mono px-2.5 py-2 rounded-lg tracking-wide text-center"
                style={{
                  color,
                  background: `${color}12`,
                  border: `1px solid ${color}20`,
                  minWidth: '130px',
                }}
              >
                {type}
              </div>
              <div className="flex-shrink-0" style={{ color: `${color}40` }}>
                &#x2192;
              </div>
              <DropLane
                laneId={laneId}
                hookType={type}
                cards={typeCards}
                isOver={overLaneId === laneId}
                {...commonLaneProps}
              />
            </div>
          );
        })
      )}
    </div>
  );
}
