<?php
/**
 * Plugin Name:       Image Mask for Divi 5
 * Description:       An image mask for the Image module of the Divi 5 Visual Builder: cut the image into one of Divi's mask shapes or into a custom SVG mask.
 * Version:           0.2.1
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

define( 'D5IM_VERSION', '0.2.1' );
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
		'One of Divi\'s mask shapes, or Custom for an image of your own. With a Divi shape the image stays visible where a Divi background would show through the same mask.' => __( 'One of Divi\'s mask shapes, or Custom for an image of your own. With a Divi shape the image stays visible where a Divi background would show through the same mask.', 'divi5-image-mask' ),
		'Custom'            => __( 'Custom', 'divi5-image-mask' ),
		'Custom Mask'       => __( 'Custom Mask', 'divi5-image-mask' ),
		'An SVG or PNG. The image stays visible where the mask is opaque.' => __( 'An SVG or PNG. The image stays visible where the mask is opaque.', 'divi5-image-mask' ),
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
		'Outside Opacity'   => __( 'Outside Opacity', 'divi5-image-mask' ),
		'How much of the image shows outside the shape: 0 % hides it, 100 % shows it fully. For the whole image use Filters › Opacity.' => __( 'How much of the image shows outside the shape: 0 % hides it, 100 % shows it fully. For the whole image use Filters › Opacity.', 'divi5-image-mask' ),
		'Animation'         => __( 'Animation', 'divi5-image-mask' ),
		'Zoom In opens the mask from nothing, Zoom Out shrinks it from three times its size onto the shape, both around its position. Available with Stretch to Fill and Custom Size.' => __( 'Zoom In opens the mask from nothing, Zoom Out shrinks it from three times its size onto the shape, both around its position. Available with Stretch to Fill and Custom Size.', 'divi5-image-mask' ),
		'None'              => __( 'None', 'divi5-image-mask' ),
		'Zoom In'           => __( 'Zoom In', 'divi5-image-mask' ),
		'Zoom Out'          => __( 'Zoom Out', 'divi5-image-mask' ),
		'Animation Start'   => __( 'Animation Start', 'divi5-image-mask' ),
		'On Page Load'      => __( 'On Page Load', 'divi5-image-mask' ),
		'When Scrolled Into View' => __( 'When Scrolled Into View', 'divi5-image-mask' ),
		'Animation Duration' => __( 'Animation Duration', 'divi5-image-mask' ),
		'Animation Delay'   => __( 'Animation Delay', 'divi5-image-mask' ),
		'Animation Speed Curve' => __( 'Animation Speed Curve', 'divi5-image-mask' ),
		'Ease'              => __( 'Ease', 'divi5-image-mask' ),
		'Ease-In-Out'       => __( 'Ease-In-Out', 'divi5-image-mask' ),
		'Ease-In'           => __( 'Ease-In', 'divi5-image-mask' ),
		'Ease-Out'          => __( 'Ease-Out', 'divi5-image-mask' ),
		'Linear'            => __( 'Linear', 'divi5-image-mask' ),
		'Animation Direction' => __( 'Animation Direction', 'divi5-image-mask' ),
		'Alternate plays every second run backwards. With an even number of plays the animation ends where it started.' => __( 'Alternate plays every second run backwards. With an even number of plays the animation ends where it started.', 'divi5-image-mask' ),
		'Normal'            => __( 'Normal', 'divi5-image-mask' ),
		'Alternate'         => __( 'Alternate', 'divi5-image-mask' ),
		'Number of Plays'   => __( 'Number of Plays', 'divi5-image-mask' ),
		'Loop Endlessly'    => __( 'Loop Endlessly', 'divi5-image-mask' ),
		'Replay When Scrolled Back Into View' => __( 'Replay When Scrolled Back Into View', 'divi5-image-mask' ),
		'Once the image has left the window completely, the mask returns to its start and plays again on the way back.' => __( 'Once the image has left the window completely, the mask returns to its start and plays again on the way back.', 'divi5-image-mask' ),
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
 * The URL of the mask's custom image, or '' unless "Custom" is the chosen shape and an image is set.
 *
 * Divi's upload field stores the chosen image as an object ({src, id, alt, …}); a plain URL is accepted as well.
 * Same as customOf() in assets/image-mask.js.
 *
 * @param array $mask The module's image.advanced.mask value.
 */
function d5im_custom_url( array $mask ): string {
	if ( 'custom' !== ( $mask['style'] ?? '' ) ) {
		return '';
	}
	$custom = $mask['custom'] ?? '';
	return esc_url_raw( trim( (string) ( is_array( $custom ) ? ( $custom['src'] ?? '' ) : $custom ) ) );
}

/**
 * The CSS declarations that clip an Image module's .et_pb_image_wrap to its mask ('' without a mask).
 *
 * Same output as maskCss() in assets/image-mask.js, which renders the builder preview. A Divi style uses its
 * "inverted" SVG, so the image shows where a Divi background shows through that mask; the Invert transform takes
 * the regular one. A custom mask (style "custom" plus an image) shows the image where it is opaque; it can only be
 * inverted.
 *
 * @param array $mask The module's image.advanced.mask value: style, custom, transform, aspectRatio, size, width,
 *                    height, position, horizontalOffset, verticalOffset.
 */
