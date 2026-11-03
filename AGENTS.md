# Image Mask for Divi 5

WordPress plugin (`divi5-image-mask`, prefix `d5im_`, text domain `divi5-image-mask`) that adds a „Bildmaske“ group to the Design tab of Divi 5's Image module: the image is clipped (CSS `mask-*`) to one of Divi's background mask shapes or to an uploaded SVG/PNG. Modelled on Divi's **Background > Mask** settings (shape picker, transform buttons, aspect ratio, size, position, offsets), without its colour and blend mode, which mean nothing for a clip. UI texts are German, like `../divi5-woocommerce-additions`, whose builder-filter pattern this plugin follows.

## Commands

```bash
# Test site (Docker, http://localhost:8094, admin/admin, author/author): WordPress + this plugin + Divi 5
e2e/setup.sh ~/Projekte/webdesign/Divi/Divi.zip      # Divi is licensed: it goes into the Docker volume, never the repo
cd e2e && pnpm install && CHROMIUM_PATH=/usr/bin/chromium pnpm test   # ~100 s; the Divi tests skip without Divi
docker compose -f e2e/docker-compose.yml down -v     # throw the test site away
```

LocalWP: symlink the repo into the site like the other Divi plugins:
`ln -s ~/Projekte/webdesign/Divi/divi5-image-mask ~/Webdesign/LocalSites/<site>/app/public/wp-content/plugins/divi5-image-mask`.
There is no build step: `assets/image-mask.js` is plain JavaScript.

Release ZIP and updates (same pattern as `../divi5-mobile-menu`):

```bash
composer install --no-dev          # the update checker (vendor/, gitignored); optional in a dev checkout
bash bin/make-zip.sh               # dist/divi5-image-mask-<version>.zip, needs vendor/ and zip
# release: bump Version + D5IM_VERSION in divi5-image-mask.php, commit, then
git tag vX.Y.Z && git push --tags  # .github/workflows/release.yml builds the ZIP and attaches it to the GitHub release
```

Without a local Composer: `docker run --rm -u "$(id -u):$(id -g)" -v "$PWD":/app -w /app composer:2 install --no-dev --ignore-platform-req=php`.

## Architecture

One PHP file (`divi5-image-mask.php`) and one builder script (`assets/image-mask.js`). The settings live in one attribute, `image.advanced.mask` (`group-items`, desktop value only), an object with `style`, `custom`, `transform` (array of `flipHorizontal`, `flipVertical`, `rotate`, `invert`, as Divi's mask transform stores it), `aspectRatio`, `size`, `width`, `height`, `position`, `horizontalOffset`, `verticalOffset`. Missing keys mean Divi's mask defaults (landscape, stretch, center, 0 %).

**Builder side** (`assets/image-mask.js`, loaded into the app window through `PackageBuildManager::register_package_build()` on `divi_visual_builder_assets_before_enqueue_scripts`, dependencies `divi-module-library` and `divi-vendor-wp-hooks`). The filters `divi.moduleLibrary.moduleAttributes.divi.image` and `divi.moduleLibrary.moduleSettings.groups.divi.image` add the attribute and the group `designImageMask` (Design tab, priority 20). Fields are Divi's own components: `divi/select-mask` with `hasPreview: false` (Divi's thumbnails plus a „None“ entry, without the background's add/remove canvas; „None“ stores `style: "none"`), `divi/upload` for the custom mask, `divi/button-options` with `multipleChoices` for the transform (copied from Divi's mask field definition, which needs `onChangeParams: ["multipleChoices"]`), `divi/select` and `divi/range`. Each field's `visible({attrs})` hides what doesn't apply (transform/size without a mask, aspect ratio for a custom mask, width/height unless size is custom, position/offsets while stretched). The transform field's `filterComponentProps` receives the module's `attrs` too and offers only „Umkehren“ while a custom mask is set. Labels are single words because Divi title-cases them („Seitenverhältnis Der Maske“).
Divi's mask bundle (`window.divi.maskAndPatternLibrary`) is _not_ a WordPress dependency: Divi 5.15.1 registers it with `enqueue_app_window: false` and loads it itself after the first render, so naming it as a dependency makes WordPress drop the script. The script looks it up when it builds CSS.

