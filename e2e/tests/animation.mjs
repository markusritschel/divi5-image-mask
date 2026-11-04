// The mask's zoom animation on the page: on load, on scrolling into view, without JavaScript and with reduced
// motion. Time is controlled through the Web Animations API (getAnimations()), so nothing depends on timing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BASE, wp, php, diviActive, launch, pageHtml, colorsAt, isRed } from '../lib.mjs';
import { isFaint } from '../cases.mjs';

const SKIP = 'Divi not installed (e2e/setup.sh /path/to/Divi.zip)';
const circle = `${BASE}/wp-content/uploads/d5im-circle.svg`;
const [center, corner] = [[0.5, 0.5], [0.03, 0.03]];
const onLoad = { animation: 'zoom', animationTrigger: 'load' };
const onView = { animation: 'zoom', animationTrigger: 'view' };

const wraps = (page) => page.locator('.et_pb_image .et_pb_image_wrap');
const animationsOf = (locator) =>
  locator.evaluate((el) =>
    el.getAnimations().map((a) => ({
      name: a.animationName,
      duration: a.effect.getTiming().duration,
      delay: a.effect.getTiming().delay,
      // A CSS animation's speed curve applies per keyframe; the effect's own easing is always linear.
      easing: getComputedStyle(el).animationTimingFunction,
    })),
  );
/** Moves the wrap's animation to its start (fraction 0) or end (1) and holds it there. */
const seek = (locator, fraction) =>
  locator.evaluate((el, f) => {
    const [a] = el.getAnimations();
    a.pause();
    const { delay, duration } = a.effect.getTiming();
    a.currentTime = delay + f * duration;
  }, fraction);
const maskSize = (locator) => locator.evaluate((el) => getComputedStyle(el).maskSize);

async function openPage(t, masks, contextOptions = {}) {
  const { id, url } = php('mask-page', JSON.stringify(masks));
  t.after(() => wp('post', 'delete', id, '--force'));
  const browser = await launch();
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 400 }, ...contextOptions });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  return { page, url, errors };
}

test('on page load the mask zooms open with its duration, delay and speed curve', async (t) => {
  if (!diviActive()) return t.skip(SKIP);
  const { page, url, errors } = await openPage(t, [
    { style: 'ellipse', ...onLoad, animationDuration: '800ms', animationDelay: '100ms', animationEasing: 'linear' },
    { style: 'ellipse' },
    { style: 'custom', custom: { src: circle }, transform: ['invert'], ...onLoad },
    // Cover can't be zoomed (a keyword): no animation.
    { style: 'ellipse', size: 'cover', ...onLoad },
  ]);
  const [zoomed, plain, inverted, cover] = [0, 1, 2, 3].map((i) => wraps(page).nth(i));

  assert.deepEqual(await animationsOf(zoomed), [{ name: 'd5im-zoom', duration: 800, delay: 100, easing: 'linear' }]);
  assert.deepEqual(await animationsOf(plain), []);
  assert.deepEqual(await animationsOf(inverted), [{ name: 'd5im-zoom', duration: 500, delay: 0, easing: 'ease' }]);
  assert.deepEqual(await animationsOf(cover), []);

  // Start: nothing of the image shows. End: clipped like without animation.
  for (const [wrap, shown, hidden] of [[zoomed, center, corner], [inverted, corner, center]]) {
    await wrap.scrollIntoViewIfNeeded();
    await seek(wrap, 0);
    const start = await colorsAt(page, wrap, [center, corner]);
    assert.ok(start.every((c) => !isRed(c)), `start: ${start}`);
    await seek(wrap, 1);
    const [visible, masked] = await colorsAt(page, wrap, [shown, hidden]);
    assert.ok(isRed(visible) && !isRed(masked), `end: ${visible} / ${masked}`);
  }
  // The keyframes and the scroll script are printed once per page.
  assert.equal((await pageHtml(url)).match(/id="d5im-animation"/g)?.length, 1);
  assert.deepEqual(errors, []);
});

