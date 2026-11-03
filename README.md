# Image Mask for Divi 5

Small WordPress plugin that adds a **Bildmaske** (image mask) group to the Divi 5 Image module: cut the image into one of Divi's mask shapes (the same ones as **Background > Mask**) or into a mask you upload yourself.

## Use in Divi

Open an Image module, **Design > Bildmaske**:

| Field            | What it does                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Maskenform       | One of Divi's mask shapes. The image stays visible where a Divi background would show through the same mask.                          |
| Eigene Maske     | An SVG or PNG instead of the shape. The image stays visible where the mask is opaque (drawn), and disappears where it is transparent. |
| Transformation   | Flip horizontally / vertically, rotate by 90°, invert. A custom mask can only be inverted.                                            |
| Seitenverhältnis | Landscape, square or portrait version of Divi's shape (like Divi's mask aspect ratio).                                                |
| Größe            | Stretch (default), cover, fit, or a custom width/height; with anything but stretch also a position and offsets.                       |

The Visual Builder shows the mask live. The mask applies to the whole image frame, so a hover overlay or border set on the image is cut along with it, and a box shadow (drawn outside the frame) disappears.

**SVG uploads**: WordPress refuses SVG files by default. With this plugin active, users who may post unfiltered HTML (administrators) can upload SVGs; other roles can't. PNG or WebP masks with transparency work for everyone.

## Requirements

Divi 5 (tested with 5.15.1), PHP 8.1+, a browser from 2023 or later (unprefixed CSS `mask`).

## Install

Download `divi5-image-mask-vX.Y.Z.zip` from the latest [release](https://github.com/markusritschel/divi5-image-mask/releases) and upload it under **Plugins > Add New > Upload Plugin**. For development, copy or symlink the repository folder to `wp-content/plugins/` (LocalWP) and activate it. Developer notes: [AGENTS.md](AGENTS.md).

## Updates

Installed from a release ZIP, the plugin checks this repository's GitHub releases and offers updates under **Plugins**, like any other plugin. (A plain git checkout has no `vendor/` and therefore no update checks.) While the repository is private, define `define( 'D5IM_GITHUB_TOKEN', '<token>' );` in `wp-config.php` (fine-grained token, read access to Contents).
