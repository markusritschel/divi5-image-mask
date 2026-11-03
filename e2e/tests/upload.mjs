// Custom masks: administrators (unfiltered_html) may upload SVG files, other roles may not.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BASE, wp, launch, login } from '../lib.mjs';

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>';

test('administrators may upload an SVG mask, authors may not', async (t) => {
  const browser = await launch();
  t.after(() => browser.close());
  // Uploads through the REST API, as the media library does.
  const upload = async (user) => {
    const context = await browser.newContext();
    await login(context, user);
    const nonce = await (await context.request.get(`${BASE}/wp-admin/admin-ajax.php?action=rest-nonce`)).text();
    const response = await context.request.post(`${BASE}/wp-json/wp/v2/media`, {
      headers: { 'X-WP-Nonce': nonce, 'Content-Type': 'image/svg+xml', 'Content-Disposition': 'attachment; filename="d5im-upload.svg"' },
      data: Buffer.from(SVG),
    });
    return { status: response.status(), body: await response.json() };
  };

  const admin = await upload('admin');
  assert.equal(admin.status, 201, JSON.stringify(admin.body));
  t.after(() => wp('post', 'delete', String(admin.body.id), '--force'));
  assert.equal(admin.body.mime_type, 'image/svg+xml');

  const author = await upload('author');
  // Refused for the file type (not for a failed login): WordPress's own "not allowed to upload this file type".
  assert.match(author.body.message ?? '', /not allowed to upload this file type/, JSON.stringify(author.body));
});