test('when scrolled into view the mask stays closed until the image is reached', async (t) => {
  if (!diviActive()) return t.skip(SKIP);
  // The first image fills the 400 px high window, the second starts below it.
  const { page, errors } = await openPage(t, [null, { style: 'ellipse', ...onView }]);
  const wrap = wraps(page).nth(1);

  assert.equal(await maskSize(wrap), '0px 0px');
  assert.deepEqual(await animationsOf(wrap), []);
  await wrap.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelectorAll('.et_pb_image_wrap.d5im-in-view').length === 1);
  assert.deepEqual(await animationsOf(wrap), [{ name: 'd5im-zoom', duration: 500, delay: 0, easing: 'ease' }]);
  await seek(wrap, 1);
  const [visible, masked] = await colorsAt(page, wrap, [center, corner]);
  assert.ok(isRed(visible) && !isRed(masked), `end: ${visible} / ${masked}`);
  assert.deepEqual(errors, []);
});

test('without JavaScript a scroll-triggered mask is simply shown', async (t) => {
  if (!diviActive()) return t.skip(SKIP);
  const { page } = await openPage(t, [null, { style: 'ellipse', ...onView }], { javaScriptEnabled: false });
  assert.equal(await maskSize(wraps(page).nth(1)), '100% 100%');
});

test('with reduced motion the mask is shown without animation', async (t) => {
  if (!diviActive()) return t.skip(SKIP);
  const { page } = await openPage(t, [{ style: 'ellipse', ...onLoad }, { style: 'ellipse', ...onView }], { reducedMotion: 'reduce' });
  for (const i of [0, 1]) {
    const wrap = wraps(page).nth(i);
    await wrap.scrollIntoViewIfNeeded();
    assert.deepEqual(await animationsOf(wrap), []);
    assert.equal(await maskSize(wrap), '100% 100%');
  }
});

/** Repeat count, direction and play state of the wrap's animation (null without one). */
const playOf = (locator) =>
  locator.evaluate((el) => {
    const [a] = el.getAnimations();
    return a ? { iterations: a.effect.getTiming().iterations, direction: a.effect.getTiming().direction, state: a.playState } : null;
  });
/** Waits until the i-th image's mask is (or isn't) marked as in view by the page's script. */
const inView = (page, i, expected) =>
  page.waitForFunction(([i, expected]) => document.querySelectorAll('.et_pb_image .et_pb_image_wrap')[i].classList.contains('d5im-in-view') === expected, [i, expected], {
    timeout: 5000,
  });

test('Plays, Loop Endlessly and Direction set how often and which way the zoom runs', async (t) => {
  if (!diviActive()) return t.skip(SKIP);
  const { page, errors } = await openPage(t, [
    { style: 'ellipse', ...onLoad, animationLoop: 'on' },
    { style: 'ellipse', ...onLoad, animationPlays: '3', animationDirection: 'alternate' },
    { style: 'ellipse', ...onLoad },
    // Loop wins over a number of plays.
    { style: 'ellipse', ...onLoad, animationPlays: '3', animationLoop: 'on' },
    // Out of range: at most 10.
    { style: 'ellipse', ...onLoad, animationPlays: '25' },
    // Replay needs the view start: with the load start it has no effect.
    { style: 'ellipse', ...onLoad, animationReplay: 'on' },
  ]);
  const play = (i) => playOf(wraps(page).nth(i));
  assert.deepEqual(await play(0), { iterations: Infinity, direction: 'normal', state: 'running' });
  assert.deepEqual(await play(1), { iterations: 3, direction: 'alternate', state: 'running' });
  assert.equal((await play(2)).iterations, 1);
  assert.equal((await play(3)).iterations, Infinity);
  assert.equal((await play(4)).iterations, 10);
  assert.equal(await wraps(page).nth(5).evaluate((el) => el.classList.contains('d5im-repeat-view')), false);
  assert.deepEqual(errors, []);
});

