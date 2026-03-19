import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFileSync, execSync } from 'child_process';

const PORT = 3850;
const USER_CLAUDE_DIR = path.join(os.homedir(), '.claude');

function getBaseDir(scope: string, projectPath?: string): string {
  if (scope === 'project' && projectPath) {
    return path.join(projectPath, '.claude');
  }
  return USER_CLAUDE_DIR;
}

const ALLOWED_TOP_DIRS = new Set(['agents', 'skills', 'hooks', 'commands', 'scripts', 'rules']);

function buildFileTree(dirPath: string, relativeTo: string, depth = 0): FileNode[] {
  const result: FileNode[] = [];
  if (!fs.existsSync(dirPath)) return result;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.claude') continue;
    const fullPath = path.join(dirPath, entry.name);
    const relPath = path.relative(relativeTo, fullPath);
    if (depth === 0 && entry.isDirectory() && !ALLOWED_TOP_DIRS.has(entry.name)) continue;
    if (entry.isDirectory()) {
      result.push({
        name: entry.name,
        path: relPath,
        type: 'directory',
        children: buildFileTree(fullPath, relativeTo, depth + 1),
      });
    } else {
      if (depth === 0) continue;
      result.push({
        name: entry.name,
        path: relPath,
        type: 'file',
      });
    }
  }
  return result.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

