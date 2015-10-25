<?php
/*
	Plugin Name: WA-Fronted
	Plugin URI: http://github.com/jesperbjerke/wa-fronted
	Description: Edit content directly from fronted in the contents actual place
	Version: 1.2.1
	Text Domain: wa-fronted
	Domain Path: /languages
	Author: Jesper Bjerke
	Author URI: http://www.westart.se
	Network: True
	License: GPLv2
*/

/**
 * Plugin updater curtesy of @link https://github.com/YahnisElsts
 */
require_once 'plugin-update-checker/plugin-update-checker.php';
$Plugin_Updater = PucFactory::getLatestClassVersion('PucGitHubChecker');
$WA_Fronted_Updater = new $Plugin_Updater(
    'https://github.com/jesperbjerke/wa-fronted/',
    __FILE__,
    'master'
);

/**
 * Enable automatic background updates for this plugin
 */
function auto_update_wa_fronted ( $update, $item ) {
    // Array of plugin slugs to always auto-update
    $plugins = array (
        'wa-fronted'
    );
    if ( in_array( $item->slug, $plugins ) ) {
        return true; // Always update plugins in this array
    } else {
        return $update; // Else, use the normal API response to decide whether to update or not
    }
}
add_filter( 'auto_update_plugin', 'auto_update_wa_fronted', 10, 2 );

class WA_Fronted {

	static $options;
	protected $supported_custom_fields;

	/**
	 * Add hooks and actions and registers ajax function for saving
	 * Also adds filters for rendering shortcodes
	 */
	public function __construct(){
		if(is_user_logged_in() && !is_admin()){
			add_action( 'wp', array( $this, 'wa_has_wp' ) );
			add_action( 'wp_enqueue_scripts', array( $this, 'scripts_and_styles' ) );
			add_action( 'wp_footer', array( $this, 'wa_fronted_toolbar' ) );
			add_action( 'wp_footer', array( $this, 'wa_fronted_footer' ) );
			add_action( 'wp_print_footer_scripts', array( $this, 'wa_fronted_footer_scripts' ) );
			add_filter( 'the_content', array( $this, 'filter_shortcodes' ) );
			
			do_action( 'wa_fronted_inited' );
		}

		add_action( 'wp_ajax_wa_fronted_save', array( $this, 'wa_fronted_save' ) );
		add_action( 'wp_ajax_wa_fronted_autosave', array( $this, 'wa_fronted_autosave' ) );
		add_action( 'wp_ajax_wa_fronted_get_autosave', array( $this, 'wa_fronted_get_autosave' ) );
		add_action( 'wp_ajax_wa_render_shortcode', array( $this, 'wa_render_shortcode' ) );
		add_action( 'wp_ajax_wa_get_image_src', array( $this, 'wa_get_image_src' ) );
		add_action( 'wp_ajax_wa_get_oembed', array( $this, 'wa_get_oembed' ) );
		add_action( 'wp_ajax_wa_get_thumbnail_id', array( $this, 'wa_get_thumbnail_id' ) );
		add_action( 'wp_ajax_wa_set_thumbnail', array( $this, 'wa_set_thumbnail' ) );
		add_action( 'wp_ajax_wa_delete_post_thumbnail', array( $this, 'wa_delete_post_thumbnail' ) );
		add_action( 'wp_ajax_wa_create_image', array( $this, 'wa_create_image' ) );
		add_action( 'wp_ajax_wa_add_tax_term', array( $this, 'wa_add_tax_term' ) );
		add_action( 'wp_ajax_wa_get_revisions', array( $this, 'wa_get_revisions' ) );
	}

	/**
	 * After wp is fully loaded, get options if on frontend and logged in and check for posted data
	 */
	public function wa_has_wp(){
		WA_Fronted::$options = $this->get_options();

		require_once( ABSPATH . '/wp-admin/includes/post.php' );
		require_once( ABSPATH . '/wp-admin/includes/admin.php' );

		//Check post data and validate form nonce
		if(isset($_POST['wa_fronted_settings_nonce']) && wp_verify_nonce($_POST['wa_fronted_settings_nonce'], 'wa_fronted_settings_save')){
			$this->settings_form_save();
		}

		do_action( 'wa_fronted_after_init', WA_Fronted::$options );
	}

	/**
	 * Compiles and merges the default options with user defined options so that no fields are empty
	 * @param  array $default_options
	 * @param  array $new_options
	 * @return array $options filtered through 'compile_options' filter
	 */
	protected function compile_options($default_options, $new_options){

		$compiled_options = array_merge($default_options, $new_options);

		if($compiled_options['field_type'] == false){
			trigger_error('"field_type" cannot be empty', E_USER_ERROR);
		}

		//determine options based on field_type
		$field_type = $compiled_options['field_type'];

		if($field_type == 'post_title'){
			if(!array_key_exists('toolbar', $new_options)){
				$compiled_options['toolbar'] = false;
			}
		}else if($field_type == 'post_thumbnail'){
			if(!array_key_exists('media_upload', $new_options)){
				$compiled_options['media_upload'] = 'only';
			}
		}else if($field_type == 'post_content'){
			if(!array_key_exists('shortcodes', $new_options)){
				$compiled_options['shortcodes'] = true;
			}
		}else if(strpos($field_type, 'meta_') !== false){

			if(!isset($this->supported_custom_fields)){
				$this->supported_custom_fields = $this->get_supported_custom_fields();
			}

			if(in_array($field_type, $this->supported_custom_fields)){
				switch($field_type){
					case 'meta_email':
						if($field_type == 'meta_email' && !array_key_exists('validation', $new_options)){
							$compiled_options['validation'] = array(
								'type' => 'is_email'
							);
						}
					case 'meta_url':
						if($field_type == 'meta_url' && !array_key_exists('validation', $new_options)){
							$compiled_options['validation'] = array(
								'type' => 'is_url'
							);
						}
					case 'meta_number':
						if($field_type == 'meta_number' && !array_key_exists('validation', $new_options)){
							$compiled_options['validation'] = array(
								'type' => 'is_num'
							);
						}
					case 'meta_text':
						if(!array_key_exists('paragraphs', $new_options)){
							$compiled_options['paragraphs'] = false;
						}
					case 'meta_textarea':
						if($field_type == 'meta_textarea' && !array_key_exists('validation', $new_options)){
							$compiled_options['paragraphs'] = true;
						}

						if(!array_key_exists('toolbar', $new_options)){
							$compiled_options['toolbar'] = false;
						}

						if(!array_key_exists('media_upload', $new_options)){
							$compiled_options['media_upload'] = false;
						}
						break;
					case 'meta_wysiwyg':
						if(!array_key_exists('toolbar', $new_options)){
							$compiled_options['toolbar'] = 'full';
						}

						if(!array_key_exists('media_upload', $new_options)){
							$compiled_options['media_upload'] = true;
						}

						if(!array_key_exists('shortcodes', $new_options)){
							$compiled_options['shortcodes'] = true;
						}
						break;
					case 'meta_image':
						$compiled_options['toolbar']      = false;
						$compiled_options['media_upload'] = 'only';
						break;
				}
			}else{
				trigger_error('Custom field type "' . $field_type . '" is not yet supported', E_USER_ERROR);
			}
		}

		return apply_filters('compile_options', $compiled_options, $default_options, $new_options);
	}

