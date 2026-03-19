# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Config Editor는 Claude Code의 설정 파일(`~/.claude/`)을 시각적으로 편집하는 웹 GUI 도구. Hooks 파이프라인, Agents, Skills, Rules, Settings를 관리한다.

## Commands

```bash
npm run dev        # Vite 개발 서버 (프론트엔드)
npm run server     # Node.js 백엔드 서버 (포트 3850, 별도 터미널 필요)
npm run build      # tsc -b + vite build → dist/
npm run lint       # ESLint
npm run typecheck  # TypeScript 타입 체크만
npm run preview    # 빌드 결과 로컬 미리보기
```

개발 시 프론트엔드(`npm run dev`)와 백엔드(`npm run server`)를 **동시에** 실행해야 한다.

## Architecture

### 프론트엔드-백엔드 분리

- **프론트엔드**: React 19 + TypeScript + Vite. `src/` 디렉토리
- **백엔드**: `src/api/fs-server.ts` — Node.js HTTP 서버 (포트 3850). 파일 시스템 접근을 담당
- **프록시**: Vite dev server가 `/api` 요청을 `localhost:3850`으로 프록시

### 이원 스코프 시스템

모든 파일 작업에 두 가지 스코프가 존재:
- **User Scope**: `~/.claude/` (전역 설정)
- **Project Scope**: `{projectPath}/.claude/` (프로젝트별 설정)

`ScopeToggle` 컴포넌트로 전환하며, API 호출 시 `scope` 파라미터로 구분.

### 핵심 레이어

```
pages/          → 탭별 페이지 (Hooks, Agents, Skills, Rules, Settings)
components/     → 재사용 UI (FileTree, MarkdownEditor, HookFlowCanvas, DiffPreview)
lib/claude-fs.ts → API 클라이언트 (모든 백엔드 통신)
lib/hook-parser.ts → HooksConfig ↔ HookCard[] 변환
types/index.ts  → 공유 타입 정의
api/fs-server.ts → 파일 시스템 백엔드
```

### 주요 기술 선택

- **에디터**: CodeMirror 6 (마크다운/JS 하이라이팅, One Dark 테마)
- **드래그 앤 드롭**: dnd-kit (Hook 카드 정렬)
- **스타일링**: Tailwind CSS 4 + CSS 커스텀 속성 (다크 테마 색상 시스템은 `index.css`에 정의)

### API 엔드포인트 (fs-server.ts)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/tree` | 파일 트리 (scope, projectPath 파라미터) |
| GET/PUT | `/api/file` | 파일 읽기/저장 |
| GET/PUT | `/api/settings` | settings.json CRUD |
| GET | `/api/hooks/available` | 사용 가능 훅 목록 |
| GET | `/api/pipeline-items` | 에이전트/스킬/명령 목록 |
| GET | `/api/projects` | 프로젝트 목록 |
| GET | `/api/diff` | Diff 미리보기 |

백엔드는 `ALLOWED_TOP_DIRS`로 접근 디렉토리를 제한 (agents, skills, hooks, commands, scripts, rules).

### Hook 시스템

`hook-parser.ts`가 Claude의 hooks 설정(JSON)과 UI용 HookCard 배열 간 변환을 담당. 8가지 Hook 타입 각각 고유 색상이 지정되어 있다:
- PreToolUse(파랑), PostToolUse(초록), UserPromptSubmit(보라), Stop(빨강), SubagentStop(주황), TaskCompleted(시안), Notification(회색), PreCompact(노랑)

### 상태 관리

외부 상태 라이브러리 없이 React useState + props 전달. 각 페이지가 독립적으로 파일 목록과 선택 상태를 관리.