test('scrolled out and back, a mask with Replay zooms again and one without does not', async (t) => {
  if (!diviActive()) return t.skip(SKIP);
  // Two scroll-started images between plain ones, in a 400 px window: each can be scrolled fully out of view.
  const { page, errors } = await openPage(t, [null, { style: 'ellipse', ...onView }, { style: 'ellipse', ...onView, animationReplay: 'on' }, null, null, null]);
  const [once, again, last] = [wraps(page).nth(1), wraps(page).nth(2), wraps(page).nth(5)];

  await once.scrollIntoViewIfNeeded();
  await inView(page, 1, true);
  await again.scrollIntoViewIfNeeded();
  await inView(page, 2, true);
  await page.waitForTimeout(800); // Deliberate: both zooms (500 ms) finish.
  assert.equal((await playOf(once)).state, 'finished');
  assert.equal((await playOf(again)).state, 'finished');

  // Fully out of view: the replaying mask closes again, the other one stays open.
  await last.scrollIntoViewIfNeeded();
  await inView(page, 2, false);
  assert.equal(await maskSize(again), '0px 0px');
  assert.equal(await maskSize(once), '100% 100%');

  // Back: only the replaying one zooms again.
  await again.scrollIntoViewIfNeeded();
  await inView(page, 2, true);
  assert.equal((await playOf(again)).state, 'running');
  await once.scrollIntoViewIfNeeded();
  assert.equal((await playOf(once)).state, 'finished');
  assert.deepEqual(errors, []);
});

test('Zoom Out shrinks the mask from three times its size onto the shape', async (t) => {
  if (!diviActive()) return t.skip(SKIP);
  const zoomOut = { style: 'ellipse', animation: 'zoomOut' };
  // The third image is below the 400 px window: a scroll-started Zoom Out waits at its start size.
  const { page, errors } = await openPage(t, [{ ...zoomOut, animationTrigger: 'load' }, null, { ...zoomOut, animationTrigger: 'view' }]);
  const wrap = wraps(page).nth(0);

  assert.deepEqual(await animationsOf(wrap), [{ name: 'd5im-zoom', duration: 500, delay: 0, easing: 'ease' }]);
  await seek(wrap, 0);
  const start = await colorsAt(page, wrap, [center, corner]);
  assert.ok(start.every(isRed), `start: most of the image shows: ${start}`);
  await seek(wrap, 1);
  const [visible, masked] = await colorsAt(page, wrap, [center, corner]);
  assert.ok(isRed(visible) && !isRed(masked), `end: ${visible} / ${masked}`);

  assert.equal(await maskSize(wraps(page).nth(2)), '300% 300%');
  assert.deepEqual(errors, []);
});

test('with Outside Opacity only the shape zooms: the faint rest stays', async (t) => {
  if (!diviActive()) return t.skip(SKIP);
  // Also an inverted custom mask: its full layer zooms with the shape, the faint layer doesn't.
  const { page, errors } = await openPage(t, [
    { style: 'ellipse', outsideOpacity: '30%', ...onLoad },
    { style: 'custom', custom: { src: circle }, transform: ['invert'], outsideOpacity: '30%', ...onLoad },
  ]);
  for (const [i, [shown, faint]] of [[center, corner], [corner, center]].entries()) {
    const wrap = wraps(page).nth(i);
    await wrap.scrollIntoViewIfNeeded();
    await seek(wrap, 0);
    const start = await colorsAt(page, wrap, [center, corner]);
    assert.ok(start.every(isFaint), `${i} start: all faint: ${start}`);
    await seek(wrap, 1);
    const [full, rest] = await colorsAt(page, wrap, [shown, faint]);
    assert.ok(isRed(full) && isFaint(rest), `${i} end: ${full} / ${rest}`);
  }
  assert.deepEqual(errors, []);
});
