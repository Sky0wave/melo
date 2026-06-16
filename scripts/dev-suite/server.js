const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const net = require('net');

const PORT = 4000;
const WORKSPACE_DIR = path.resolve(__dirname, '../../');

// In-memory logs cache for streaming to UI
let actionLogs = [];
function logAction(msg) {
  const timestamp = new Date().toLocaleTimeString();
  const logMsg = `[${timestamp}] ${msg}`;
  console.log(logMsg);
  actionLogs.push(logMsg);
  if (actionLogs.length > 100) actionLogs.shift();
}

logAction("Starting Melo Dev-Suite Server...");

// ----------------------------------------------------
// TCP Ping Helper
// ----------------------------------------------------
function pingTcp(host, port, timeout = 2500) {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      const latency = Date.now() - start;
      socket.destroy();
      resolve({ status: 'online', latency });
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ status: 'offline', error: 'Timeout' });
    });
    
    socket.on('error', (err) => {
      socket.destroy();
      resolve({ status: 'offline', error: err.message });
    });
    
    socket.connect(port, host);
  });
}

// ----------------------------------------------------
// HTTP Ping Helper
// ----------------------------------------------------
function pingHttp(url, timeout = 2500) {
  return new Promise((resolve) => {
    const start = Date.now();
    let resolved = false;

    const req = http.get(url, (res) => {
      if (resolved) return;
      resolved = true;
      const latency = Date.now() - start;
      resolve({ 
        status: res.statusCode >= 200 && res.statusCode < 400 ? 'online' : 'warning', 
        latency,
        statusCode: res.statusCode 
      });
      res.resume(); // consume response
    });

    req.on('error', (err) => {
      if (resolved) return;
      resolved = true;
      resolve({ status: 'offline', error: err.message });
    });

    req.setTimeout(timeout, () => {
      if (resolved) return;
      resolved = true;
      req.destroy();
      resolve({ status: 'offline', error: 'Timeout' });
    });
  });
}

// ----------------------------------------------------
// Codebase Scanner
// ----------------------------------------------------
const IGNORED_DIRS = [
  'node_modules', '.git', '.expo', 'dist', 'assets', '.vscode', '.gemini', 'mobile', 'MeloMobile', 'scripts'
];

const SCAN_EXTENSIONS = ['.ts', '.tsx', '.js', '.json', '.css'];

function scanCodebase(dir = WORKSPACE_DIR) {
  const stats = {
    totalFiles: 0,
    totalLines: 0,
    byExtension: {},
    todos: [], // { file, line, text }
    consoleLogs: [], // { file, line, text }
    largeFiles: [], // { file, lines }
    fileCount: 0
  };

  SCAN_EXTENSIONS.forEach(ext => stats.byExtension[ext] = { count: 0, lines: 0 });

  function walk(currentDir) {
    let files;
    try {
      files = fs.readdirSync(currentDir);
    } catch (e) {
      return;
    }

    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch (e) {
        continue;
      }

      if (stat.isDirectory()) {
        if (!IGNORED_DIRS.includes(file)) {
          walk(fullPath);
        }
      } else {
        const ext = path.extname(file).toLowerCase();
        const baseName = path.basename(file).toLowerCase();
        // Ignore package locks and schema configs
        if (baseName === 'package-lock.json' || baseName === 'package.json' || baseName === 'tsconfig.json' || baseName === 'app.json') {
          continue;
        }
        if (SCAN_EXTENSIONS.includes(ext)) {
          stats.totalFiles++;
          stats.fileCount++;
          
          let content = '';
          try {
            content = fs.readFileSync(fullPath, 'utf8');
          } catch (e) {
            continue;
          }

          const lines = content.split('\n');
          const lineCount = lines.length;
          
          stats.totalLines += lineCount;
          stats.byExtension[ext].count++;
          stats.byExtension[ext].lines += lineCount;

          const relPath = path.relative(WORKSPACE_DIR, fullPath);

          // Check for large file (> 400 lines)
          if (lineCount > 400) {
            stats.largeFiles.push({ file: relPath, lines: lineCount });
          }

          // Scan line by line for TODOs, console.logs
          lines.forEach((lineText, idx) => {
            const trimmed = lineText.trim();
            const lineNum = idx + 1;

            // TODOs
            if (/\b(TODO|FIXME|BUG|HACK)\b/i.test(trimmed)) {
              // Extract description
              const match = trimmed.match(/\/\/\s*(TODO|FIXME|BUG|HACK):?\s*(.*)/i);
              stats.todos.push({
                file: relPath,
                line: lineNum,
                type: (match ? match[1] : 'TODO').toUpperCase(),
                text: match ? match[2].trim() : trimmed
              });
            }

            // Console.logs
            if (trimmed.includes('console.log(')) {
              stats.consoleLogs.push({
                file: relPath,
                line: lineNum,
                text: trimmed
              });
            }
          });
        }
      }
    }
  }

  walk(dir);
  return stats;
}