	/**
	 * Checks permission with current users capabilities or role
	 * @param  string $permission
	 * @return boolean
	 */
	protected function check_permission($permission){
		switch($permission){
			case 'logged-in':
				return is_user_logged_in();
				break;
			case 'default':
				return current_user_can('edit_posts');
				break;
			default:
				return in_array($permission, wp_get_current_user()->roles);
		}
	}

	/**
	 * Reads config array by applied filter 'wa_fronted_options'
	 * @return mixed 	returns false if no areas can be edited by current user, else json object with options
	 */
	protected function get_options(){

		$options = apply_filters('wa_fronted_options', array());

		if(!is_array($options) || empty($options) || $options == ''){
			return false;
		}

		global $post;

		$default_options = array(
			'native'       => true,
			'direction'    => 'ltr',
			'media_upload' => true,
			'toolbar'      => 'full',
			'post_id'      => $post->ID,
			'shortcodes'   => false,
			'field_type'   => false,
			'permission'   => 'default',
			'image_size'   => 'post-thumbnail',
			'paragraphs'   => true,
			'validation'   => false
		);

		if(is_front_page() && !is_home()){
			$post_type = 'front_page';
		}else if(is_home()){
			$post_type = 'blog';
		}else{
			$post_type = get_post_type();
		}

		if(isset($options['defaults'])){
			$default_options = array_merge($default_options, $options['defaults']);
		}

		$continue = false;
		if(isset($options['post_types'][$post_type])){
			$post_type_options = $options['post_types'][$post_type];

			if(isset($post_type_options['defaults'])){
				$default_options = array_merge($default_options, $post_type_options['defaults']);
			}

			foreach($post_type_options['editable_areas'] as $index => $values){
				$post_type_options['editable_areas'][$index] = $this->compile_options($default_options, $values);
				if($this->check_permission($post_type_options['editable_areas'][$index]['permission'])){
					$continue = true;
				}
			}
		}

		if($continue){
			return $post_type_options;
		}else{
			return false;
		}
	}

	/**
	 * Queues script files and styles if logged in user has any editable areas and current page is not in admin.
	 * Hookable through action 'wa_fronted_scripts'
	 */
	public function scripts_and_styles() {
		
		if(is_array(WA_Fronted::$options) && !empty(WA_Fronted::$options) && WA_Fronted::$options !== false){
			global $post, $wp_version, $tinymce_version, $concatenate_scripts, $compress_scripts;

			if ( ! isset( $concatenate_scripts ) ) {
				script_concat_settings();
			}

			require_once( ABSPATH . '/wp-admin/includes/post.php' );

			do_action('wa_fronted_before_scripts', WA_Fronted::$options);

			load_plugin_textdomain( 'wa-fronted', false, plugin_basename( dirname( __FILE__ ) ) . '/languages' );

			wp_enqueue_media( array('post' => $post) );

			add_thickbox();

			wp_deregister_script( 'tinymce' );
			wp_enqueue_script( 
				'tinymce', 
				includes_url( 'js/tinymce' ) . '/wp-tinymce.php?c=1', 
				array(), 
				$tinymce_version, 
				true 
			);

			wp_enqueue_script( 'wplink' );
			wp_localize_script( 'wplink', 'ajaxurl', admin_url( 'admin-ajax.php' ) );

			wp_enqueue_script( 'wp-lists' );
			wp_localize_script( 'wp-lists', 'ajaxurl', admin_url( 'admin-ajax.php' ) );

			wp_enqueue_script('jquery-ui-core');
			wp_enqueue_script('jquery-ui-draggable');
			wp_enqueue_script('jquery-ui-droppable');
			wp_enqueue_script('jquery-ui-datepicker');

			wp_enqueue_script(
				'jqueryui-timepicker-addon',
				plugins_url( '/bower_components/jqueryui-timepicker-addon/dist/jquery-ui-timepicker-addon.min.js', __FILE__ ),
				array(
					'jquery',
					'jquery-ui-core',
					'jquery-ui-datepicker'
				),
				'1.5.5',
				true
			);

			wp_enqueue_script(
				'wa-fronted-scripts',
				plugins_url( '/js/min/scripts.min.js', __FILE__ ),
				array(
					'jquery',
					'jquery-ui-core',
					'jquery-ui-draggable',
					'jquery-ui-droppable',
					'jquery-ui-datepicker',
					'jqueryui-timepicker-addon',
					'tinymce',
					'wp-util', 
					'editor', 
					'wplink', 
					'wp-lists'
				),
				'0.1',
				true
			);

			wp_localize_script(
				'wa-fronted-scripts',
				'global_vars',
				array(
					'wp_lang'     => get_bloginfo('language'),
					'i18n'        => $this->get_js_i18n(),
					'ajax_url'    => admin_url('admin-ajax.php'),
					'options'     => json_encode(WA_Fronted::$options),
					'image_sizes' => $this->get_image_sizes(),
					'nonce'       => wp_create_nonce('wa_fronted_save_nonce')
				)
			);

			wp_enqueue_style( 'buttons' );
			wp_enqueue_style( 'dashicons' );
			wp_enqueue_style( 'open-sans' );

			wp_enqueue_style(
				'wa-fronted-timepicker-addon',
				plugins_url( '/bower_components/jqueryui-timepicker-addon/dist/jquery-ui-timepicker-addon.min.css', __FILE__ )
			);
			wp_enqueue_style(
				'wa-fronted-style',
				plugins_url( '/css/style.css', __FILE__ )
			);

			do_action('wa_fronted_after_scripts', WA_Fronted::$options);
		}
	}

