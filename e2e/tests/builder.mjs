// The Visual Builder: the "Bildmaske" group on the Image module, what its fields store, and the live preview.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BASE, wp, php, diviActive, launch, login, pageHtml, colorsAt, isRed } from '../lib.mjs';
import { CASES, assertClipped } from '../cases.mjs';

const SKIP = 'Divi not installed (e2e/setup.sh /path/to/Divi.zip)';

/** Opens the builder for a page; returns the top window, the app window (the page) and its script errors. */
async function openBuilder(t, postId) {
  const browser = await launch();
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  await login(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}/?p=${postId}&et_fb=1&PageSpeed=off`, { waitUntil: 'domcontentloaded' });
  const deadline = Date.now() + 60000;
  let app;
  while (Date.now() < deadline) {
    app = page.frames().find((f) => f.url().includes('app_window=1'));
    if (await app?.evaluate(() => document.querySelectorAll('.et_pb_image').length > 0).catch(() => false)) break;
    await page.waitForTimeout(500);
  }
  return { page, app, errors };
}

/** Waits until the preview stylesheet has a rule for `count` modules (Divi's mask bundle loads after the page). */
const previewRules = (app, count) =>
  app.waitForFunction(
    (n) => (document.getElementById('d5im-preview')?.textContent ?? '').split('\n').filter((line) => line.startsWith('.et_pb_image_')).length === n,
    count,
    { timeout: 30000 },
  );

const moduleIdOf = (app) => app.evaluate(() => document.querySelector('.et_pb_image').className.match(/et_pb_image_([0-9a-f-]{36})/)[1]);

/** Opens the module's settings on the Design tab with the mask group (labelled `group`) expanded. */
async function openMaskGroup(page, app, moduleId, group = 'Image Mask') {
  await app.evaluate((id) => window.divi.data.dispatch('divi/modal-library').open({ owner: id, name: 'divi/module' }), moduleId);
  await page.getByText('Design', { exact: true }).first().click();
  if (!(await page.locator('.et-vb-field-image-advanced-mask-style').count())) {
    await page.getByText(group, { exact: true }).first().click();
  }
  await page.locator('.et-vb-field-image-advanced-mask-style').waitFor();
}

test('the builder preview clips each image like the page', async (t) => {
  if (!diviActive()) return t.skip(SKIP);
  const { id } = php('mask-page', JSON.stringify(CASES.map((c) => c.mask)));
  t.after(() => wp('post', 'delete', id, '--force'));
  const { page, app, errors } = await openBuilder(t, id);
  await previewRules(app, CASES.filter((c) => c.hidden.length).length);
  await page.mouse.move(1000, 24); // Off the canvas: no hover outlines on the modules.

  await assertClipped(page, app.locator('.et_pb_image .et_pb_image_wrap'));
  assert.deepEqual(errors, []);
});

test('the Image Mask fields store the mask, the preview follows, and the saved page keeps it', async (t) => {
  if (!diviActive()) return t.skip(SKIP);
  const { id, url } = php('mask-page', JSON.stringify([null]));
  t.after(() => wp('post', 'delete', id, '--force'));
  const { page, app, errors } = await openBuilder(t, id);
  const moduleId = await moduleIdOf(app);
  const stored = () => app.evaluate((id) => window.divi.data.select('divi/edit-post').getModuleAttr(id, 'image.advanced.mask')?.desktop?.value ?? null, moduleId);
  await openMaskGroup(page, app, moduleId);
  // Without a mask only the shape and the upload are offered.
  assert.equal(await page.locator('.et-vb-field-image-advanced-mask-transform').count(), 0);

  // Divi's shape picker, then a transform button, as clicked in the sidebar.
  await page.locator('.et-vb-field-image-advanced-mask-style .et-vb-mask--select').click();
  await page.locator('.et-vb-field-image-advanced-mask-style li[data-value="arch"]').click();
  assert.deepEqual(await stored(), { style: 'arch' });
  await page.locator('.et-vb-field-image-advanced-mask-transform button[data-name="flipHorizontal"]').click();
  assert.deepEqual(await stored(), { style: 'arch', transform: ['flipHorizontal'] });

  // The flipped arch shows the image's left side, in the preview and, once saved, on the page.
  const [left, right] = [[0.1, 0.5], [0.9, 0.5]];
  await previewRules(app, 1);
  await page.waitForTimeout(500); // Deliberate: lets the preview repaint after the last edit.
  const preview = await colorsAt(page, app.locator('.et_pb_image_wrap').first(), [left, right]);
  assert.ok(isRed(preview[0]) && !isRed(preview[1]), `preview: ${preview}`);

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const deadline = Date.now() + 30000;
  while (!(await pageHtml(url)).includes('mask-image') && Date.now() < deadline) await page.waitForTimeout(1000);
  const visitor = await page.context().browser().newPage();
  t.after(() => visitor.close());
  await visitor.goto(url);
  const saved = await colorsAt(visitor, visitor.locator('.et_pb_image_wrap').first(), [left, right]);
  assert.ok(isRed(saved[0]) && !isRed(saved[1]), `page: ${saved}`);
  assert.deepEqual(errors, []);
});

test('a custom mask offers only Invert, a shape all four transforms', async (t) => {
  if (!diviActive()) return t.skip(SKIP);
  const { id } = php('mask-page', JSON.stringify([{ style: 'arch' }]));
  t.after(() => wp('post', 'delete', id, '--force'));
  const { page, app, errors } = await openBuilder(t, id);
  const moduleId = await moduleIdOf(app);
  await openMaskGroup(page, app, moduleId);
  const buttons = () => page.locator('.et-vb-field-image-advanced-mask-transform button[data-name]').evaluateAll((all) => all.map((b) => b.dataset.name));
  const setCustom = (custom) =>
    app.evaluate(
      ({ id, custom }) => window.divi.data.dispatch('divi/edit-post').editModuleAttribute({ id, attrName: 'image.advanced.mask', value: { desktop: { value: { style: 'arch', custom } } } }),
      { id: moduleId, custom },
    );

  // The aspect ratio belongs to Divi's shapes only. (Divi's field classes are kebab-case.)
  const aspectRatio = page.locator('.et-vb-field-image-advanced-mask-aspect-ratio');
  assert.deepEqual(await buttons(), ['flipHorizontal', 'flipVertical', 'rotate', 'invert']);
  assert.equal(await aspectRatio.count(), 1);
  await setCustom(`${BASE}/wp-content/uploads/d5im-circle.svg`);
  await page.waitForTimeout(500); // Deliberate: the sidebar re-renders after the store change.
  assert.deepEqual(await buttons(), ['invert']);
  assert.equal(await aspectRatio.count(), 0);
  await setCustom('');
  await page.waitForTimeout(500);
  assert.deepEqual(await buttons(), ['flipHorizontal', 'flipVertical', 'rotate', 'invert']);
  assert.deepEqual(errors, []);
});

test('the animation fields show for zoomable sizes, and the preview replays the zoom on every change', async (t) => {
  if (!diviActive()) return t.skip(SKIP);
  const { id } = php('mask-page', JSON.stringify([{ style: 'ellipse' }]));
  t.after(() => wp('post', 'delete', id, '--force'));
  const { page, app, errors } = await openBuilder(t, id);
  const moduleId = await moduleIdOf(app);
  await openMaskGroup(page, app, moduleId);
  // Divi's field classes are the sub name in kebab-case.
  const field = (subName) => page.locator(`.et-vb-field-image-advanced-mask-${subName.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`);
  // The sidebar follows the store a moment later: wait for the field to come or go.
  const expectField = (subName, present) => field(subName).waitFor({ state: present ? 'attached' : 'detached', timeout: 5000 });
  const edit = (value) =>
    app.evaluate(({ id, value }) => window.divi.data.dispatch('divi/edit-post').editModuleAttribute({ id, attrName: 'image.advanced.mask', value: { desktop: { value } } }), { id: moduleId, value });
  // The preview's animation: name, duration and how far it has run.
  const previewAnimation = () =>
    app.evaluate(() => {
      const [a] = document.querySelector('.et_pb_image_wrap').getAnimations();
      return a ? { name: a.animationName, duration: a.effect.getTiming().duration, time: a.currentTime } : null;
    });
  const previewIs = (predicate) => app.waitForFunction(predicate, null, { timeout: 5000 });

  await expectField('animation', true);
  await expectField('animationTrigger', false);

  await edit({ style: 'ellipse', animation: 'zoom' });
  for (const subName of ['animationTrigger', 'animationDuration', 'animationDelay', 'animationEasing', 'animationRepeat']) await expectField(subName, true);
  // "Every time in view" is offered with the view start only. (Divi lists a select's options while it is open.)
  const repeatOptions = async () => {
    await field('animationRepeat').locator('li.et-vb-selected-item').click();
    const options = await field('animationRepeat').locator('li[data-value]').evaluateAll((all) => all.map((li) => li.dataset.value));
    await page.keyboard.press('Escape');
    return options;
  };
  assert.deepEqual(await repeatOptions(), ['once', 'loop']);
  await edit({ style: 'ellipse', animation: 'zoom', animationTrigger: 'view' });
  await page.waitForTimeout(500); // Deliberate: the select re-renders after the store change.
  assert.deepEqual(await repeatOptions(), ['once', 'view', 'loop']);
  await edit({ style: 'ellipse', animation: 'zoom' });
  await previewIs(() => document.querySelector('.et_pb_image_wrap').getAnimations()[0]?.animationName === 'd5im-zoom');

  // Let it run past where a replay would be, change the duration: it starts again with the new duration.
  await page.waitForTimeout(1200); // Deliberate: longer than the replay check below allows.
  await edit({ style: 'ellipse', animation: 'zoom', animationDuration: '1500ms' });
  await previewIs(() => document.querySelector('.et_pb_image_wrap').getAnimations()[0]?.effect.getTiming().duration === 1500);
  const replayed = await previewAnimation();
  assert.ok(replayed.time < 1000, `not replayed: at ${replayed.time} ms`);

  // Cover can't be zoomed: no animation fields, no animation.
  await edit({ style: 'ellipse', animation: 'zoom', size: 'cover' });
  await expectField('animation', false);
  await previewIs(() => document.querySelector('.et_pb_image_wrap').getAnimations().length === 0);
  assert.deepEqual(errors, []);
});

test('on a German site the mask group is German', async (t) => {
  if (!diviActive()) return t.skip(SKIP);
  // Needs WordPress's German files (setup.sh installs them): WordPress keeps the old language otherwise.
  wp('option', 'update', 'WPLANG', 'de_DE');
  assert.equal(wp('option', 'get', 'WPLANG'), 'de_DE', 'German not installed: run e2e/setup.sh again');
  t.after(() => wp('option', 'update', 'WPLANG', ''));
  // A shape with a custom size and an animation: every field is shown.
  const { id } = php('mask-page', JSON.stringify([{ style: 'arch', size: 'custom', position: 'top left', animation: 'zoom' }]));
  t.after(() => wp('post', 'delete', id, '--force'));
  const { page, app, errors } = await openBuilder(t, id);
  await openMaskGroup(page, app, await moduleIdOf(app), 'Bildmaske');

  const labels = await page.locator('[class*="et-vb-field-image-advanced-mask-"] .et-vb-field-label label').allTextContents();
  // Divi title-cases labels: compared without case.
  assert.deepEqual(
    labels.map((label) => label.trim().toLowerCase()),
    [
      'Maskenform', 'Eigene Maske', 'Transformation', 'Seitenverhältnis', 'Größe', 'Breite', 'Höhe', 'Position', 'Horizontaler Versatz', 'Vertikaler Versatz',
      'Animation', 'Start der Animation', 'Animationsdauer', 'Animationsverzögerung', 'Animationskurve', 'Wiederholung der Animation',
    ].map((label) => label.toLowerCase()),
  );
  // Divi lists a select's options only while it is open.
  await page.locator('.et-vb-field-image-advanced-mask-size li.et-vb-selected-item').click();
  const sizes = await page.locator('.et-vb-field-image-advanced-mask-size li[data-value]').allTextContents();
  assert.deepEqual(sizes.map((size) => size.trim()), ['Strecken', 'Füllen', 'Einpassen', 'Eigene Größe']);
  assert.deepEqual(errors, []);
});
