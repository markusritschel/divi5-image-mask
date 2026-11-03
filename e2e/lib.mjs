// Shared helpers for the tests against the local WordPress from e2e/setup.sh.
// CHROMIUM_PATH=/usr/bin/chromium uses a system browser instead of Playwright's own.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const DIR = fileURLToPath(new URL('.', import.meta.url));
export const BASE = `http://localhost:${process.env.E2E_PORT || 8094}`;

const compose = (...args) => execFileSync('docker', ['compose', ...args], { cwd: DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/** wp-cli in the test site. */
export const wp = (...args) => compose('run', '--rm', '-T', 'cli', 'wp', ...args);

/** Runs e2e/php/<name>.php in the test site and returns its JSON output. */
export const php = (name, ...args) => JSON.parse(wp('eval-file', `/e2e-php/${name}.php`, ...args.map(String)));

/** Divi or a child theme of it. */
export const diviActive = () => wp('eval', 'echo get_template();') === 'Divi';

/**
 * A page's HTML. Without keep-alive: wp-cli (execFileSync) blocks the event loop longer than Apache keeps an idle
 * connection, and fetch would otherwise reuse that closed socket for the next page ("other side closed").
 */
export const pageHtml = async (url) => (await fetch(url, { headers: { connection: 'close' } })).text();

export const launch = () => chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

/** Logs a context in as `user` (password = user name, see setup.sh). */
export async function login(context, user = 'admin') {
  const page = await context.newPage();
  await page.goto(`${BASE}/wp-login.php`);
  await page.fill('#user_login', user);
  await page.fill('#user_pass', user);
  await page.click('#wp-submit');
  await page.waitForURL(/wp-admin/);
  await page.close();
}

/**
 * The rendered colours [r, g, b] of `locator` at relative points [[x, y], …] (0..1), from a screenshot: what the
 * visitor sees, masked areas showing the page background.
 */
export async function colorsAt(page, locator, points) {
  const png = (await locator.screenshot()).toString('base64');
  return page.evaluate(async ({ png, points }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${png}`;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return points.map(([x, y]) => [...ctx.getImageData(Math.round(x * (img.width - 1)), Math.round(y * (img.height - 1)), 1, 1).data.slice(0, 3)]);
  }, { png, points });
}

/** The fixture image's red, as opposed to the white page behind a masked-out area. */
export const isRed = ([r, g, b]) => r > 200 && g < 80 && b < 80;