	/**
	 * Wraps shortcodes in a div and html comment
	 * @param  string $content content to find shortcodes in
	 * @param  int $post_id
	 * @param  string $field field key
	 * @return string $content rerendered content
	 */
	public function filter_shortcodes( $content, $post_id = false, $field = false ){
		if(is_array(WA_Fronted::$options) && !empty(WA_Fronted::$options) && WA_Fronted::$options !== false){
			$pattern = get_shortcode_regex();
			preg_match_all( '/'. $pattern .'/s', $content, $matches );
			if(array_key_exists( 0, $matches )){
				$shortcodes = $matches[0];
				$filtered_shortcodes = array();
				foreach($shortcodes as $shortcode){
					if(!in_array($shortcode, $filtered_shortcodes)){
						preg_match('/(?>\\[)([^\\s|^\\]]+)/s', $shortcode, $sub_matches);
						if($sub_matches[1] !== 'caption'){
							$content = str_replace($shortcode, '
								<!-- shortcode -->
									<div
										class="wa-shortcode-wrap"
										data-shortcode-base="' . $sub_matches[1] . '"
										data-shortcode="' . rawurlencode($shortcode) . '">
										' . $shortcode . '
									</div>
								<!-- /shortcode -->', $content);
							$filtered_shortcodes[] = $shortcode;
						}else{
							$content = str_replace($shortcode, '<div class="mceTemp">' . $shortcode . '</div>', $content);
						}
					}
				}
			}
		}
		return $content;
	}

	/**
	 * Removes formatting created by filter_shortcodes();
	 * @param  string $content
	 * @return string $content
	 */
	protected function unfilter_shortcodes( $content ){
		$pattern = '(<!--\\sshortcode\\s-->)(.*?)(<!--\\s\\/shortcode\\s-->)';

		preg_match_all( '/'. $pattern .'/s', $content, $matches );

		if(array_key_exists( 0, $matches ) && !empty($matches[0])){
			$rendered_shortcodes = $matches[0];
			foreach($rendered_shortcodes as $rendered_shortcode){
				preg_match('/(?<=data-shortcode=\\\\\")(.*?)(?=\\\\\".*)/s', $rendered_shortcode, $sub_matches);
				$unrendered_shortcode = rawurldecode($sub_matches[0]);
				$content = str_replace($rendered_shortcode, $unrendered_shortcode, $content);
			}
		}

		return $content;
	}

	/**
	 * Renders a shortcode from either AJAX or paramenter and returns rendered html
	 * @param string $shortcode shortcode to render
	 * @param string $comments
	 * @return string html content
	 */
	public function wa_render_shortcode($shortcode = false, $comments = false){
		$is_ajax = false;
		if(!$shortcode){
			$shortcode = stripslashes($_POST['shortcode']);
			$comments  = wp_validate_boolean($_POST['comments']);
			$is_ajax   = true;
		}

		preg_match('/(?>\\[)([^\\s|^\\]]+)/s', $shortcode, $sub_matches);

		if(!empty($sub_matches) && $sub_matches[1] !== ''){
			$html =
				(($comments) ? '<!-- shortcode -->' : '') . '
					<div
						class="wa-shortcode-wrap"
						data-shortcode-base="' . $sub_matches[1] . '"
						data-shortcode="' . rawurlencode($shortcode) . '">
						' . do_shortcode($shortcode) . '
					</div>
				' . (($comments) ? '<!-- /shortcode -->' : '');
		}else{
			$html = '';
		}

		if($is_ajax){
			echo $html;
			die();
		}else{
			return $html;
		}
	}

	/**
	 * Get autosaved content and compare saved dates
	 * @param int $post_id post to get autosave from
	 * @return array autosaved content
	 */
	public function wa_fronted_get_autosave($post_id = false){

		$is_ajax = false;
		$return = array(
			'success' => true,
			'data'    => false
		);

		if($post_id == false){
			if(isset($_POST['post_id'])){
				$is_ajax = true;
				$post_id = $_POST['post_id'];
			}else{
				$return['success'] = false;
				$return['error'] = __('Missing post ID', 'wa-fronted');
			}
		}

		$current_post = get_post($post_id);

		if($current_post){
			$last_modified = $current_post->post_modified;

			global $wpdb;
			$autosaves = $wpdb->get_results("
				SELECT *
				FROM $wpdb->posts
				WHERE `post_parent` = {$post_id}
					AND `post_type` = 'revision'
					AND `post_name` LIKE '%autosave%'
			");

			if(!empty($autosaves)){
				usort($autosaves, function($a, $b){
					return $a->post_date > $b->post_date;
				});

				$autosave = $autosaves[0];
				if($autosave->post_date > $last_modified){
					$return['data'] = apply_filters('wa_fronted_get_autosave', $autosave);
				}
			}else{
				$return['success'] = false;
				$return['error'] = __('No autosaves', 'wa-fronted');
			}
		}else{
			$return['success'] = false;
			$return['error']   = __('Post not found', 'wa-fronted');
		}

		if($is_ajax){
			wp_send_json($return);
		}else{
			return $return;
		}
	}

	/**
	 * Autosaves edited content to cookie
	 * Hookable through action 'wa_fronted_autosave'
	 */
	public function wa_fronted_autosave(){

		$return = array(
			'success' => true
		);

		if(isset($_POST['data']) && wp_verify_nonce( $_POST['wa_fronted_save_nonce'], 'wa_fronted_save_nonce' )){
			$data = $_POST['data'];

			$post_ids = array();

			$autosave_data = array();

			foreach($data as $this_data){
				$safe_content = trim(wp_kses_stripslashes($this->unfilter_shortcodes($this_data['content'])));
				$field_type   = $this_data['options']['field_type'];
				$post_id      = (int)$this_data['options']['post_id'];

				if(!in_array($post_id, $post_ids)){
					$post_ids[] = $post_id;

					$autosave_data[$post_id] = array(
						'post_author'    => get_current_user_id(),
						'post_parent'    => $post_id,
						'post_name'      => $post_id . '-autosave-v1',
						'post_status'    => 'inherit',
						'post_type'      => 'revision',
						'comment_status' => 'closed',
						'ping_status'    => 'closed'
					);
				} 

				if($field_type == 'post_content' || $field_type == 'post_title' || $field_type == 'post_excerpt'){
					$autosave_data[$post_id][$field_type] = $safe_content;
				}
			}

			$autosave_data = apply_filters('wa_fronted_autosave_data', $autosave_data, $data);

			foreach($post_ids as $post_id){
				$new_post_id;
				$this_autosave_data = $autosave_data[$post_id];

				if(!isset($this_autosave_data['post_content'])){
					$this_autosave_data['post_content'] = get_the_content($post_id);
				}
				
				if(!isset($this_autosave_data['post_title'])){
					$this_autosave_data['post_title'] = get_the_title($post_id);
				}
				
				if(!isset($this_autosave_data['post_excerpt'])){
					$this_autosave_data['post_excerpt'] = apply_filters( 'get_the_excerpt', get_post_field('post_excerpt', $post_id, 'raw'));
				}

				//Get existing autosave so we dont clutter the database
				global $wpdb;
				$autosaves = $wpdb->get_results("
					SELECT *
					FROM $wpdb->posts
					WHERE `post_parent` = {$post_id}
						AND `post_type` = 'revision'
						AND `post_name` LIKE '%autosave%'
				");

				if(!empty($autosaves)){
					usort($autosaves, function($a, $b){
						return $a->post_date > $b->post_date;
					});

					$autosave = $autosaves[0];


					$this_autosave_data['ID']            = $autosave->ID;
					$this_autosave_data['post_date']     = current_time('mysql');
					$this_autosave_data['post_date_gmt'] = current_time('mysql', true);

					$new_post_id = wp_update_post($this_autosave_data);

				}else{
					$new_post_id = wp_insert_post($this_autosave_data);
				}

				if(!$new_post_id){
					$return['success'] = false;
					$return['error']   = __('Could not create autosave', 'wa-fronted');
				}else{
					do_action('wa_fronted_autosave', $data, $new_post_id);
				}
			}

		}else{
			$return['success'] = false;
			$return['error']   = __('Sent data not valid', 'wa-fronted');
		}

		wp_send_json($return);
	}

	/**
	 * Saves field content sent by ajax
	 * Hookable through action 'wa_fronted_save'
	 * @return json $result
	 */
	public function wa_fronted_save(){

		$return = array(
			'success' => true
		);

		if(isset($_POST['data']) && wp_verify_nonce( $_POST['wa_fronted_save_nonce'], 'wa_fronted_save_nonce' )){
			$data = $_POST['data'];

			foreach($data as $this_data){
				$safe_content = trim(wp_kses_stripslashes($this->unfilter_shortcodes($this_data['content'])));
				$field_type   = $this_data['options']['field_type'];
				$post_id      = (int)$this_data['options']['post_id'];

				if($field_type == 'post_content' || $field_type == 'post_title' || $field_type == 'post_excerpt'){
					wp_update_post(array(
						'ID'        => $post_id,
						$field_type => $safe_content
					));
				}else if(strpos($field_type, 'meta_') !== false && array_key_exists('meta_key', $this_data['options'])){
					switch($field_type){
						case 'text':
						case 'email':
						case 'url':
						case 'number':
							$safe_content = trim(strip_tags($safe_content));
						case 'textarea':
							if(!$this_data['options']['paragraphs']){
								$safe_content = strip_tags($safe_content);
							}
							$safe_content = trim($safe_content);
							break;
					}

					update_post_meta($post_id, $this_data['options']['meta_key'], $safe_content);
				}else if($field_type == 'option' && array_key_exists('option_name', $this_data['options'])){
					update_option($this_data['options']['option_name'], $safe_content);
				}
			}

			do_action('wa_fronted_save', $data);

		}else{
			$return['success'] = false;
			$return['error']   = __('Sent data not valid', 'wa-fronted');
		}

		wp_send_json($return);
	}

	/**
	 * Get all registered image sizes or specific size
	 * @param  string $size optional, specific size to get
	 * @return array
	 */
	public function get_image_sizes( $size = '' ) {

        global $_wp_additional_image_sizes;

        $sizes = array();

        // Create the full array with sizes and crop info
        foreach( get_intermediate_image_sizes() as $_size ) {

                if ( in_array( $_size, array( 'thumbnail', 'medium', 'large' ) ) ) {

					$sizes[ $_size ]['width']  = get_option( $_size . '_size_w' );
					$sizes[ $_size ]['height'] = get_option( $_size . '_size_h' );
					$sizes[ $_size ]['crop']   = (bool) get_option( $_size . '_crop' );

                } elseif ( isset( $_wp_additional_image_sizes[ $_size ] ) ) {

                    $sizes[ $_size ] = array(
						'width'  => $_wp_additional_image_sizes[ $_size ]['width'],
						'height' => $_wp_additional_image_sizes[ $_size ]['height'],
						'crop'   => $_wp_additional_image_sizes[ $_size ]['crop']
                    );

                }

        }

        // Get only 1 size if found
        if ( $size ) {

            if( isset( $sizes[ $size ] ) ) {
                return $sizes[ $size ];
            } else {
                return false;
            }

        }

        return $sizes;
	}

	/**
	 * Get image src from attachment_id and size
	 * @param  int $attachment_id
	 * @param  string $size
	 * @return json
	 */
	public function wa_get_image_src(){
		$attachment_id = (int)$_POST['attachment_id'];
		$size          = $_POST['size'];

		$return   = wp_get_attachment_image_src( $attachment_id, $size );
		$return[] = $size;

		wp_send_json($return);
	}

	/**
	 * Output markup for save button and loading spinner
	 */
	public function wa_fronted_toolbar(){
		if(is_array(WA_Fronted::$options) && !empty(WA_Fronted::$options) && WA_Fronted::$options !== false):
		?>
			<div id="wa-fronted-toolbar">
				<button id="wa-fronted-save" title="<?php _e('Save', 'wa-fronted'); ?>">
					<i class="fa fa-save"></i>
					<?php _e('Save', 'wa-fronted'); ?>
				</button>

				<button id="wa-fronted-settings" title="<?php _e('Post settings', 'wa-fronted'); ?>">
					<i class="dashicons dashicons-admin-settings"></i>
				</button>

				<?php
				global $post;
				if(post_type_supports( $post->post_type, 'revisions' )):
				?>
					<button id="wa-fronted-revisions" title="<?php _e('Post revisions', 'wa-fronted'); ?>" data-post-id="<?php echo $post->ID; ?>">
						<i class="dashicons dashicons-backup"></i>
					</button>
				<?php endif; ?>

				<?php do_action('wa_fronted_toolbar', WA_Fronted::$options); ?>
			</div>
		<?php
		endif;
	}

	/**
	 * Runs in wp_footer, adds spinner and settings modal
	 */
	public function wa_fronted_footer(){
		if(is_array(WA_Fronted::$options) && !empty(WA_Fronted::$options) && WA_Fronted::$options !== false):
			global $post;
			
			require_once( ABSPATH . '/wp-admin/includes/post.php' );
			require_once( ABSPATH . '/wp-admin/includes/admin.php' );
			
			$field_prefix = 'wa_fronted_';

			$default_fieldgroups = array(
				'post_slug',
				'post_status',
				'post_date',
				'post_parent',
				'sticky',
				'comment_status',
				'taxonomies'
			);

			$field_groups = apply_filters('wa_fronted_settings_fields', $default_fieldgroups);
		?>
			<div id="wa-fronted-settings-modal">
				<div class="wa-fronted-modal-inner">
					<button class="close-wa-fronted-modal"><i class="fa fa-close"></i></button>

					<form id="wa-fronted-settings" method="POST">
						<?php
							if(is_array($field_groups) && !empty($field_groups)):
								foreach($field_groups as $field_group):
									switch($field_group):
										case 'post_slug':
											?>
											<div class="fieldgroup">
												<label for="<?php echo $field_prefix; ?>post_name"><?php _e('Post slug', 'wa-fronted'); ?></label>
												<input type="text" name="<?php echo $field_prefix; ?>post_name" id="<?php echo $field_prefix; ?>post_name" value="<?php echo $post->post_name; ?>">
											</div>
											<?php
											break;
										case 'post_status':
											$all_statuses        = get_post_statuses();
											$current_post_status = get_post_status( $post->ID );
											?>
											<div class="fieldgroup">
												<label for="<?php echo $field_prefix; ?>post_status"><?php _e('Post status', 'wa-fronted'); ?></label>
												<select name="<?php echo $field_prefix; ?>post_status" id="<?php echo $field_prefix; ?>post_status">
													<?php foreach($all_statuses as $status_key => $status_label): ?>
														<option value="<?php echo $status_key; ?>" <?php echo ($current_post_status == $status_key) ? 'selected' : ''; ?>>
															<?php echo $status_label; ?>
														</option>
													<?php endforeach; ?>
												</select>
											</div>
											<?php
											break;
										case 'post_date':
											?>
											<div class="fieldgroup">
												<label for="<?php echo $field_prefix; ?>post_date"><?php _e('Post date', 'wa-fronted'); ?></label>
												<input type="text" name="<?php echo $field_prefix; ?>post_date" id="<?php echo $field_prefix; ?>post_date" class="wa_fronted_datepicker" value="<?php echo $post->post_date; ?>">
											</div>
											<?php
											break;
										case 'post_parent':
											if(is_post_type_hierarchical($post->post_type)){
												$all_pages = get_posts(array(
													'posts_per_page' => -1,
													'orderby'        => 'title',
													'post_type'      => $post->post_type,
													'exclude'        => array( $post->ID )
												));
												?>
												<div class="fieldgroup">
													<label for="<?php echo $field_prefix; ?>post_parent"><?php _e('Post parent', 'wa-fronted'); ?></label>
													<select name="<?php echo $field_prefix; ?>post_parent" id="<?php echo $field_prefix; ?>post_parent">
														<option value="false"><?php _e('No parent', 'wa-fronted'); ?></option>
														<?php foreach($all_pages as $page): ?>
															<option value="<?php echo $page->ID; ?>" <?php echo ($page->ID == $post->post_parent) ? 'selected' : ''; ?>>
																<?php echo $page->post_title; ?>
															</option>
														<?php endforeach; ?>
													</select>
												</div>
												<?php
											}
											break;
										case 'sticky':
										case 'comment_status':
											if(get_post_type($post) == 'post'){
												if($field_group == 'comment_status'){
													$field_label = __('Allow comments','wa-fronted');
													$is_checked  = ($post->comment_status == 'open');
												}else{
													$field_label = __('Set post as sticky','wa-fronted');
													$is_checked  = is_sticky($post->ID);
												}

												//If both values are to be displayed, allow for them to be on the same row
												$target = array(
													'sticky',
													'comment_status'
												);
												$extra_class = 'checkbox-fieldgroup ';
												if(count(array_intersect($field_groups, $target)) == count($target)){
													$extra_class .= 'half';
												}
												?>
													<div class="fieldgroup <?php echo $extra_class; ?>">
														<input type="checkbox" name="<?php echo $field_prefix . $field_group; ?>" id="<?php echo $field_prefix . $field_group; ?>" value="1" <?php echo ($is_checked) ? 'checked' : ''; ?>>
														<label for="<?php echo $field_prefix . $field_group; ?>"><?php echo $field_label; ?></label>
													</div>
												<?php
											}
											break;
										case 'taxonomies':

											$available_taxonomies = get_object_taxonomies( $post, 'objects' );
											if(!empty($available_taxonomies)):
												foreach($available_taxonomies as $taxonomy):
													if($taxonomy->public && $taxonomy->show_ui):

														$terms = get_terms($taxonomy->name, array(
															'hide_empty' => false,
															'fields' => 'all'
														));

														$set_terms = wp_get_post_terms( $post->ID, $taxonomy->name, array(
															'fields' => 'ids'
														));

														$data_attrs = array(
															'data-placeholder="' . __('Select') . ' ' . $taxonomy->labels->name . '"',
															'data-tags="true"',
															'data-tax="' . $taxonomy->name . '"',
															'data-multiple="true"'
														);

														if($taxonomy->hierarchical):
															//Taxonomy is "category-type"
															$data_attrs[] = 'data-hierarchical="true"';
														else:
															//Taxonomy is "tag-type"
														endif;

														?>
														<div class="fieldgroup">
															<label for="<?php echo $field_prefix; ?>tax_<?php echo $taxonomy->name; ?>"><?php echo $taxonomy->label; ?></label>

															<select multiple name="<?php echo $field_prefix; ?>tax_<?php echo $taxonomy->name; ?>[]" id="<?php echo $field_prefix; ?>tax_<?php echo $taxonomy->name; ?>" <?php echo implode(' ', $data_attrs); ?>>
																<?php if(!empty($terms)): ?>
																	<?php foreach($terms as $term): ?>
																		<option value="<?php echo $term->term_id; ?>" <?php echo (in_array($term->term_id, $set_terms)) ? 'selected' : ''; ?>>
																			<?php echo $term->name; ?>
																		</option>
																	<?php endforeach; ?>
																<?php endif; ?>
															</select>
														</div>
														<?php

													endif;
												endforeach;
											endif;

											break;
									endswitch;
								endforeach;
							endif;

							do_action('wa_fronted_settings_form', WA_Fronted::$options);
							wp_nonce_field('wa_fronted_settings_save', 'wa_fronted_settings_nonce');
						?>

						<input type="hidden" name="<?php echo $field_prefix; ?>post_id" id="<?php echo $field_prefix; ?>post_id" value="<?php echo $post->ID; ?>">

						<div class="wa-fronted-modal-footer">
							<button type="submit" class="button button-primary button-large submit-wa-fronted-modal"><i class="dashicons dashicons-yes"></i> Update</button>
							<?php do_action('wa_fronted_settings_modal_footer', WA_Fronted::$options); ?>
						</div>
					</form>
				</div>
			</div>

			<?php if(post_type_supports( $post->post_type, 'revisions' )): ?>
				<div id="wa-fronted-revisions-modal">
					<div class="wa-fronted-revisions-modal-inner">
						<button class="close-wa-fronted-modal"><i class="fa fa-close"></i></button>

						<div class="revision-input-container">
							<h4><?php _e('Step through revisions', 'wa-fronted'); ?></h4>
							<button id="wa-previous-revision"><i class="fa fa-chevron-left"></i></button>
							<input type="text" name="wa_fronted_switch_revision" id="wa_fronted_switch_revision" readonly>
							<button id="wa-next-revision"><i class="fa fa-chevron-right"></i></button>
						</div>
					</div>
				</div>
			<?php endif; ?>
			
			<div id="wa-fronted-edit-shortcode">
				<div class="wa-fronted-edit-shortcode-inner">
					<button id="wa-fronted-edit-shortcode-button" class="show"><i class="dashicons dashicons-edit"></i></button>
					<button id="wa-fronted-remove-shortcode-button" class="show"><i class="dashicons dashicons-no"></i></button>
					
					<div class="shortcode-input-wrapper">
						<input type="text" name="wa_fronted_shortcode_input" id="wa_fronted_shortcode_input">
						<button id="submit-shortcode"><i class="dashicons dashicons-yes"></i></button>
					</div>
				</div>
			</div>

			<div id="wa-fronted-spinner">
				<img src="<?php echo includes_url(); ?>/images/spinner-2x.gif">
			</div>
		<?php
		endif;
	}

	/**
	 * Adds native link modal
	 */
	public function wa_fronted_footer_scripts() {
		if ( ! class_exists( '_WP_Editors' ) ) {
			require( ABSPATH . WPINC . '/class-wp-editor.php' );
		}

		_WP_Editors::wp_link_dialog();

		do_action('wa_fronted_footer_scripts');
	}

	/**
	 * AJAX function for saving settings form
	 */
	protected function settings_form_save(){
		if(is_array(WA_Fronted::$options) && !empty(WA_Fronted::$options) && WA_Fronted::$options !== false){

			$field_prefix = 'wa_fronted_';
			$update_this  = array(
				'comment_status' => 'closed'
			);

			$update_taxonomies = array();

			foreach($_POST as $key => $value){
				switch($key){
					case $field_prefix . 'post_id':
						$update_this['ID'] = $value;
						break;
					case $field_prefix . 'post_status':
						$update_this['post_status'] = $value;
						break;
					case $field_prefix . 'post_name':
						$update_this['post_name'] = sanitize_title($value);
						break;
					case $field_prefix . 'post_date':
						$update_this['post_date'] = $value;
						break;
					case $field_prefix . 'post_parent':
						if($value !== false && intval($value)){
							$update_this['post_parent'] = $value;
						}else{
							$update_this['post_parent'] = 0;
						}
						break;
					case $field_prefix . 'comment_status':
						$update_this['comment_status'] = 'open';
						break;
				}

				$tax_name = strpos($key, $field_prefix . 'tax_');
				if($tax_name !== false){
					$tax_name = substr($key, strlen($field_prefix . 'tax_'));
					$update_taxonomies[$tax_name] = array_map('intval', $value);
				}
			}

			if(!empty($update_taxonomies)){
				foreach($update_taxonomies as $taxonomy => $terms){
					wp_set_object_terms( $update_this['ID'], $terms, $taxonomy );
				}
			}

			if(get_post_type($update_this['ID']) == 'post'){
				$is_sticky = is_sticky($update_this['ID']);
				if(isset($_POST[$field_prefix . 'sticky']) && !$is_sticky){
					//Add sticky
					$sticky_posts = get_option('sticky_posts');
					if(!is_array($sticky_posts)){
						$sticky_posts = array();
					}

					if(!in_array((int)$update_this['ID'], $sticky_posts)){
						$sticky_posts[] = (int)$update_this['ID'];
						update_option('sticky_posts', $sticky_posts);
					}

				}else if(!isset($_POST[$field_prefix . 'sticky']) && $is_sticky){
					//Remove sticky
					$sticky_posts = get_option('sticky_posts');
					if(($key = array_search((int)$update_this['ID'], $sticky_posts)) !== false) {
					    unset($sticky_posts[$key]);
					}

					update_option('sticky_posts', $sticky_posts);
				}
			}

			if(!empty($update_this)){
				$update = wp_update_post(apply_filters('wa_fronted_settings_values', $update_this), true);

				do_action('wa_fronted_settings_form_save');

				wp_safe_redirect( get_permalink($update_this['ID']) );
				exit;
			}

		}
	}

	/**
	 * Check link against WP oEmbed
	 * @param  string $link
	 * @return mixed       false if not valid oEmbed or html
	 */
	public function wa_get_oembed($link = false){
		$is_ajax = false;
		if(!$link){
			$link    = $_POST['link'];
			$is_ajax = true;
		}

		$embed_code = wp_oembed_get($link);

		if($is_ajax){
			wp_send_json(array(
				'oembed' => $embed_code
			));
		}else{
			return $embed_code;
		}
	}

	/**
	 * Retrieve featured image attachment id
	 * @param  int $post_id
	 * @return int           attachment id
	 */
	public function wa_get_thumbnail_id($post_id = false){
		$is_ajax = false;
		if(!$post_id){
			$post_id = $_POST['post_id'];
			$is_ajax = true;
		}

		$attachment_id = get_post_thumbnail_id($post_id);

		if($is_ajax){
			wp_send_json(array(
				'post_id'       => $post_id,
				'attachment_id' => $attachment_id
			));
		}else{
			return $attachment_id;
		}
	}

	/**
	 * Sets post thumbnail and returns img element with new thumbnail
	 * @param  int $attachment_id
	 * @param  string $image_size
	 * @param  int $post_id
	 * @return array                 either an array with html img or error
	 */
	public function wa_set_thumbnail($attachment_id = false, $image_size = false, $post_id = false){
		$is_ajax = false;
		if(!$attachment_id){
			$attachment_id = $_POST['attachment_id'];
			$post_id       = $_POST['post_id'];
			$image_size    = $_POST['image_size'];
			$is_ajax       = true;
		}

		$meta_id = set_post_thumbnail($post_id, $attachment_id);

		if($meta_id){
			$return = array(
				'html' => get_the_post_thumbnail($post_id, $image_size)
			);
		}else{
			$return = array(
				'error' => true
			);
		}

		if($is_ajax){
			wp_send_json($return);
		}else{
			return $return;
		}
	}

	public function wa_delete_post_thumbnail($post_id = false){
		$is_ajax = false;
		if(!$post_id){
			$post_id       = $_POST['post_id'];
			$is_ajax       = true;
		}

		$return = delete_post_thumbnail( $post_id );

		if($is_ajax){
			wp_send_json(array('success' => $return));
		}else{
			return $return;
		}	
	}

	public function wa_create_image(){
		if(wp_verify_nonce( $_POST['wa_fronted_save_nonce'], 'wa_fronted_save_nonce' ) && isset($_POST['file_data']) && isset($_POST['file_name']) && isset($_POST['file_type'])){

			global $post;

			$file_data       = rawurldecode($_POST['file_data']);
			$base64str       = preg_replace('/(data:image\\/(jpeg|png|gif);base64,)/i', '', $file_data);
			$upload_dir      = wp_upload_dir();
			$upload_path     = str_replace( '/', DIRECTORY_SEPARATOR, $upload_dir['path'] ) . DIRECTORY_SEPARATOR;
			$decoded         = base64_decode( $base64str );
			$filename        = $_POST['file_name'];
			$hashed_filename = md5( $filename . microtime() ) . '_' . $filename;
			$image_upload    = file_put_contents( $upload_path . $hashed_filename, $decoded );
			$post_id         = (isset($_POST['post_id'])) ? $_POST['post_id'] : $post->ID;

			//HANDLE UPLOADED FILE
			if( !function_exists( 'wp_handle_sideload' ) ) {
			  require_once( ABSPATH . 'wp-admin/includes/file.php' );
			}

			// Without that I'm getting a debug error!?
			if( !function_exists( 'wp_get_current_user' ) ) {
			  require_once( ABSPATH . 'wp-includes/pluggable.php' );
			}

			$file             = array();
			$file['error']    = '';
			$file['tmp_name'] = $upload_path . $hashed_filename;
			$file['name']     = $hashed_filename;
			$file['type']     = $_POST['file_type'];
			$file['size']     = filesize( $upload_path . $hashed_filename );

			// upload file to server
			$attachment_id = media_handle_sideload( $file, $post_id );
			wp_send_json(array(
				'attachment_id' => $attachment_id,
				'attachment_obj' => wp_prepare_attachment_for_js($attachment_id)
			));

		}else{
			return false;
		}
	}


	/**
	 * Defines supported custom fields types, hookable through filter 'supported_custom_fields'
	 * Prefixed with 'meta_'
	 */
	protected function get_supported_custom_fields(){
		$supported_custom_fields = array(
			'meta_image',
			'meta_email',
			'meta_url',
			'meta_number',
			'meta_text',
			'meta_textarea',
			'meta_select',
			'meta_wysiwyg'
		);

		return apply_filters('supported_custom_fields', $supported_custom_fields);
	}

	/**
	 * Add a new term to taxonomy through ajax
	 */
	public function wa_add_tax_term(){
		wp_send_json(wp_insert_term($_POST['term'], $_POST['taxonomy']));
	}

	/**
	 * Retrieve post revisions and its meta data
	 */
	public function wa_get_revisions($post_id = false){
		$post_id = (isset($_POST['post_id'])) ? $_POST['post_id'] : $post_id;
		$revisions = apply_filters('wa_fronted_revisions', wp_get_post_revisions($post_id), $post_id);

		add_filter( 'the_content', array( $this, 'filter_shortcodes' ) );

		usort($revisions, function($a, $b) {
		    return $a->post_date - $b->post_date;
		});

		if(!empty($revisions)){
			foreach($revisions as $key => $revision){
				$revisions[$key]->post_content = apply_filters('the_content', $revisions[$key]->post_content);
			}
		}

		if(isset($_POST['post_id'])){
			wp_send_json($revisions);
		}else{
			return $revisions;
		}
	}

	/**
	 * Get javascript strings that should be translated
	 */
	public function get_js_i18n(){
		return apply_filters('wa_get_js_i18n', array(
			'No results found.'                                                                                => __('No results found.', 'wa-fronted'),
			'Add'                                                                                              => __('Add', 'wa-fronted'),
			'The changes you have made will be lost if you navigate away from this page.'                      => __('The changes you have made will be lost if you navigate away from this page.', 'wa-fronted'),
			'A draft of this post has been saved automatically'                                                => __('A draft of this post has been saved automatically', 'wa-fronted'),
			'Draft autosaved'                                                                                  => __('Draft autosaved', 'wa-fronted'),
			'There were validation errors!'                                                                    => __('There were validation errors!', 'wa-fronted'),
			'Save unsuccessful'                                                                                => __('Save unsuccessful', 'wa-fronted'),
			'There is an autosave of this post that is more recent than the version below. View the autosave?' => __('There is an autosave of this post that is more recent than the version below. View the autosave?', 'wa-fronted'),
			'Cannot be empty'                                                                                  => __('Cannot be empty', 'wa-fronted'),
			'Must be a date'                                                                                   => __('Must be a date', 'wa-fronted'),
			'Must be a valid email address'                                                                    => __('Must be a valid email address', 'wa-fronted'),
			'Must be a number'                                                                                 => __('Must be a number', 'wa-fronted'),
			'Must contain a number'                                                                            => __('Must contain a number', 'wa-fronted'),
			'Can only be letters or numbers'                                                                   => __('Can only be letters or numbers', 'wa-fronted'),
			'Must be an url'                                                                                   => __('Must be an url', 'wa-fronted'),
			'Must be a phone number'                                                                           => __('Must be a phone number', 'wa-fronted'),
			'Must be more than %s characters'                                                                  => __('Must be more than %s characters', 'wa-fronted'),
			'Must be less than %s characters'                                                                  => __('Must be less than %s characters', 'wa-fronted'),
			'Must be %s characters'                                                                            => __('Must be %s characters', 'wa-fronted'),
			'Must be greater than %s'                                                                          => __('Must be greater than %s', 'wa-fronted'),
			'Must be less than %s'                                                                             => __('Must be less than %s', 'wa-fronted'),
			'Must be between %s and %s'                                                                        => __('Must be between %s and %s', 'wa-fronted'),
			'Must be %s'                                                                                       => __('Must be %s', 'wa-fronted'),
			'Add media'                                                                                        => __('Add media', 'wa-fronted'),
			'Align left'                                                                                       => __('Align left', 'wa-fronted'),
			'Align center'                                                                                     => __('Align center', 'wa-fronted'),
			'Align right'                                                                                      => __('Align right', 'wa-fronted'),
			'Edit'                                                                                             => __('Edit', 'wa-fronted'),
			'Remove'                                                                                           => __('Remove', 'wa-fronted'),
			'render shortcode'                                                                                 => __('render shortcode', 'wa-fronted'),
			'Render unsuccessful'                                                                              => __('Render unsuccessful', 'wa-fronted'),
			'Selected text is not a valid shortcode'                                                           => __('Selected text is not a valid shortcode', 'wa-fronted'),
			'Sent code is not a valid shortcode'                                                               => __('Sent code is not a valid shortcode', 'wa-fronted')
		));
	}
}

/**
 * Inits WA_Fronted class when all plugins have been loaded
 * This is to ensure possible extension will be loaded before we intialize
 */
if(!function_exists('wa_fronted_init')){
	function wa_fronted_init(){
		//Checks if ACF is installed
		if(class_exists('acf')){
			include_once('extensions/acf/acf.php');
		}

		//Checks if WooCommerce is installed
		if(class_exists('WooCommerce')){
			include_once('extensions/woocommerce/woocommerce.php');
		}

		new WA_Fronted();
	}
}


if(phpversion() >= 5.43){
	add_action('plugins_loaded', 'wa_fronted_init', 999);
}