**Preview**. The builder renders the module in React, without the plugin's PHP. `syncPreview` (on a `MutationObserver` and a `divi.data` subscription, once per animation frame) reads `getModuleAttr(<uuid from the module's class et_pb_image_<uuid>>, 'image.advanced.mask')` for every Image module and writes one rule per masked module into `<style id="d5im-preview">` (`.et_pb_image_<uuid> .et_pb_image_wrap{…}`). A stylesheet rather than inline styles, so React re-renders can't wipe it. While Divi's mask bundle hasn't arrived, `maskCss()` returns `null` and the sync retries every 250 ms (deliberate: nothing else wakes it when the bundle loads).

**CSS** (`d5im_mask_css()` in PHP, `maskCss()` in JS, same logic, same output). A Divi shape comes from Divi's library (`MaskAndPatternUtils::get_mask_svg()` / `getMaskSvg()`, both `escape: false`), so shapes added through Divi's `divi_mask_and_pattern_library_mask` filter work too. It uses the shape's _inverted_ SVG: Divi paints its regular path _over_ the background (the „Ellipse“ is a frame with an elliptical hole), so the inverted path is where the background shows through, and the image shows there. „Umkehren“ takes the regular SVG. Rotation picks Divi's `rotated` variant; flips are a `<g transform="matrix(…)">` around the SVG's content (viewBox sizes from `get_mask_default_viewbox_settings()`), because a CSS transform would flip the image as well. The SVG goes into `url("data:image/svg+xml,<rawurlencode / encodeURIComponent>")`. A custom mask is `url("<esc_url_raw>")` and shows the image where it is opaque; inverted, it is excluded from a full `linear-gradient` layer (`mask-composite: exclude`). Size: stretch → `100% 100%` (not Divi's mask `calc(100% + 2px)`, which bleeds over seams of an overlay and would only shift a clip), cover/contain, custom → `<width> <height>` (`auto` for empty). Position: always four-value (`left|right <offset> top|bottom <offset>`, `left 50%`/`top 50%` for centre), written here rather than with Divi's `get_background_position_css()`, which turns single-word positions like „Oben“ into `center`. `mask-repeat: no-repeat`. Lengths are checked against a pattern (number with px, %, em, rem, vw, vh), anything else falls back to the default.

**Page side**. `render_block` on `divi/image` reads the attribute from the block, and `WP_HTML_Tag_Processor` appends the CSS to the `style` attribute of the first `.et_pb_image_wrap`. Inline, so there is no order-class or static-CSS-cache dependency.

**SVG uploads** (`d5im_upload_mimes`). WordPress refuses SVGs (they can carry scripts). The `upload_mimes` filter allows `svg` for users with `unfiltered_html` only (administrators on a single site, super admins on multisite): they can already add any HTML, so this opens nothing new. Other roles get WordPress's „not allowed to upload this file type“.

**Updates**. `d5im_register_updater()` sets up Plugin Update Checker (`vendor/`, from Composer) against this repository's GitHub releases, taking the asset `divi5-image-mask-v<version>.zip` that the release workflow attaches; the `Update URI` header keeps wordpress.org from claiming the slug. Without `vendor/` or on any error it does nothing (deliberate: never break the site for updates). `D5IM_GITHUB_TOKEN` in `wp-config.php` authenticates while the repository is private.

**Tests** (`e2e/`, node:test + Playwright against the Docker site). `cases.mjs` lists 14 mask settings (none, shapes with every transform, custom size/position/offset, custom SVG plain and inverted, custom winning over a shape), each with points where the image must be visible or masked out; `php/mask-page.php` builds a page with one Image module per case, all showing a solid red 400×300 PNG, and writes `uploads/d5im-circle.svg` as the custom mask. The check reads the rendered pixels from a screenshot (`colorsAt()` decodes it on a canvas: red = visible), so it tests what a visitor sees, not the CSS text. `page.mjs` runs the cases on the page, `builder.mjs` in the builder preview (same pixels), drives the sidebar (shape picker → „Arch“, „Horizontal spiegeln“ button, Save, then the page), and checks the transform options with and without a custom mask. Fields are found by Divi's classes `.et-vb-field-image-advanced-mask-<subName>` and `button[data-name]`. `upload.mjs` uploads an SVG through the REST API as admin (201) and as author (refused for the file type).

## Known limitations & improvements

- **[high] Relies on Divi 5 internals** (filter names, attribute/group schema, `divi/select-mask` and its `hasPreview` prop, `MaskAndPatternUtils`, `window.divi.maskAndPatternLibrary`, the lazy loading of that bundle), checked with Divi 5.15.1 only. After Divi updates, open the module's „Bildmaske“ group and run `pnpm test`.
- **[medium] One value for all breakpoints, no hover or sticky state.** The fields have `responsive`, `hover` and `sticky` off. Per-breakpoint masks would need a `<style>` with media queries instead of the inline style.
- **[medium] Option group presets untested.** The fields declare `preset: ["style"]` like Divi's overlay fields; saving the group as a preset and applying it has not been tried.
- **[low] Box shadow, border and hover overlay** sit on or inside `.et_pb_image_wrap` and are clipped with the image (a box shadow vanishes). Follows from CSS; not covered by a test.
- **[low] Custom masks can't be flipped or rotated**: a CSS mask has no transform of its own, and an SVG used as a mask image can't reference the uploaded file. Prepare the file the right way round.
- **[low] Uploaded SVGs are not sanitized.** Only `unfiltered_html` users can upload them, and the plugin only uses them as CSS mask images (never inline), but the file itself stays reachable by URL like any upload.
- **[low] SVGs in the media library** have no size metadata, so WordPress shows their thumbnails small or blank and logs `Undefined array key "width"/"height"` (`wp-admin/includes/image.php`) once per upload; the mask itself works.
- **[low] German labels in the builder** are hardcoded in the script (no translation layer).
- PLACEHOLDERS: none.
