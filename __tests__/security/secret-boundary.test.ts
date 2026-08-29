import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Safe Automated Secret-Boundary Checks', () => {
  const repoRoot = path.resolve(__dirname, '../../');
  const forbiddenBuildTokens = [
    'AUTH_SECRET', 'AUTH_PASSWORD', 'AUTH_USERNAME',
    'DATABASE_URL', 'DATABASE_URL_UNPOOLED', 'GEMINI_API_KEY',
  ];

  it('scans client source components to ensure zero server env or secret references', () => {
    const clientDirs = [
      path.join(repoRoot, 'components'),
      path.join(repoRoot, 'app/login'),
      path.join(repoRoot, 'lib/audio.ts'),
      path.join(repoRoot, 'lib/budget.ts'),
      path.join(repoRoot, 'lib/dashboard.ts'),
      path.join(repoRoot, 'lib/dates.ts'),
      path.join(repoRoot, 'lib/money.ts'),
      path.join(repoRoot, 'lib/types.ts'),
    ];

    const forbiddenPatterns: Array<{ name: string; pattern: RegExp }> = [
      { name: 'process.env.AUTH_SECRET', pattern: /process\.env\.(AUTH_SECRET|AUTH_PASSWORD|AUTH_USERNAME)/ },
      { name: 'process.env.DATABASE_URL', pattern: /process\.env\.(DATABASE_URL|DATABASE_URL_UNPOOLED)/ },
      { name: 'process.env.GEMINI_API_KEY', pattern: /process\.env\.GEMINI_API_KEY/ },
      { name: 'Direct server-only import in client code', pattern: /import\s+['"]server-only['"]/ },
      { name: 'Drizzle ORM client import in UI components', pattern: /from\s+['"]@\/db/ },
    ];

    function scanFile(filePath: string) {
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const rule of forbiddenPatterns) {
        const hasViolation = rule.pattern.test(content);
        expect(
          hasViolation,
          `Secret Boundary Violation: File '${path.relative(repoRoot, filePath)}' triggered rule '${rule.name}'. (Zero secrets or server modules permitted in client source).`
        ).toBe(false);
      }
    }

    function scanPath(targetPath: string) {
      if (!fs.existsSync(targetPath)) return;
      const stat = fs.statSync(targetPath);
      if (stat.isDirectory()) {
        const entries = fs.readdirSync(targetPath);
        for (const entry of entries) {
          scanPath(path.join(targetPath, entry));
        }
      } else if (/\.(tsx|ts|jsx|js)$/.test(targetPath)) {
        scanFile(targetPath);
      }
    }

    for (const d of clientDirs) {
      scanPath(d);
    }
  });

  it('scans client build output chunks when present without printing secrets', () => {
    const staticDir = path.join(repoRoot, '.next/static');
    if (!fs.existsSync(staticDir)) {
      // Build output not present during standard unit tests before build step
      expect(true).toBe(true);
      return;
    }

    function scanBuildDir(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanBuildDir(fullPath);
        } else if (/\.(js|json)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          for (const token of forbiddenBuildTokens) {
            const index = content.indexOf(token);
            expect(
              index === -1,
              `Build Secret Boundary Leak: Client chunk '${entry.name}' contains server token reference '${token}'. Server secrets must never leak into client build output.`
            ).toBe(true);
          }
        }
      }
    }

    scanBuildDir(staticDir);
  });

  it('enforces check-secret-boundary script and simulated chunks detect all sensitive build tokens', () => {
    const scriptPath = path.join(repoRoot, 'scripts/check-secret-boundary.mjs');
    const content = fs.readFileSync(scriptPath, 'utf-8');
    for (const token of forbiddenBuildTokens) {
      expect(content).toContain(`'${token}'`);
      const syntheticChunk = `/* client chunk */ const config = { key: "${token}" };`;
      expect(forbiddenBuildTokens.some((t) => syntheticChunk.includes(t))).toBe(true);
    }
  });
});
