import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

let violationsCount = 0;

function reportViolation(location, rule) {
  violationsCount++;
  // Safe violation reporting: Never print secret values or env values.
  console.error(`[SECRET-BOUNDARY-VIOLATION] ${location}: triggered rule '${rule}'`);
}

const clientSourceDirs = [
  path.join(repoRoot, 'components'),
  path.join(repoRoot, 'app/login'),
  path.join(repoRoot, 'lib/audio.ts'),
  path.join(repoRoot, 'lib/budget.ts'),
  path.join(repoRoot, 'lib/dashboard.ts'),
  path.join(repoRoot, 'lib/dates.ts'),
  path.join(repoRoot, 'lib/money.ts'),
  path.join(repoRoot, 'lib/types.ts'),
];

const sourceRules = [
  { name: 'process.env.AUTH_SECRET', pattern: /process\.env\.(AUTH_SECRET|AUTH_PASSWORD|AUTH_USERNAME)/ },
  { name: 'process.env.DATABASE_URL', pattern: /process\.env\.(DATABASE_URL|DATABASE_URL_UNPOOLED)/ },
  { name: 'process.env.GEMINI_API_KEY', pattern: /process\.env\.GEMINI_API_KEY/ },
  { name: 'server-only import in client boundary', pattern: /import\s+['"]server-only['"]/ },
  { name: 'database client import in client boundary', pattern: /from\s+['"]@\/db/ },
];

function scanSourceFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const rule of sourceRules) {
    if (rule.pattern.test(content)) {
      reportViolation(path.relative(repoRoot, filePath), rule.name);
    }
  }
}

function scanSourceTree(targetPath) {
  if (!fs.existsSync(targetPath)) return;
  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(targetPath)) {
      scanSourceTree(path.join(targetPath, entry));
    }
  } else if (/\.(tsx|ts|jsx|js)$/.test(targetPath)) {
    scanSourceFile(targetPath);
  }
}

for (const dir of clientSourceDirs) {
  scanSourceTree(dir);
}

// Build output inspection if present
const staticDir = path.join(repoRoot, '.next/static');
if (fs.existsSync(staticDir)) {
  const buildTokens = [
    'AUTH_SECRET', 'AUTH_PASSWORD', 'AUTH_USERNAME',
    'DATABASE_URL', 'DATABASE_URL_UNPOOLED', 'GEMINI_API_KEY',
  ];

  function scanBuildDir(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanBuildDir(fullPath);
      } else if (/\.(js|json)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        for (const token of buildTokens) {
          if (content.includes(token)) {
            reportViolation(`.next/static/**/${entry.name}`, `leaked-token:${token}`);
          }
        }
      }
    }
  }

  scanBuildDir(staticDir);
}

if (violationsCount > 0) {
  console.error(`\nSecret Boundary Check FAILED with ${violationsCount} violation(s).`);
  process.exit(1);
} else {
  console.log('Secret Boundary Check PASSED: 0 client-side secrets or server module leaks detected.');
  process.exit(0);
}