// ----------------------------------------------------
// Lint & Typecheck Runners
// ----------------------------------------------------
let isLintRunning = false;
let lintResults = { status: 'idle', count: 0, problems: [] };

function runLintCheck() {
  if (isLintRunning) return;
  isLintRunning = true;
  lintResults.status = 'running';
  logAction("Running ESLint checks ('npm run lint')...");

  exec('npm run lint', { cwd: WORKSPACE_DIR }, (err, stdout, stderr) => {
    isLintRunning = false;
    
    // Parse output
    const output = stdout + '\n' + stderr;
    const lines = output.split('\n');
    const problems = [];
    let problemCount = 0;

    let currentFile = '';
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('/') && trimmed.includes(WORKSPACE_DIR)) {
        currentFile = path.relative(WORKSPACE_DIR, trimmed);
      } else if (/\d+:\d+\s+(warning|error)/i.test(trimmed)) {
        const match = trimmed.match(/(\d+):(\d+)\s+(warning|error)\s+(.*?)\s+([@a-z/-]+)$/i);
        if (match) {
          problems.push({
            file: currentFile,
            line: parseInt(match[1]),
            col: parseInt(match[2]),
            severity: match[3],
            message: match[4],
            rule: match[5]
          });
          problemCount++;
        }
      }
    });

    // Extract summary
    const summaryMatch = output.match(/✖\s+(\d+)\s+problems?/i);
    if (summaryMatch) {
      problemCount = parseInt(summaryMatch[1]);
    }

    lintResults = {
      status: 'done',
      count: problemCount,
      problems: problems.slice(0, 50), // cap list
      raw: output
    };
    
    logAction(`ESLint completed. Found ${problemCount} issue(s).`);
  });
}

let isTscRunning = false;
let tscResults = { status: 'idle', count: 0, errors: [] };

function runTypeCheck() {
  if (isTscRunning) return;
  isTscRunning = true;
  tscResults.status = 'running';
  logAction("Running TypeScript typecheck ('npx tsc --noEmit')...");

  exec('npx tsc --noEmit', { cwd: WORKSPACE_DIR }, (err, stdout, stderr) => {
    isTscRunning = false;
    
    const output = stdout + '\n' + stderr;
    const lines = output.split('\n').filter(l => l.trim().length > 0);
    const errors = [];
    
    lines.forEach(line => {
      // e.g. app/(tabs)/library.tsx(50,6): error TS2322: ...
      const match = line.match(/(.*?)\((\d+),(\d+)\):\s+(error\s+TS\d+):\s+(.*)/);
      if (match) {
        errors.push({
          file: match[1],
          line: parseInt(match[2]),
          col: parseInt(match[3]),
          code: match[4],
          message: match[5]
        });
      }
    });

    tscResults = {
      status: 'done',
      count: errors.length,
      errors: errors.slice(0, 50),
      raw: output
    };

    logAction(`TypeScript compiler finished. Found ${errors.length} issue(s).`);
  });
}

