// The mask on the page: each Image module's .et_pb_image_wrap is clipped as its settings say, checked on the
// rendered pixels (red = image visible, page background = masked out).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BASE, wp, php, diviActive, launch, colorsAt, isRed } from '../lib.mjs';

const circle = `${BASE}/wp-content/uploads/d5im-circle.svg`;
const [center, corner, left, right, top, bottom] = [[0.5, 0.5], [0.03, 0.03], [0.1, 0.5], [0.9, 0.5], [0.5, 0.1], [0.5, 0.9]];

// mask: the module's image.advanced.mask value; shown/hidden: points where the image must be visible / masked out.
const CASES = [
  { name: 'no mask attribute', mask: null, shown: [center, corner], hidden: [] },
  { name: 'style none', mask: { style: 'none' }, shown: [center, corner], hidden: [] },
  // Like Divi's background mask: the image shows where the background would show through Divi's mask.
  { name: 'ellipse', mask: { style: 'ellipse' }, shown: [center], hidden: [corner] },
  { name: 'ellipse inverted', mask: { style: 'ellipse', transform: ['invert'] }, shown: [corner], hidden: [center] },
  // Divi's arch covers the left part of the background; rotated, the bottom part.
  { name: 'arch', mask: { style: 'arch' }, shown: [right], hidden: [left] },
  { name: 'arch flipped horizontally', mask: { style: 'arch', transform: ['flipHorizontal'] }, shown: [left], hidden: [right] },
  { name: 'arch rotated', mask: { style: 'arch', transform: ['rotate'] }, shown: [top], hidden: [bottom] },
  { name: 'arch rotated, flipped vertically', mask: { style: 'arch', transform: ['rotate', 'flipVertical'] }, shown: [bottom], hidden: [top] },
  {
    name: 'ellipse, custom size at the top left',
    mask: { style: 'ellipse', size: 'custom', width: '50%', height: '50%', position: 'top left' },
    shown: [[0.25, 0.25]], hidden: [[0.75, 0.75], [0.75, 0.25]],
  },
  {
    name: 'ellipse, custom size at the bottom right',
    mask: { style: 'ellipse', size: 'custom', width: '50%', height: '50%', position: 'bottom right' },
    shown: [[0.75, 0.75]], hidden: [[0.25, 0.25]],
  },
  {
    name: 'ellipse, custom size at the top left, offset',
    mask: { style: 'ellipse', size: 'custom', width: '50%', height: '50%', position: 'top left', horizontalOffset: '200px' },
    shown: [[0.75, 0.25]], hidden: [[0.25, 0.25]],
  },
  // A custom mask shows the image where it is opaque.
  { name: 'custom circle', mask: { custom: circle }, shown: [center], hidden: [corner] },
  { name: 'custom circle inverted', mask: { custom: circle, transform: ['invert'] }, shown: [corner], hidden: [center] },
  { name: 'custom wins over a style', mask: { style: 'arch', custom: circle }, shown: [center], hidden: [corner, left] },
];

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

  const wraps = page.locator('.et_pb_image .et_pb_image_wrap');
  assert.equal(await wraps.count(), CASES.length);
  for (const [i, { name, shown, hidden }] of CASES.entries()) {
    const wrap = wraps.nth(i);
    await wrap.scrollIntoViewIfNeeded();
    const colors = await colorsAt(page, wrap, [...shown, ...hidden]);
    shown.forEach((point, j) => assert.ok(isRed(colors[j]), `${name}: image hidden at ${point} (${colors[j]})`));
    hidden.forEach((point, j) => assert.ok(!isRed(colors[shown.length + j]), `${name}: image visible at ${point}`));
  }
  assert.deepEqual(errors, []);
});
