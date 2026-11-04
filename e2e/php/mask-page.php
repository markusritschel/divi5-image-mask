<?php
/**
 * A published Divi page with one Image module per entry of the JSON list argument: each entry is the module's
 * image.advanced.mask value (null: no mask attribute at all). Every module shows the same solid red 400×300 PNG,
 * so masked-out areas show the page background. Also writes uploads/d5im-circle.svg, a custom mask for the
 * entries to use. The test deletes the page again.
 * An optional second JSON list holds more block attributes per module (e.g. Divi's own filters), merged in; an
 * optional third JSON object the column's attributes (e.g. a background colour).
 *
 * wp eval-file mask-page.php '<json list>' ['<json list of attributes>' ['<json column attributes>']] → {id, url}
 *
 * @package Divi5ImageMask
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals

$json   = $args[0];
$extras = json_decode( $args[1] ?? '[]', true );
$column = json_decode( $args[2] ?? '{}', true );
$column = $column ? ' ' . serialize_block_attributes( $column ) : '';

$uploads = wp_upload_dir();
$file    = $uploads['basedir'] . '/d5im-red.png';
if ( ! file_exists( $file ) ) {
	$image = imagecreatetruecolor( 400, 300 );
	imagefill( $image, 0, 0, imagecolorallocate( $image, 255, 0, 0 ) );
	imagepng( $image, $file );
}
// A custom mask: an opaque circle in the middle, transparent around it.
file_put_contents( $uploads['basedir'] . '/d5im-circle.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="30"/></svg>' );

$modules = '';
foreach ( json_decode( $json, true ) as $i => $mask ) {
	$attrs = array( 'image' => array( 'innerContent' => array( 'desktop' => array( 'value' => array( 'src' => $uploads['baseurl'] . '/d5im-red.png' ) ) ) ) );
	if ( null !== $mask ) {
		$attrs['image']['advanced']['mask'] = array( 'desktop' => array( 'value' => $mask ) );
	}
	$attrs = array_replace_recursive( $attrs, $extras[ $i ] ?? array() );
	$modules .= '<!-- wp:divi/image ' . serialize_block_attributes( $attrs ) . ' /-->';
}

$id = wp_insert_post(
	array(
		'post_type'    => 'page',
		'post_status'  => 'publish',
		'post_title'   => 'Image mask test ' . wp_generate_password( 6, false ),
		'post_content' => wp_slash( '<!-- wp:divi/placeholder --><!-- wp:divi/section --><!-- wp:divi/row --><!-- wp:divi/column' . $column . ' -->' . $modules . '<!-- /wp:divi/column --><!-- /wp:divi/row --><!-- /wp:divi/section --><!-- /wp:divi/placeholder -->' ),
		// Without it Divi renders no layout wrappers.
		'meta_input'   => array( '_et_pb_use_builder' => 'on' ),
	)
);

echo wp_json_encode(
	array(
		'id'  => $id,
		'url' => get_permalink( $id ),
	)
);
