<?php
/**
 * Plugin Name:       Image Mask for Divi 5
 * Description:       An image mask for the Image module of the Divi 5 Visual Builder: cut the image into one of Divi's mask shapes or into a custom SVG mask.
 * Version:           0.1.0
 * Requires at least: 6.5
 * Requires PHP:      8.1
 * Author:            Markus Ritschel
 * License:           GPL-2.0-or-later
 * Text Domain:       divi5-image-mask
 * Domain Path:       /languages
 * Plugin URI:        https://github.com/markusritschel/divi5-image-mask
 * Update URI:        https://github.com/markusritschel/divi5-image-mask
 *
 * @package Divi5ImageMask
 */

defined( 'ABSPATH' ) || exit;

define( 'D5IM_VERSION', '0.1.0' );
define( 'D5IM_FILE', __FILE__ );

// Composer dependencies (Plugin Update Checker); absent in a plain git checkout.
if ( is_readable( plugin_dir_path( D5IM_FILE ) . 'vendor/autoload.php' ) ) {
	require_once plugin_dir_path( D5IM_FILE ) . 'vendor/autoload.php';
}

/**
 * Updates from GitHub releases, from the ZIP that .github/workflows/release.yml attaches (it contains vendor/).
 *
 * Independent of Divi. A missing library or any error means no update checks and nothing else changes: updates
 * are a convenience and must never break the site.
 */
function d5im_register_updater() {
	$factory = '\\YahnisElsts\\PluginUpdateChecker\\v5\\PucFactory';
	if ( ! class_exists( $factory ) ) {
		return;
	}
	try {
		$checker = $factory::buildUpdateChecker( 'https://github.com/markusritschel/divi5-image-mask/', D5IM_FILE, 'divi5-image-mask' );
		// While the repository is private: define( 'D5IM_GITHUB_TOKEN', '...' ) in wp-config.php (read-only token).
		if ( defined( 'D5IM_GITHUB_TOKEN' ) && '' !== D5IM_GITHUB_TOKEN ) {
			$checker->setAuthentication( D5IM_GITHUB_TOKEN );
		}
		$api = $checker->getVcsApi();
		if ( method_exists( $api, 'enableReleaseAssets' ) ) {
			$api->enableReleaseAssets( '/^divi5-image-mask-v[\\d.]+\\.zip$/' );
		}
	} catch ( \Throwable $e ) {
		return;
	}
}
d5im_register_updater();

/**
 * Loads the plugin's translations (languages/, German included).
 */
function d5im_load_textdomain() {
	load_plugin_textdomain( 'divi5-image-mask', false, dirname( plugin_basename( D5IM_FILE ) ) . '/languages' );
}
add_action( 'init', 'd5im_load_textdomain' );

/**
 * The builder script's texts, English => translated. The script shows them through its __(), by English text.
 *
 * Translated here rather than with wp.i18n in the script: one .mo file for everything, no JSON translation files.
 * Each text is spelled out so that gettext tools (wp i18n make-pot) find it; e2e/tests/strings.mjs checks that the
 * script uses no text missing here.
 */
function d5im_builder_texts(): array {
	return array(
		'Image Mask'        => __( 'Image Mask', 'divi5-image-mask' ),
		'Mask Shape'        => __( 'Mask Shape', 'divi5-image-mask' ),
		'One of Divi\'s mask shapes. The image stays visible where a Divi background would show through the same mask.' => __( 'One of Divi\'s mask shapes. The image stays visible where a Divi background would show through the same mask.', 'divi5-image-mask' ),
		'Custom Mask'       => __( 'Custom Mask', 'divi5-image-mask' ),
		'An SVG or PNG instead of the mask shape. The image stays visible where the mask is opaque.' => __( 'An SVG or PNG instead of the mask shape. The image stays visible where the mask is opaque.', 'divi5-image-mask' ),
		'Transform'         => __( 'Transform', 'divi5-image-mask' ),
		'Flip Horizontal'   => __( 'Flip Horizontal', 'divi5-image-mask' ),
		'Flip Vertical'     => __( 'Flip Vertical', 'divi5-image-mask' ),
		'Rotate 90°'        => __( 'Rotate 90°', 'divi5-image-mask' ),
		'Invert'            => __( 'Invert', 'divi5-image-mask' ),
		'Aspect Ratio'      => __( 'Aspect Ratio', 'divi5-image-mask' ),
		'Landscape'         => __( 'Landscape', 'divi5-image-mask' ),
		'Square'            => __( 'Square', 'divi5-image-mask' ),
		'Portrait'          => __( 'Portrait', 'divi5-image-mask' ),
		'Size'              => __( 'Size', 'divi5-image-mask' ),
		'Stretch to Fill'   => __( 'Stretch to Fill', 'divi5-image-mask' ),
		'Cover'             => __( 'Cover', 'divi5-image-mask' ),
		'Fit'               => __( 'Fit', 'divi5-image-mask' ),
		'Custom Size'       => __( 'Custom Size', 'divi5-image-mask' ),
		'Width'             => __( 'Width', 'divi5-image-mask' ),
		'Height'            => __( 'Height', 'divi5-image-mask' ),
		'Position'          => __( 'Position', 'divi5-image-mask' ),
		'Center'            => __( 'Center', 'divi5-image-mask' ),
		'Top Left'          => __( 'Top Left', 'divi5-image-mask' ),
		'Top'               => __( 'Top', 'divi5-image-mask' ),
		'Top Right'         => __( 'Top Right', 'divi5-image-mask' ),
		'Right'             => __( 'Right', 'divi5-image-mask' ),
		'Bottom Right'      => __( 'Bottom Right', 'divi5-image-mask' ),
		'Bottom'            => __( 'Bottom', 'divi5-image-mask' ),
		'Bottom Left'       => __( 'Bottom Left', 'divi5-image-mask' ),
		'Left'              => __( 'Left', 'divi5-image-mask' ),
		'Horizontal Offset' => __( 'Horizontal Offset', 'divi5-image-mask' ),
		'Vertical Offset'   => __( 'Vertical Offset', 'divi5-image-mask' ),
	);
}

