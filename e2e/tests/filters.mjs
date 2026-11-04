// Divi's own Design › Filters (Opacity, Blend) act on the masked image as a whole: the plugin offers no opacity
// or blend mode of its own for the image, only Outside Opacity for the area outside the shape.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wp, php, diviActive, launch, colorsAt, isRed } from '../lib.mjs';
import { isFaint } from '../cases.mjs';

const [center, corner] = [[0.5, 0.5], [0.03, 0.03]];
const white = ([r, g, b]) => r > 240 && g > 240 && b > 240;
const cyan = ([r, g, b]) => r < 60 && g > 200 && b > 200;
const filters = (value) => ({ module: { decoration: { filters: { desktop: { value } } } } });

test("Divi's Opacity and Blend filters apply to the masked image", async (t) => {
  if (!diviActive()) return t.skip('Divi not installed (e2e/setup.sh /path/to/Divi.zip)');
  const ellipse = { style: 'ellipse' };
  const difference = filters({ blendMode: 'difference' });
  const { id, url } = php(
    'mask-page',
    JSON.stringify([ellipse, ellipse, null, ellipse]),
    JSON.stringify([{}, filters({ opacity: '50%' }), difference, difference]),
    // Divi's columns are their own stacking context (z-index 2): Blend mixes only with what the column paints,
    // here its white background, not with the section or page behind it. With or without a mask.
    JSON.stringify({ module: { decoration: { background: { desktop: { value: { color: '#ffffff' } } } } } }),
  );
  t.after(() => wp('post', 'delete', id, '--force'));
  const browser = await launch();
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(url);
  const wraps = page.locator('.et_pb_image .et_pb_image_wrap');
  const at = async (i) => {
    await wraps.nth(i).scrollIntoViewIfNeeded();
    return colorsAt(page, wraps.nth(i), [center, corner]);
  };

  const [plain, plainOutside] = await at(0);
  assert.ok(isRed(plain) && white(plainOutside), `no filter: ${plain} / ${plainOutside}`);
  // Opacity 50 %: the shape is half transparent, outside it stays empty.
  const [half, halfOutside] = await at(1);
  assert.ok(isFaint(half) && white(halfOutside), `opacity: ${half} / ${halfOutside}`);
  // Blend "difference" against the white column turns red into cyan: without a mask everywhere, with a mask
  // inside the shape, while outside nothing of the image is blended.
  const [unmasked, unmaskedCorner] = await at(2);
  assert.ok(cyan(unmasked) && cyan(unmaskedCorner), `blend without mask: ${unmasked} / ${unmaskedCorner}`);
  const [blended, blendedOutside] = await at(3);
  assert.ok(cyan(blended) && white(blendedOutside), `blend with mask: ${blended} / ${blendedOutside}`);
});
