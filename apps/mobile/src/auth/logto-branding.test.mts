import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const stylesheetPath = resolve(
  import.meta.dirname,
  '../../../../infra/logto/tikprofil-sign-in.css',
);

test('keeps the Logto branding stylesheet credential-free and scoped', async () => {
  const css = await readFile(stylesheetPath, 'utf8');

  assert.match(css, /--tik-amber:\s*#FFB347/i);
  assert.match(css, /\.logto_page-container/);
  assert.match(css, /\.logto_main-content/);
  assert.match(css, /button\[type=['"]submit['"]\]/);
  assert.match(css, /prefers-color-scheme:\s*dark/);
  assert.match(css, /--tik-focus:\s*#8A4A00/i);
  assert.match(css, /outline:\s*3px\s+solid\s+var\(--tik-focus\)/i);
  assert.match(css, /prefers-color-scheme:\s*dark[\s\S]*--tik-focus:\s*#FFC875/i);
  assert.doesNotMatch(css, /password|secret|token/i);
});