/**
 * Loads the builder script (assets/image-mask.js) into the Visual Builder's app window: the "Image Mask" group on
 * the Image module and its live preview.
 */
function d5im_enqueue_visual_builder_assets() {
	if ( ! et_builder_d5_enabled() || ! et_core_is_fb_enabled() ) {
		return;
	}
	$file = plugin_dir_path( D5IM_FILE ) . 'assets/image-mask.js';
	\ET\Builder\VisualBuilder\Assets\PackageBuildManager::register_package_build(
		array(
			'name'    => 'divi5-image-mask',
			'version' => D5IM_VERSION . '.' . filemtime( $file ),
			'script'  => array(
				'src'                => plugins_url( 'assets/image-mask.js', D5IM_FILE ),
				// Not 'divi-mask-and-pattern-library': Divi loads that bundle itself, after the first render.
				'deps'               => array( 'divi-module-library', 'divi-vendor-wp-hooks' ),
				'enqueue_top_window' => false,
				'enqueue_app_window' => true,
				// Global Divi5ImageMaskData in the app window.
				'data_app_window'    => array( 'texts' => d5im_builder_texts() ),
			),
		)
	);
}
add_action( 'divi_visual_builder_assets_before_enqueue_scripts', 'd5im_enqueue_visual_builder_assets' );

/**
 * A CSS length from a mask setting, or $fallback for anything else (the value ends up in a style attribute).
 *
 * @param mixed  $value    Setting value, e.g. "50%" or "120px".
 * @param string $fallback Returned for an empty or invalid value.
 */
function d5im_length( $value, string $fallback ): string {
	return is_string( $value ) && preg_match( '/^-?\d*\.?\d+(px|%|em|rem|vw|vh)?$/', $value ) ? $value : $fallback;
}

/**
 * The CSS declarations that clip an Image module's .et_pb_image_wrap to its mask ('' without a mask).
 *
 * Same output as maskCss() in assets/image-mask.js, which renders the builder preview. A Divi style uses its
 * "inverted" SVG, so the image shows where a Divi background shows through that mask; the Invert transform takes
 * the regular one. A custom mask (an image URL) shows the image where it is opaque; it can only be inverted.
 *
 * @param array $mask The module's image.advanced.mask value: style, custom, transform, aspectRatio, size, width,
 *                    height, position, horizontalOffset, verticalOffset.
 */