function parseQuery(url: string): Record<string, string> {
  const qIndex = url.indexOf('?');
  if (qIndex === -1) return {};
  const query: Record<string, string> = {};
  const params = url.slice(qIndex + 1).split('&');
  for (const param of params) {
    const [k, v] = param.split('=');
    if (k) query[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
  }
  return query;
}

function getPathname(url: string): string {
  const qIndex = url.indexOf('?');
  return qIndex === -1 ? url : url.slice(0, qIndex);
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => (body += chunk.toString()));
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function setCors(res: http.ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res: http.ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function sendError(res: http.ServerResponse, msg: string, status = 500): void {
  sendJson(res, { error: msg }, status);
}

const server = http.createServer(async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url ?? '/';
  const pathname = getPathname(url);
  const query = parseQuery(url);

  try {
    // GET /api/tree
    if (req.method === 'GET' && pathname === '/api/tree') {
      const scope = query.scope ?? 'user';
      const projectPath = query.projectPath;
      const baseDir = getBaseDir(scope, projectPath);
      const tree = buildFileTree(baseDir, baseDir);
      sendJson(res, { baseDir, tree });
      return;
    }

    // GET /api/file
    if (req.method === 'GET' && pathname === '/api/file') {
      const filePath = query.path;
      if (!filePath) {
        sendError(res, 'path is required', 400);
        return;
      }
      const fullPath = filePath.startsWith('~')
        ? path.join(os.homedir(), filePath.slice(1))
        : filePath.startsWith('/') ? filePath : path.join(USER_CLAUDE_DIR, filePath);
      if (!fs.existsSync(fullPath)) {
        sendError(res, 'File not found', 404);
        return;
      }
      const content = fs.readFileSync(fullPath, 'utf-8');
      sendJson(res, { path: fullPath, content });
      return;
    }

    // PUT /api/file
    if (req.method === 'PUT' && pathname === '/api/file') {
      const body = await readBody(req);
      const { path: filePath, content } = JSON.parse(body) as { path: string; content: string };
      if (!filePath) {
        sendError(res, 'path is required', 400);
        return;
      }
      const fullPath = filePath.startsWith('~')
        ? path.join(os.homedir(), filePath.slice(1))
        : filePath.startsWith('/') ? filePath : path.join(USER_CLAUDE_DIR, filePath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, content, 'utf-8');
      sendJson(res, { success: true, path: fullPath });
      return;
    }

    // GET /api/settings
    if (req.method === 'GET' && pathname === '/api/settings') {
      const scope = query.scope ?? 'user';
      const projectPath = query.projectPath;
      const baseDir = getBaseDir(scope, projectPath);
      const settingsPath = path.join(baseDir, 'settings.json');
      if (!fs.existsSync(settingsPath)) {
        sendJson(res, { settings: {} });
        return;
      }
      const raw = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(raw) as unknown;
      sendJson(res, { settings, path: settingsPath });
      return;
    }

    // PUT /api/settings
    if (req.method === 'PUT' && pathname === '/api/settings') {
      const body = await readBody(req);
      const { scope, projectPath, settings } = JSON.parse(body) as {
        scope: string;
        projectPath?: string;
        settings: unknown;
      };
      const baseDir = getBaseDir(scope, projectPath);
      const settingsPath = path.join(baseDir, 'settings.json');
      if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
      sendJson(res, { success: true, path: settingsPath });
      return;
    }

    // GET /api/diff
    if (req.method === 'GET' && pathname === '/api/diff') {
      const filePath = query.path;
      if (!filePath) {
        sendError(res, 'path is required', 400);
        return;
      }
      try {
        const fullPath = filePath.startsWith('/') ? filePath : path.join(USER_CLAUDE_DIR, filePath);
        const cwd = path.dirname(fullPath);
        const diff = execFileSync('git', ['diff', 'HEAD', '--', fullPath], {
          cwd,
          encoding: 'utf-8',
        });
        sendJson(res, { diff: diff.trim(), hasChanges: diff.trim().length > 0 });
      } catch {
        sendJson(res, { diff: '', hasChanges: false });
      }
      return;
    }

    // GET /api/hooks/available
    if (req.method === 'GET' && pathname === '/api/hooks/available') {
      const hooksDir = path.join(USER_CLAUDE_DIR, 'hooks');
      const files: string[] = [];
      if (fs.existsSync(hooksDir)) {
        const entries = fs.readdirSync(hooksDir);
        for (const f of entries) {
          if (f.endsWith('.sh') || f.endsWith('.js') || f.endsWith('.ts')) {
            files.push(path.join(hooksDir, f));
          }
        }
      }
      sendJson(res, { hooks: files });
      return;
    }

    // GET /api/pipeline-items - agents, skills, commands available for pipeline
    if (req.method === 'GET' && pathname === '/api/pipeline-items') {
      const scope = query.scope ?? 'user';
      const projectPath = query.projectPath;
      const baseDir = getBaseDir(scope, projectPath);

      interface PipelineItemServer {
        id: string;
        itemType: string;
        name: string;
        filePath: string;
        description?: string;
      }

      const items: PipelineItemServer[] = [];

      // Collect agents (.md files in agents/)
      const agentsDir = path.join(baseDir, 'agents');
      if (fs.existsSync(agentsDir)) {
        const entries = fs.readdirSync(agentsDir);
        for (const f of entries) {
          if (f.endsWith('.md')) {
            const fullPath = path.join(agentsDir, f);
            const content = fs.readFileSync(fullPath, 'utf-8');
            const firstLine = content.split('\n').find((l) => l.startsWith('#'));
            items.push({
              id: `agent-${f}`,
              itemType: 'agent',
              name: f.replace('.md', ''),
              filePath: fullPath,
              description: firstLine ? firstLine.replace(/^#+\s*/, '') : undefined,
            });
          }
        }
      }

      // Collect skills (SKILL.md files in skills/*/)
      const skillsDir = path.join(baseDir, 'skills');
      if (fs.existsSync(skillsDir)) {
        const skillDirs = fs.readdirSync(skillsDir, { withFileTypes: true });
        for (const d of skillDirs) {
          if (d.isDirectory()) {
            const skillFile = path.join(skillsDir, d.name, 'SKILL.md');
            if (fs.existsSync(skillFile)) {
              const content = fs.readFileSync(skillFile, 'utf-8');
              const firstLine = content.split('\n').find((l) => l.startsWith('#'));
              items.push({
                id: `skill-${d.name}`,
                itemType: 'skill',
                name: d.name,
                filePath: skillFile,
                description: firstLine ? firstLine.replace(/^#+\s*/, '') : undefined,
              });
            }
          }
        }
      }

      // Collect commands (.md files in commands/)
      const commandsDir = path.join(baseDir, 'commands');
      if (fs.existsSync(commandsDir)) {
        const entries = fs.readdirSync(commandsDir);
        for (const f of entries) {
          if (f.endsWith('.md')) {
            const fullPath = path.join(commandsDir, f);
            const content = fs.readFileSync(fullPath, 'utf-8');
            const firstLine = content.split('\n').find((l) => l.startsWith('#'));
            items.push({
              id: `command-${f}`,
              itemType: 'command',
              name: f.replace('.md', ''),
              filePath: fullPath,
              description: firstLine ? firstLine.replace(/^#+\s*/, '') : undefined,
            });
          }
        }
      }

      sendJson(res, { items });
      return;
    }

    // GET /api/projects - list projects from memory-bank SQLite
    if (req.method === 'GET' && pathname === '/api/projects') {
      const dbPath = path.join(os.homedir(), '.config', 'superpowers', 'conversation-index', 'db.sqlite');

      if (!fs.existsSync(dbPath)) {
        sendJson(res, { projects: [] });
        return;
      }

      try {
        const sqlQuery = `SELECT cwd, project, MAX(timestamp) as last_accessed, COUNT(*) as exchange_count FROM exchanges WHERE cwd IS NOT NULL AND cwd != '' GROUP BY cwd ORDER BY last_accessed DESC LIMIT 50`;

        const rawOutput = execSync(
          `sqlite3 -json "${dbPath}" "${sqlQuery}"`,
          { encoding: 'utf-8', timeout: 5000 }
        );

        const rows = JSON.parse(rawOutput) as Array<{
          cwd: string;
          project: string;
          last_accessed: string;
          exchange_count: number;
        }>;

        const projects = rows.map((row) => ({
          cwd: row.cwd,
          project: row.project,
          lastAccessed: row.last_accessed,
          exchangeCount: row.exchange_count,
        }));

        sendJson(res, { projects });
      } catch {
        sendJson(res, { projects: [] });
      }
      return;
    }

    sendError(res, 'Not found', 404);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    sendError(res, msg, 500);
  }
});

server.listen(PORT, () => {
  console.log(`fs-server running on http://localhost:${PORT}`);
});
