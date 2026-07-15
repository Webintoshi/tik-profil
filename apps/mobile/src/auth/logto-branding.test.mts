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
  assert.match(css, /@font-face\s*{[\s\S]*font-family:\s*["']Jost["']/i);
  assert.match(css, /src:\s*url\(["']?data:font\/ttf;base64,/i);
  assert.match(css, /font-weight:\s*100\s+900/i);
  assert.match(css, /#app,\s*#app\s+\*\s*{[\s\S]*font-family:\s*["']Jost["']/i);
  assert.match(css, /\.logto_page-container/);
  assert.match(css, /\.logto_main-content/);
  assert.match(
    css,
    /\.logto_main-content\s*{[\s\S]*?min-height:\s*0;[\s\S]*?background:\s*transparent\s*!important/i,
  );
  assert.doesNotMatch(
    css,
    /#app\s+input:not\(\[type=["']checkbox["']\]\):not\(\[type=["']radio["']\]\):not\(\[type=["']file["']\]\)/i,
  );
  assert.match(css, /button\[type=['"]submit['"]\]/);
  assert.match(css, /prefers-color-scheme:\s*dark/);
  assert.match(css, /--tik-focus:\s*#3C4047/i);
  assert.match(css, /outline:\s*3px\s+solid\s+var\(--tik-focus\)/i);
  assert.match(css, /html\[data-theme=["']dark["']\]\s*#app\s*{[\s\S]*--tik-focus:\s*#E2E5E9/i);
  assert.match(
    css,
    /\.logto_page-container\s*{[\s\S]*?border-top:\s*4px\s+solid\s+var\(--tik-amber\)[\s\S]*?background:\s*var\(--tik-canvas\)\s*!important/i,
  );
  assert.match(
    css,
    /\.logto_main-content\s*>\s*:nth-child\(2\)\s*{[\s\S]*?border-radius:\s*8px[\s\S]*?box-shadow:/i,
  );
  assert.match(
    css,
    /\.logto_branding-header\s*{[\s\S]*?margin:\s*-2rem\s+-2rem\s+1\.75rem[\s\S]*?background:\s*var\(--tik-amber\)/i,
  );
  assert.match(
    css,
    /\[data-testid=["']prefix["']\]\s*{[\s\S]*?width:\s*4\.75rem\s*!important[\s\S]*?min-width:\s*4\.75rem/i,
  );
  assert.match(
    css,
    /\[data-testid=["']prefix["']\]\s*>\s*\[role=["']button["']\]\s*{[\s\S]*?opacity:\s*1\s*!important/i,
  );
  assert.match(
    css,
    /form\s*>\s*div:has\(input:focus\)\s*>\s*div\s*{[\s\S]*?box-shadow:\s*0\s+0\s+0\s+3px/i,
  );
  assert.match(
    css,
    /input\[name=["']identifier["']\]\)[\s\S]*?label::after\s*{[\s\S]*?content:\s*["']Telefon numarası["']/i,
  );
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/i);
  assert.match(
    css,
    /\.logto_branding-header::before\s*{[\s\S]*?content:\s*['"]{2};[\s\S]*?background-image:\s*var\(--tik-brand-logo\);[\s\S]*?background-size:\s*contain;/i,
  );
  assert.match(
    css,
    /\.logto_main-content:not\(:has\(\.logto_branding-header\)\)\s*>\s*:nth-child\(2\)\s*{[\s\S]*?border-radius:\s*1rem;[\s\S]*?background:\s*#fff(?:fff)?;/i,
  );
  assert.match(
    css,
    /\.logto_main-content:not\(:has\(\.logto_branding-header\)\)\s*>\s*:nth-child\(2\)::before\s*{[\s\S]*?background-image:\s*var\(--tik-brand-logo\);/i,
  );
  assert.equal(css.match(/data:image\/png;base64,/gi)?.length, 2);
  assert.match(
    css,
    /prefers-color-scheme:\s*dark[\s\S]*--tik-brand-logo:\s*url\(['"]?data:image\/png;base64,/i,
  );
  assert.doesNotMatch(
    css,
    /\.logto_branding-header\s*{[^}]*(?:display:\s*none|visibility:\s*hidden|font-size:\s*0|text-indent:)/i,
  );
  assert.doesNotMatch(css, /(?:password|secret|token)\s*[:=]\s*["'][^"']+/i);
});
