# Claude Config Editor

A visual web GUI tool for editing Claude Code configuration files (`~/.claude/`).
Manage Hooks, Agents, Skills, Rules, and Settings through an intuitive interface.

[한국어](./README-kr.md)

![Claude Config Editor Demo](./config-editor.gif)

## Screenshots

### Hooks Pipeline Editor
Drag & drop hook cards with dual scope (User / Project). 8 hook types with color-coded cards.

![Hooks Pipeline](./docs/hooks-pipeline.png)

### Settings Management
Edit environment variables, permissions, and raw JSON with visual UI.

![Settings Page](./docs/settings-page.png)

## Features

- **Hooks Pipeline Editor** — Drag & drop hook cards, supports 8 hook types
- **Agents Management** — Agent categorization (Orchestrator/Specialist/Utility), workflow diagrams
- **Skills Management** — Skill file grouping with markdown editing
- **Rules Management** — Rule file editing
- **Settings Management** — Edit settings.json and manage environment variables
- **Dual Scope** — Switch between User (`~/.claude/`) and Project (`{path}/.claude/`)

## Prerequisites

### memory-bank Plugin (Required)

The **[memory-bank](https://github.com/jung-wan-kim/memory-bank)** plugin must be installed to retrieve the project list.
Config Editor reads project metadata from memory-bank's SQLite DB (`~/.config/superpowers/conversation-index/db.sqlite`).

Without memory-bank, the project list cannot be loaded when switching to Project scope.

```bash
# Install memory-bank plugin in Claude Code
/plugin marketplace add https://github.com/jung-wan-kim/memory-bank
/plugin install memory-bank

# Sync conversations (run at least once)
memory-bank sync
```

### Other Requirements

- Node.js 18+
- npm
- sqlite3 CLI (included by default on macOS)

## Installation

### Option 1: Install as Claude Code Plugin (Recommended)

```bash
# Install plugin
/plugin marketplace add https://github.com/jung-wan-kim/claude-config-editor
/plugin install claude-config-editor

# Run (in a Claude Code session)
/config-editor
```

### Option 2: Manual Installation

```bash
# Clone repository
git clone https://github.com/jung-wan-kim/claude-config-editor.git
cd claude-config-editor

# Install dependencies
npm install

# Start (frontend + backend together)
npm start
```

This runs both the Vite dev server and the backend API server concurrently.
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3850`

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite 8 + Tailwind CSS 4
- **Backend**: Node.js HTTP Server (filesystem access)
- **Editor**: CodeMirror 6 (Markdown/JS highlighting)
- **Drag & Drop**: dnd-kit

## Development Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start frontend + backend together |
| `npm run dev` | Vite dev server only |
| `npm run server` | Backend server only (port 3850) |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm run typecheck` | TypeScript type check |
| `npm run preview` | Preview production build |

## License

MIT
