// SPDX-License-Identifier: AGPL-3.0-or-later. Part of everytrickinthebook, https://everytrick.org/. Copyright © 2026 Studio Julien McHardy (SJMcH) and the everytrickinthebook contributors. See NOTICE.md.
// Renders the examples in examples.json through Pandoc's citeproc with the house style and compares the result
// with the expected text. Italics are compared as *…*, other markup is dropped. An example with a "known" note is
// a difference that CSL cannot avoid: it is reported with the note but does not fail the test.
//   npm run test:csl                     ../mattering-press.csl
//   node csl/test/run.mjs other.csl      any other style, for comparison
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PANDOC = process.env.PANDOC || 'pandoc';
const csl = resolve(process.argv[2] || join(HERE, '..', 'mattering-press.csl'));
const { items, bibliography, citations } = JSON.parse(readFileSync(join(HERE, 'examples.json'), 'utf8'));

const work = mkdtempSync(join(tmpdir(), 'csl-test-'));
const bib = join(work, 'items.json');
writeFileSync(bib, JSON.stringify(items));
// One paragraph per citation, then the bibliography of every item.
const doc = `---\nnocite: '@*'\n---\n\n${citations.map((c, i) => `C${i}: ${c.cite}`).join('\n\n')}\n`;
const result = spawnSync(PANDOC, ['-f', 'markdown', '-t', 'html', '--wrap=none', '--citeproc', '--bibliography', bib, '--csl', csl], { input: doc, encoding: 'utf8' });
rmSync(work, { recursive: true, force: true });
if (result.status !== 0) { console.error(result.stderr); process.exit(2); }
if (result.stderr.trim()) console.warn(result.stderr.trim());
const html = result.stdout;

const text = (fragment) => fragment
  .replace(/<\/?(em|i)>/g, '*').replace(/<[^>]+>/g, '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ').trim();

let failed = 0, known = 0;
const report = (kind, label, actual, expected, note) => {
  const ok = actual === expected;
  if (!ok) note ? known++ : failed++;
  console.log(`${ok ? 'ok   ' : note ? 'KNOWN' : 'FAIL '} ${kind} ${label}`);
  if (!ok) console.log(`        expected: ${expected}\n        actual:   ${actual ?? '(nothing rendered)'}${note ? `\n        why:      ${note}` : ''}`);
};

for (const { id, expected, known: note } of bibliography) {
  const m = new RegExp(`<div id="ref-${id}" class="csl-entry"[^>]*>([\\s\\S]*?)</div>`).exec(html);
  report('bibliography', id, m && text(m[1]), expected, note);
}
citations.forEach(({ cite, expected, known: note }, i) => {
  const m = new RegExp(`<p>C${i}: ([\\s\\S]*?)</p>`).exec(html);
  report('citation  ', cite, m && text(m[1]), expected, note);
});
const total = bibliography.length + citations.length;
console.log(`\n${total - failed - known} of ${total} examples match${known ? `; ${known} known difference${known > 1 ? 's' : ''}` : ''}${failed ? `; ${failed} FAIL` : ''} (${csl}).`);
process.exitCode = failed ? 1 : 0;
