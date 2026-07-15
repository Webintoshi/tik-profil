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
    /\.logto_main-content\s*{[\s\S]*?height:\s*auto;[\s\S]*?min-height:\s*min\(28rem,\s*calc\(100svh\s*-\s*4rem\)\)/i,
  );
  assert.doesNotMatch(
    css,
    /#app\s+input:not\(\[type=["']checkbox["']\]\):not\(\[type=["']radio["']\]\):not\(\[type=["']file["']\]\)/i,
  );
  assert.match(css, /button\[type=['"]submit['"]\]/);
  assert.match(css, /prefers-color-scheme:\s*dark/);
  assert.match(css, /--tik-focus:\s*#8A4A00/i);
  assert.match(css, /outline:\s*3px\s+solid\s+var\(--tik-focus\)/i);
  assert.match(css, /prefers-color-scheme:\s*dark[\s\S]*--tik-focus:\s*#FFC875/i);
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
  assert.match(
    css,
    /\.logto_branding-header\s*>\s*\*\s*{[^}]*display:\s*none\s*!important/i,
  );
  assert.match(
    css,
    /\.logto_branding-header\s*{[^}]*min-height:\s*5\.125rem;[^}]*justify-content:\s*center;/i,
  );
  assert.match(
    css,
    /\.logto_branding-header::before\s*{[\s\S]*?margin:\s*0\s+auto;/i,
  );
  assert.doesNotMatch(css, /(?:password|secret|token)\s*[:=]\s*["'][^"']+/i);
});

test('limits hosted auth overrides to stable input controls', async () => {
  const css = await readFile(stylesheetPath, 'utf8');

  assert.doesNotMatch(css, /Polished hosted authentication surface/i);
  assert.doesNotMatch(css, /border-top:\s*4px\s+solid\s+var\(--tik-amber\)/i);
  assert.match(
    css,
    /form\s*>\s*div:has\(input\[name=["']identifier["']\]\),[\s\S]*?padding-top:\s*1\.25rem\s*!important/i,
  );
  assert.match(
    css,
    /\[data-testid=["']prefix["']\]\s*>\s*\[role=["']button["']\]\s*{[\s\S]*?position:\s*static\s*!important/i,
  );

  for (const fieldName of ['identifier', 'password']) {
    const labelBlock = css.match(
      new RegExp(
        `div:has\\(>\\s*input\\[name=["']${fieldName}["']\\]\\)\\s*\\+\\s*div\\s+label\\s*{([^}]*)}`,
        'i',
      ),
    )?.[1] ?? '';

    assert.match(labelBlock, /inset:\s*-1\.25rem\s+auto\s+auto\s+0\s*!important/i);
    assert.match(labelBlock, /transform:\s*none\s*!important/i);
    assert.match(labelBlock, /margin:\s*0\s*!important/i);
  }
});

test('mirrors the native account entry surface on hosted authentication', async () => {
  const css = await readFile(stylesheetPath, 'utf8');
  const parityStart = css.indexOf('Native account entry parity');
  const darkModeStart = css.indexOf('@media (prefers-color-scheme: dark)');
  const parityCss = parityStart >= 0 ? css.slice(parityStart) : '';

  assert.ok(parityStart > darkModeStart, 'native parity overrides must win after legacy dark-mode rules');
  assert.match(parityCss, /#app\s*{[^}]*color-scheme:\s*light;[^}]*--tik-canvas:\s*#FAF8F4/i);
  assert.match(
    parityCss,
    /\.logto_page-container\s*{[^}]*background:\s*#FAF8F4\s*!important;[^}]*justify-content:\s*flex-start\s*!important/i,
  );
  assert.match(
    parityCss,
    /\.logto_main-content\s*{[^}]*width:\s*min\(100%,\s*26\.875rem\)[^}]*min-height:\s*100svh[^}]*background:\s*transparent\s*!important[^}]*box-shadow:\s*none\s*!important/i,
  );
  assert.match(
    parityCss,
    /button\[type=["']submit["']\]\s*{[^}]*min-height:\s*3\.125rem[^}]*border-radius:\s*1rem[^}]*background:\s*#FFB347/i,
  );
  assert.match(
    parityCss,
    /form\s*\+\s*\*\s+a\s*{[^}]*min-height:\s*3rem[^}]*border-radius:\s*1rem[^}]*background:\s*#1D1912[^}]*font-size:\s*0\.9375rem\s*!important/i,
  );
  assert.doesNotMatch(parityCss, /a\[href\*=["']\/(?:register|sign-in)["']\]::after/i);
  assert.match(
    parityCss,
    /\.logto_signature\s*{[^}]*position:\s*absolute\s*!important[^}]*width:\s*1px\s*!important[^}]*height:\s*1px\s*!important[^}]*clip-path:\s*inset\(50%\)\s*!important/i,
  );
});
