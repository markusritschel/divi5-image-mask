// README images: the Image Mask group in the Builder sidebar and its opened Mask Shape list.
// Needs the test site from setup.sh with Divi. Run: cd e2e && node capture.mjs
// Writes docs/screenshots/; everything it creates in the site is deleted again.
// The Image module shows a photo ("Flower meadow in Llano, Texas", public domain CC0, rawpixel.com) that ships with
// WordPress's Twenty Twenty-Five theme, so it is in every test site and needs no download.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE, wp, diviActive, launch, login } from './lib.mjs';

const OUT = fileURLToPath(new URL('../docs/screenshots/', import.meta.url));
mkdirSync(OUT, { recursive: true });
if (!diviActive()) throw new Error('Divi is not active: run setup.sh with the Divi zip');

// A zoom started "When Scrolled Into View" shows every animation field (Replay only appears with it).
const MASK = { style: 'honeycomb', animation: 'zoom', animationTrigger: 'view', animationLoop: 'on', animationDirection: 'alternate', animationDuration: '1600ms', animationEasing: 'ease-in-out' };

const cleanup = [];
try {
  const photo = wp('media', 'import', 'wp-content/themes/twentytwentyfive/assets/images/coming-soon-bg-image.webp', '--title=Flower meadow', '--porcelain');
  cleanup.push(() => wp('post', 'delete', photo, '--force'));
  const src = wp('eval', `echo wp_get_attachment_url(${photo});`);
  const image = `<!-- wp:divi/image ${JSON.stringify({ image: { innerContent: { desktop: { value: { src } } }, advanced: { mask: { desktop: { value: MASK } } } } })} /-->`;
  const content = `<!-- wp:divi/placeholder --><!-- wp:divi/section --><!-- wp:divi/row --><!-- wp:divi/column -->${image}<!-- /wp:divi/column --><!-- /wp:divi/row --><!-- /wp:divi/section --><!-- /wp:divi/placeholder -->`;
  const id = wp('post', 'create', '--user=admin', '--post_type=page', '--post_status=publish', '--post_title=Image Mask', `--post_content=${content}`, '--meta_input={"_et_pb_use_builder":"on"}', '--porcelain');
  cleanup.push(() => wp('post', 'delete', id, '--force'));

  const browser = await launch();
  try {
    await sidebarShots(browser, id);
  } finally {
    await browser.close();
  }
} finally {
  for (const undo of cleanup.reverse()) undo();
}

/**
 * Design > Image Mask in two parts (side by side in the README): the shape fields, then the animation fields;
 * then the Mask Shape list opened, with every shape Divi offers.
 */
async function sidebarShots(browser, id) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 2400 }, deviceScaleFactor: 2 });
  await login(context);
  const page = await context.newPage();
  await page.goto(`${BASE}/?p=${id}&et_fb=1&PageSpeed=off`, { waitUntil: 'domcontentloaded' });
  const app = await (await page.waitForSelector('iframe#et-vb-app-frame', { timeout: 120000 })).contentFrame();
  await app.waitForSelector('.et_pb_image', { timeout: 120000 });
  await page.waitForTimeout(3000); // Deliberate: Divi keeps initialising after the module appears.
  // The settings through Divi's own store, as tests/builder.mjs opens them.
  const moduleId = await app.evaluate(() => document.querySelector('.et_pb_image').className.match(/et_pb_image_([0-9a-f-]{36})/)[1]);
  await app.evaluate((owner) => window.divi.data.dispatch('divi/modal-library').open({ owner, name: 'divi/module' }), moduleId);
  await page.getByText('Design', { exact: true }).first().click();
  if (!(await page.locator('.et-vb-field-image-advanced-mask-style').count())) await page.getByText('Image Mask', { exact: true }).first().click();
  await page.locator('.et-vb-field-image-advanced-mask-style').waitFor();
  await page.waitForTimeout(1200);

  const sidebar = await page.locator('.et-vb-sidebar--right').boundingBox();
  const group = await page.locator('.et-vb-field-image-advanced-mask-style').locator('xpath=ancestor::div[contains(@class,"et-vb-modal-group")][1]').boundingBox();
  const animation = await page.locator('.et-vb-field-image-advanced-mask-animation').boundingBox();
  const split = animation.y - 8;
  const clip = (y0, y1) => ({ x: sidebar.x, y: y0, width: sidebar.width, height: y1 - y0 });
  await page.screenshot({ path: join(OUT, 'builder-mask.png'), clip: clip(sidebar.y, split) });
  await page.screenshot({ path: join(OUT, 'builder-mask-animation.png'), clip: clip(split, group.y + group.height + 12) });

  // Last, as the open list covers the fields below it. The pointer moves off it: no hover highlight.
  await page.locator('.et-vb-field-image-advanced-mask-style .et-vb-mask--select').click();
  await page.mouse.move(10, 10);
  await page.waitForTimeout(1200); // Deliberate: the list's shape previews load after it opens.
  await page.locator('.et-vb-field-image-advanced-mask-style ul.et-vb-mask--select').screenshot({ path: join(OUT, 'mask-shape-list.png') });
  await context.close();
}