// ----------------------------------------------------
// System Status Checker
// ----------------------------------------------------
async function checkSystemStatus() {
  // 1. Metro (port 8081)
  const metroPing = await pingHttp('http://localhost:8081/status');
  
  // 2. Backend (port 3000)
  const backendPing = await pingHttp('http://localhost:3000/api/tracks');
  
  // 3. Database (Neon Postgres)
  // connection string: postgresql://neondb_owner:npg_4voCarAhJU5c@ep-plain-river-aqgzx5dh.c-8.us-east-1.aws.neon.tech/neondb
  const dbPing = await pingTcp('ep-plain-river-aqgzx5dh.c-8.us-east-1.aws.neon.tech', 5432);

  return {
    metro: {
      name: 'Metro Packager (Expo)',
      port: 8081,
      url: 'http://localhost:8081',
      ...metroPing
    },
    backend: {
      name: 'Melo API Backend',
      port: 3000,
      url: 'http://localhost:3000',
      ...backendPing
    },
    database: {
      name: 'Neon Serverless Postgres',
      host: 'ep-plain-river-aqgzx5dh.c-8.us-east-1.aws.neon.tech',
      port: 5432,
      ...dbPing
    }
  };
}

// Trigger initial lint and tsc check
runLintCheck();
runTypeCheck();

// ----------------------------------------------------
// HTTP Server Router
// ----------------------------------------------------
const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Root or dashboard
  if (pathname === '/' || pathname === '/dashboard') {
    const htmlPath = path.join(__dirname, 'dashboard.html');
    try {
      const htmlContent = fs.readFileSync(htmlPath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(htmlContent);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Failed to load dashboard: ${err.message}`);
    }
    return;
  }

  // API: System Status
  if (pathname === '/api/status' && req.method === 'GET') {
    const status = await checkSystemStatus();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status));
    return;
  }

  // API: Codebase Analysis
  if (pathname === '/api/analysis' && req.method === 'GET') {
    const scan = scanCodebase();
    
    // Calculate simple health score
    let score = 100;
    
    // Count actual oversized files (> 800 lines) for penalty
    const oversizedFilesCount = scan.largeFiles.filter(f => f.lines > 800).length;
    
    score -= Math.min(2, scan.todos.length * 0.05); // Max 2pt deduction for TODOs (represented in notes)
    score -= Math.min(5, oversizedFilesCount * 1.0); // Max 5pt deduction for oversized files (> 800 lines)
    score -= Math.min(2, scan.consoleLogs.length * 0.05); // Max 2pt deduction for console.logs
    
    if (lintResults.status === 'done') {
      const errorsCount = lintResults.problems.filter(p => p.severity === 'error').length;
      const warningsCount = lintResults.count - errorsCount;
      score -= Math.min(15, errorsCount * 3.0); // Max 15pt deduction for ESLint errors
      score -= Math.min(4, warningsCount * 0.15); // Max 4pt deduction for ESLint warnings
    }
    
    if (tscResults.status === 'done') {
      score -= Math.min(20, tscResults.count * 5.0); // Max 20pt deduction for TSC errors
    }

    score = Math.max(0, Math.round(score));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      codebase: scan,
      lint: {
        status: lintResults.status,
        count: lintResults.count,
        problems: lintResults.problems
      },
      tsc: {
        status: tscResults.status,
        count: tscResults.count,
        errors: tscResults.errors
      },
      healthScore: score,
      lastUpdated: new Date().toISOString()
    }));
    return;
  }

  // API: Logs & Console output
  if (pathname === '/api/logs' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ logs: actionLogs }));
    return;
  }

  // API: Trigger Audit Actions
  if (pathname === '/api/action' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      let data = {};
      try {
        data = JSON.parse(body);
      } catch (e) {}

      const { action } = data;
      logAction(`Received API trigger for action: ${action}`);

      if (action === 'lint') {
        runLintCheck();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Lint checks triggered' }));
      } else if (action === 'tsc') {
        runTypeCheck();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'TypeScript typecheck triggered' }));
      } else if (action === 'restart-metro') {
        logAction("Initiating Metro Bundler restart...");
        // Command to restart expo in workspace
        exec('npx expo start --clear &', { cwd: WORKSPACE_DIR }, (err) => {
          if (err) logAction(`Metro restart command error: ${err.message}`);
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Metro restart command executed in background' }));
      } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Unknown action' }));
      }
    });
    return;
  }

  // Fallback 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  logAction(`Developer Suite running at http://localhost:${PORT}`);
  logAction(`Workspace base directory: ${WORKSPACE_DIR}`);
});
