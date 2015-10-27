<?php
class WA_Fronted_Shortcake extends Shortcode_UI{

	public function __construct(){
		add_action( 'wa_fronted_after_scripts', array( $this, 'shortcake_scripts' ) );
		add_action( 'wa_fronted_after_scripts', array( Shortcode_UI::get_instance(), 'action_admin_enqueue_scripts' ) );
		add_action( 'wa_fronted_after_scripts', array( Shortcode_UI::get_instance(), 'action_wp_enqueue_editor' ) );
		add_action( 'wa_fronted_footer_scripts', array( Shortcode_UI::get_instance(), 'action_admin_print_footer_scripts' ));
	}

	public function shortcake_scripts( $options ){
		wp_enqueue_script(
			'wa-fronted-shortcake-scripts',
			plugins_url( '/shortcake.min.js', __FILE__ ),
			array( 
				'wa-fronted-scripts'
			),
			'0.1',
			true
		);
	}

}
new WA_Fronted_Shortcake;