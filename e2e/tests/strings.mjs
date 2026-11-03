// Translations: every text the builder script shows is translated in PHP (d5im_builder_texts()) and has a German
// translation. Static check of the files, no test site needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const unescape = (s) => s.replace(/\\(.)/g, '$1');

test('the builder script shows only texts the PHP translates, all of them in German', () => {
  const js = new Set([...read('assets/image-mask.js').matchAll(/\b__\(\s*"((?:[^"\\]|\\.)*)"\s*\)/g)].map((m) => unescape(m[1])));
  const php = new Set([...read('divi5-image-mask.php').matchAll(/__\(\s*'((?:[^'\\]|\\.)*)',\s*'divi5-image-mask'\s*\)/g)].map((m) => unescape(m[1])));
  assert.ok(js.size > 20, `found only ${js.size} texts in the script`);
  assert.deepEqual([...js].filter((s) => !php.has(s)), [], 'texts the PHP does not translate');

  for (const locale of ['de_DE', 'de_DE_formal']) {
    const po = read(`languages/divi5-image-mask-${locale}.po`);
    const translated = new Map([...po.matchAll(/^msgid "((?:[^"\\]|\\.)*)"\nmsgstr "((?:[^"\\]|\\.)*)"/gm)].map((m) => [unescape(m[1]), unescape(m[2])]));
    const missing = [...php].filter((s) => !translated.get(s));
    assert.deepEqual(missing, [], `${locale}: untranslated`);
  }
});
