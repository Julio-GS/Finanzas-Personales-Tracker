import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Security & Isolation Boundaries', () => {
  const repoRoot = path.resolve(__dirname, '../../');

  it('verifies db/client.ts imports server-only', () => {
    const clientPath = path.join(repoRoot, 'db/client.ts');
    if (fs.existsSync(clientPath)) {
      const content = fs.readFileSync(clientPath, 'utf-8');
      expect(content).toMatch(/import\s+['"]server-only['"]/);
    }
  });

  it('verifies lib/env.ts imports server-only', () => {
    const envPath = path.join(repoRoot, 'lib/env.ts');
    expect(fs.existsSync(envPath)).toBe(true);
    const content = fs.readFileSync(envPath, 'utf-8');
    expect(content).toMatch(/import\s+['"]server-only['"]/);
  });

  it('verifies db/queries.ts imports server-only', () => {
    const queriesPath = path.join(repoRoot, 'db/queries.ts');
    if (fs.existsSync(queriesPath)) {
      const content = fs.readFileSync(queriesPath, 'utf-8');
      expect(content).toMatch(/import\s+['"]server-only['"]/);
    }
  });

  it('verifies lib/auth-server.ts imports server-only', () => {
    const authServerPath = path.join(repoRoot, 'lib/auth-server.ts');
    if (fs.existsSync(authServerPath)) {
      const content = fs.readFileSync(authServerPath, 'utf-8');
      expect(content).toMatch(/import\s+['"]server-only['"]/);
    }
  });

  it('verifies lib/gemini.ts imports server-only', () => {
    const geminiPath = path.join(repoRoot, 'lib/gemini.ts');
    expect(fs.existsSync(geminiPath)).toBe(true);
    const content = fs.readFileSync(geminiPath, 'utf-8');
    expect(content).toMatch(/import\s+['"]server-only['"]/);
  });

  it('ensures no client components import forbidden server-only modules', () => {
    const componentsDir = path.join(repoRoot, 'components');
    if (!fs.existsSync(componentsDir)) return;

    const forbiddenPatterns = [
      /from\s+['"]@\/db/i,
      /from\s+['"]\.\.?\/.*db/i,
      /from\s+['"]@\/lib\/env/i,
      /from\s+['"]@\/lib\/gemini/i,
      /from\s+['"]@\/lib\/auth-server/i,
    ];

    function scanDir(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          for (const pattern of forbiddenPatterns) {
            expect(
              pattern.test(content),
              `Client component ${entry.name} must NOT import server-only module: ${pattern}`
            ).toBe(false);
          }
        }
      }
    }

    scanDir(componentsDir);
  });
});