function d5im_mask_css( array $mask ): string {
	$transform = is_array( $mask['transform'] ?? null ) ? $mask['transform'] : array();
	$invert    = in_array( 'invert', $transform, true );
	$custom    = d5im_custom_url( $mask );
	$style     = (string) ( $mask['style'] ?? '' );
	$size      = (string) ( $mask['size'] ?? 'stretch' );
	$layers    = array();

	if ( '' !== $custom ) {
		$layers[] = 'url("' . $custom . '")';
	} elseif ( ! in_array( $style, array( '', 'none', 'custom' ), true ) && class_exists( '\ET\Builder\Packages\MaskAndPatternLibrary\Utils\MaskAndPatternUtils' ) ) {
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

	$position   = explode( ' ', (string) ( $mask['position'] ?? 'center' ) );
	$x          = array_values( array_intersect( $position, array( 'left', 'right' ) ) )[0] ?? '';
	$y          = array_values( array_intersect( $position, array( 'top', 'bottom' ) ) )[0] ?? '';
	$x          = '' === $x ? 'left 50%' : $x . ' ' . d5im_length( $mask['horizontalOffset'] ?? '', '0%' );
	$y          = '' === $y ? 'top 50%' : $y . ' ' . d5im_length( $mask['verticalOffset'] ?? '', '0%' );
	$positions  = array( "$x $y" );
	$composite  = '';

	$sizes      = d5im_mask_sizes( $mask );
	$composites = array( 'add' );

	// Inverting a custom mask: subtract it from a full layer (its size: d5im_mask_sizes()). That layer sits at the
	// mask's position, so the zoom animation scales both layers from the same point.
	if ( '' !== $custom && $invert ) {
		$layers[]    = 'linear-gradient(#000 0 0)';
		$positions[] = "$x $y";
		$composites  = array( 'exclude' );
	}

	// Outside Opacity: a translucent full layer on top, added to the shape (after an inverted mask has cut its
	// hole, so the hole gets it too). It never zooms: d5im_animation_css() keeps it at full size.
	$alpha = d5im_outside_alpha( $mask );
	if ( $alpha > 0 ) {
		array_unshift( $layers, 'linear-gradient(rgb(0 0 0/' . $alpha . ') 0 0)' );
		array_unshift( $sizes, '100% 100%' );
		array_unshift( $positions, '0 0' );
		array_unshift( $composites, 'add' );
	}
	$composite = array( 'add' ) === array_unique( $composites ) ? '' : 'mask-composite:' . implode( ',', $composites ) . ';';

	return 'mask-image:' . implode( ',', $layers ) . ';mask-size:' . implode( ',', $sizes ) . ';mask-position:' . implode( ',', $positions ) . ';mask-repeat:no-repeat;' . $composite;
}

/**
 * Outside Opacity as an alpha between 0 and 1, rounded to two decimals (0: the image is hidden outside the shape).
 *
 * @param array $mask The module's image.advanced.mask value (outsideOpacity, e.g. "30%").
 */
function d5im_outside_alpha( array $mask ): float {
	$value = rtrim( trim( (string) ( $mask['outsideOpacity'] ?? '' ) ), '%' );
	return is_numeric( $value ) ? round( max( 0, min( 100, (float) $value ) ) / 100, 2 ) : 0.0;
}

/**
 * The mask's layer sizes (CSS mask-size values): the mask, plus the full layer of an inverted custom mask.
 *
 * @param array $mask The module's image.advanced.mask value.
 */
function d5im_mask_sizes( array $mask ): array {
	$size = (string) ( $mask['size'] ?? 'stretch' );
	if ( 'custom' === $size ) {
		$sizes = array( d5im_length( $mask['width'] ?? '', 'auto' ) . ' ' . d5im_length( $mask['height'] ?? '', 'auto' ) );
	} else {
		$sizes = array( in_array( $size, array( 'cover', 'contain' ), true ) ? $size : '100% 100%' );
	}
	$transform = is_array( $mask['transform'] ?? null ) ? $mask['transform'] : array();
	if ( '' !== d5im_custom_url( $mask ) && in_array( 'invert', $transform, true ) ) {
		$sizes[] = '100% 100%';
	}
	return $sizes;
}

/**
 * The CSS custom properties of a mask's zoom animation, or '' without one: --d5im-start (the mask-size it starts
 * from) and --d5im-animation (the `animation` value; keyframes in D5IM_ANIMATION_CSS).
 *
 * Zoom In starts at size 0, Zoom Out at three times each layer's size; both end at the mask's own size, scaling
 * around its position. Only for "Stretch to Fill" and "Custom Size": cover and contain are keywords, which CSS
 * can't interpolate. Plays (1-10) or Loop Endlessly set the repeat count, Direction "alternate" plays every second
 * run backwards. "Replay" is a class for the script (d5im_render_block()), not CSS. Same output as animationCss()
 * in assets/image-mask.js.
 *
 * @param array $mask The module's image.advanced.mask value (animation, animationDuration, animationDelay,
 *                    animationEasing, animationDirection, animationPlays, animationLoop, plus the mask settings).
 */
function d5im_animation_css( array $mask ): string {
	$animation = $mask['animation'] ?? '';
	if ( ! in_array( $animation, array( 'zoom', 'zoomOut' ), true ) || ! in_array( $mask['size'] ?? 'stretch', array( 'stretch', 'custom' ), true ) ) {
		return '';
	}
	$time      = fn( $value, $fallback ) => is_string( $value ) && preg_match( '/^\d*\.?\d+(ms|s)?$/', $value ) ? ( is_numeric( $value ) ? $value . 'ms' : $value ) : $fallback;
	$easing    = in_array( $mask['animationEasing'] ?? '', array( 'ease-in-out', 'ease-in', 'ease-out', 'linear' ), true ) ? $mask['animationEasing'] : 'ease';
	$plays     = 'on' === ( $mask['animationLoop'] ?? 'off' ) ? 'infinite' : (string) min( 10, max( 1, (int) ( $mask['animationPlays'] ?? 1 ) ) );
	$direction = 'alternate' === ( $mask['animationDirection'] ?? '' ) ? 'alternate' : 'normal';
	// One start size per layer (as in d5im_mask_css()): the Outside Opacity layer stays full.
	$start = array_map(
		fn( $size ) => 'zoom' === $animation ? '0 0' : implode( ' ', array_map( fn( $value ) => "calc($value * 3)", explode( ' ', $size ) ) ),
		d5im_mask_sizes( $mask )
	);
	if ( d5im_outside_alpha( $mask ) > 0 ) {
		array_unshift( $start, '100% 100%' );
	}
	$start = implode( ',', $start );
	return sprintf(
		'--d5im-start:%s;--d5im-animation:d5im-zoom %s %s %s %s %s both;',
		$start,
		$time( $mask['animationDuration'] ?? '', '500ms' ),
		$easing,
		$time( $mask['animationDelay'] ?? '', '0ms' ),
		$plays,
		$direction
	);
}

/*
 * Printed once per page, before the first animated image (inline so it is there before that image is painted).
 * Each animated .et_pb_image_wrap carries --d5im-start and --d5im-animation (d5im_animation_css()) and the class
 * d5im-animate-load or d5im-animate-view. "View" waits for the class d5im-in-view, which the script adds once a
 * fifth of the image is in the window; until then the mask is held at its start size, but only with JavaScript
 * (class d5im-js), so without it the image simply shows. With d5im-repeat-view ("Replay") the script takes the
 * class away again once the image is completely out of the window, so the mask returns to its start unseen and
 * zooms again on the way back. (isIntersecting alone is true for any sliver in view, hence the ratio check.)
 * Everything only applies without a reduced-motion preference.
 */
const D5IM_ANIMATION_CSS = '@keyframes d5im-zoom{from{mask-size:var(--d5im-start)}}'
	. '@media (prefers-reduced-motion:no-preference){.d5im-animate-load,.d5im-animate-view.d5im-in-view{animation:var(--d5im-animation)}'
	. '.d5im-js .d5im-animate-view:not(.d5im-in-view){mask-size:var(--d5im-start)!important}}';
const D5IM_ANIMATION_JS = 'document.documentElement.classList.add("d5im-js");addEventListener("DOMContentLoaded",function(){'
	. 'var o=new IntersectionObserver(function(es){es.forEach(function(e){var c=e.target.classList,r=c.contains("d5im-repeat-view");'
	. 'if(e.intersectionRatio>=0.2){c.add("d5im-in-view");if(!r)o.unobserve(e.target)}else if(r&&!e.isIntersecting){c.remove("d5im-in-view")}})},{threshold:[0,0.2]});'
	. 'document.querySelectorAll(".d5im-animate-view").forEach(function(el){o.observe(el)})});';

/**
 * Adds the mask (and its animation) to the .et_pb_image_wrap of a rendered Image module, as an inline style.
 *
 * @param string $content Rendered block HTML.
 * @param array  $block   Parsed block.
 */
function d5im_render_block( $content, $block ) {
	static $assets_printed = false;
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
	$animation = d5im_animation_css( $mask );
	if ( '' !== $animation ) {
		$css    .= $animation;
		$on_view = 'view' === ( $mask['animationTrigger'] ?? 'load' );
		$html->add_class( $on_view ? 'd5im-animate-view' : 'd5im-animate-load' );
		if ( $on_view && 'on' === ( $mask['animationReplay'] ?? 'off' ) ) {
			$html->add_class( 'd5im-repeat-view' );
		}
	}
	$style = trim( (string) $html->get_attribute( 'style' ) );
	$html->set_attribute( 'style', ( '' === $style ? '' : rtrim( $style, ';' ) . ';' ) . $css );
	$content = $html->get_updated_html();
	if ( '' !== $animation && ! $assets_printed ) {
		$assets_printed = true;
		$content        = '<style id="d5im-animation">' . D5IM_ANIMATION_CSS . '</style><script id="d5im-animation-js">' . D5IM_ANIMATION_JS . '</script>' . $content;
	}
	return $content;
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