function d5im_mask_css( array $mask ): string {
	$transform = is_array( $mask['transform'] ?? null ) ? $mask['transform'] : array();
	$invert    = in_array( 'invert', $transform, true );
	$custom    = esc_url_raw( trim( (string) ( $mask['custom'] ?? '' ) ) );
	$style     = (string) ( $mask['style'] ?? '' );
	$size      = (string) ( $mask['size'] ?? 'stretch' );
	$layers    = array();

	if ( '' !== $custom ) {
		$layers[] = 'url("' . $custom . '")';
	} elseif ( '' !== $style && 'none' !== $style && class_exists( '\ET\Builder\Packages\MaskAndPatternLibrary\Utils\MaskAndPatternUtils' ) ) {
		$utils = '\ET\Builder\Packages\MaskAndPatternLibrary\Utils\MaskAndPatternUtils';
		$type  = in_array( $mask['aspectRatio'] ?? '', array( 'portrait', 'square' ), true ) ? $mask['aspectRatio'] : 'landscape';
		$svg   = $utils::get_mask_svg(
			array(
				'style'    => $style,
				'color'    => '#000',
				'size'     => $size,
				'type'     => $type,
				'rotated'  => in_array( 'rotate', $transform, true ),
				'inverted' => ! $invert,
				'escape'   => false,
			)
		);
		if ( '' === $svg ) {
			return '';
		}
		// Flips go into the SVG: a CSS transform would flip the image too.
		$flip_h = in_array( 'flipHorizontal', $transform, true );
		$flip_v = in_array( 'flipVertical', $transform, true );
		if ( $flip_h || $flip_v ) {
			list( , , $width, $height ) = explode( ' ', $utils::get_mask_default_viewbox_settings()[ $type ] );
			$matrix = sprintf( 'matrix(%d 0 0 %d %d %d)', $flip_h ? -1 : 1, $flip_v ? -1 : 1, $flip_h ? $width : 0, $flip_v ? $height : 0 );
			$open   = strpos( $svg, '>' ) + 1;
			$svg    = substr( $svg, 0, $open ) . '<g transform="' . $matrix . '">' . substr( $svg, $open, -6 ) . '</g></svg>';
		}
		$layers[] = 'url("data:image/svg+xml,' . rawurlencode( $svg ) . '")';
	} else {
		return '';
	}

	if ( 'custom' === $size ) {
		$css_size = d5im_length( $mask['width'] ?? '', 'auto' ) . ' ' . d5im_length( $mask['height'] ?? '', 'auto' );
	} else {
		$css_size = in_array( $size, array( 'cover', 'contain' ), true ) ? $size : '100% 100%';
	}
	$position   = explode( ' ', (string) ( $mask['position'] ?? 'center' ) );
	$x          = array_values( array_intersect( $position, array( 'left', 'right' ) ) )[0] ?? '';
	$y          = array_values( array_intersect( $position, array( 'top', 'bottom' ) ) )[0] ?? '';
	$x          = '' === $x ? 'left 50%' : $x . ' ' . d5im_length( $mask['horizontalOffset'] ?? '', '0%' );
	$y          = '' === $y ? 'top 50%' : $y . ' ' . d5im_length( $mask['verticalOffset'] ?? '', '0%' );
	$sizes      = array( $css_size );
	$positions  = array( "$x $y" );
	$composite  = '';

	// Inverting a custom mask: subtract it from a full layer.
	if ( '' !== $custom && $invert ) {
		$layers[]    = 'linear-gradient(#000 0 0)';
		$sizes[]     = '100% 100%';
		$positions[] = '0 0';
		$composite   = 'mask-composite:exclude;';
	}

	return 'mask-image:' . implode( ',', $layers ) . ';mask-size:' . implode( ',', $sizes ) . ';mask-position:' . implode( ',', $positions ) . ';mask-repeat:no-repeat;' . $composite;
}

/**
 * Adds the mask to the .et_pb_image_wrap of a rendered Image module, as an inline style.
 *
 * @param string $content Rendered block HTML.
 * @param array  $block   Parsed block.
 */
function d5im_render_block( $content, $block ) {
	if ( 'divi/image' !== ( $block['blockName'] ?? '' ) ) {
		return $content;
	}
	$mask = $block['attrs']['image']['advanced']['mask']['desktop']['value'] ?? null;
	$css  = is_array( $mask ) ? d5im_mask_css( $mask ) : '';
	if ( '' === $css ) {
		return $content;
	}
	$html = new WP_HTML_Tag_Processor( $content );
	if ( ! $html->next_tag( array( 'class_name' => 'et_pb_image_wrap' ) ) ) {
		return $content;
	}
	$style = trim( (string) $html->get_attribute( 'style' ) );
	$html->set_attribute( 'style', ( '' === $style ? '' : rtrim( $style, ';' ) . ';' ) . $css );
	return $html->get_updated_html();
}
add_filter( 'render_block', 'd5im_render_block', 10, 2 );

/**
 * Lets users who may post unfiltered HTML (administrators) upload SVG files, for custom masks.
 *
 * WordPress refuses SVG uploads because an SVG can carry scripts; those users can already add any HTML, so this
 * opens nothing new for them. Other roles still can't upload SVGs.
 *
 * @param array $mimes Allowed upload types, extension regex => MIME type.
 */
function d5im_upload_mimes( $mimes ) {
	if ( current_user_can( 'unfiltered_html' ) ) {
		$mimes['svg'] = 'image/svg+xml';
	}
	return $mimes;
}
add_filter( 'upload_mimes', 'd5im_upload_mimes' );
