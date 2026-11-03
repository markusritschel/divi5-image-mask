// The mask on the page: each Image module's .et_pb_image_wrap is clipped as its settings say (cases.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wp, php, diviActive, launch } from '../lib.mjs';
import { CASES, assertClipped } from '../cases.mjs';

test('the page clips each image as its mask settings say', async (t) => {
  if (!diviActive()) return t.skip('Divi not installed (e2e/setup.sh /path/to/Divi.zip)');
  const { id, url } = php('mask-page', JSON.stringify(CASES.map((c) => c.mask)));
  t.after(() => wp('post', 'delete', id, '--force'));
  const browser = await launch();
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);

  await assertClipped(page, page.locator('.et_pb_image .et_pb_image_wrap'));
  assert.deepEqual(errors, []);
});
