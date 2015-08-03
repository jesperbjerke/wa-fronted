<?php 
/*
	Plugin Name: WA-Fronted
	Plugin URI: http://github.com/jesperbjerke/wa-fronted
	Description: Edit content directly from fronted in the contents actual place
	Version: 0.3.1
	Text Domain: wa-fronted
	Domain Path: /lang
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

	protected $supported_acf_fields;

	/**
	 * Add hooks and actions and registers ajax function for saving
	 * Also adds filters for rendering shortcodes
	 */
	public function __construct(){
		if(is_user_logged_in() && !is_admin()){
			add_action( 'init', array( $this, 'wa_wp_init' ) );
			add_action( 'wp', array( $this, 'wa_has_wp' ) );
			add_action( 'wp_enqueue_scripts', array( $this, 'scripts_and_styles' ) );
			add_action( 'wp_footer', array( $this, 'wa_fronted_toolbar' ) );
			add_action( 'wp_footer', array( $this, 'wa_acf_dialog' ) );
			add_action( 'wp_footer', array( $this, 'wa_fronted_footer' ) );
			add_filter( 'the_content', array( $this, 'filter_shortcodes' ) );
			add_filter( 'acf/load_value/type=wysiwyg', array( $this, 'filter_shortcodes' ), 10, 3 );
			add_filter( 'acf/update_value', 'wp_kses_post', 10, 1 );
			add_action( 'wp_logout', array( $this, 'wa_wp_logout' ) );

			do_action( 'wa_fronted_init' );
		}

		add_action( 'wp_ajax_wa_fronted_save', array( $this, 'wa_fronted_save' ) );
		add_action( 'wp_ajax_wa_render_shortcode', array( $this, 'wa_render_shortcode' ) );
		add_action( 'wp_ajax_wa_get_image_src', array( $this, 'wa_get_image_src' ) );
		add_action( 'wp_ajax_wa_get_acf_field_object', array( $this, 'wa_get_acf_field_object' ) );
		add_action( 'wp_ajax_wa_get_acf_field_contents', array( $this, 'wa_get_acf_field_contents' ) );
		add_action( 'wp_ajax_wa_get_acf_form', array( $this, 'wa_get_acf_form' ) );
		add_action( 'wp_ajax_wa_get_oembed', array( $this, 'wa_get_oembed' ) );
		add_action( 'wp_ajax_wa_get_thumbnail_id', array( $this, 'wa_get_thumbnail_id' ) );
		add_action( 'wp_ajax_wa_set_thumbnail', array( $this, 'wa_set_thumbnail' ) );
	}

	/**
	 * On wp init, start session and check for posted data
	 */
	public function wa_wp_init(){
		session_start();

		//Check post data and validate form nonce
		if(isset($_POST['wa_fronted_settings_nonce']) && wp_verify_nonce($_POST['wa_fronted_settings_nonce'], 'wa_fronted_settings_save')){
			$this->settings_form_save();
		}
	}

	/**
	 * After wp is fully loaded, get options if on frontend and logged in
	 * Create acf form head
	 */
	public function wa_has_wp(){
		$_SESSION['wa_fronted_options'] = $this->get_options();
		
		if(function_exists('acf_form_head') && $_SESSION['wa_fronted_options'] !== false){
			acf_form_head();
		}

		do_action( 'wa_fronted_after_init', $_SESSION['wa_fronted_options'] );
	}

	/**
	 * Destroy session
	 */
	public function wa_wp_logout(){
		session_destroy();
	}

	/**
	 * Defines supported ACF fields, hookable through filter 'supported_acf_fields'
	 */
	protected function get_supported_acf_fields(){
		$supported_acf_fields = array(
			'text',
			'textarea',
			'email',
			'url',
			'password',
			'number',
			'wysiwyg',
			'image',
			'file',
			'oembed'
		);

		return apply_filters('supported_acf_fields', $supported_acf_fields);
	}

	/**
	 * Compiles and merges the default options with user defined options so that no fields are empty. 
	 * In case it is an ACF-field and some options are not set, it will determine these based on field type
	 * @param  array $default_options
	 * @param  array $new_options
	 * @return array $options filtered through 'compile_options' filter
	 */
	protected function compile_options($default_options, $new_options){

		$options = array_merge($default_options, $new_options);

		if($options['field_type'] == false){
			trigger_error('"field_type" cannot be empty', E_USER_ERROR);
		}

		//determine options based on field_type
		$field_type = $options['field_type'];
		
		if($field_type == 'post_title'){
			if(!array_key_exists('toolbar', $new_options)){
				$options['toolbar'] = false;
			}
		}else if($field_type == 'post_thumbnail'){
			if(!array_key_exists('media_upload', $new_options)){
				$options['media_upload'] = 'only';
			}
		}else if(strpos($field_type, 'acf_') !== false){
			
			$field_object = $this->wa_get_acf_field_object($field_type);
			if(!isset($this->supported_acf_fields)){
				$this->supported_acf_fields = $this->get_supported_acf_fields();
			}

			if($field_object && in_array($field_object['field_object']['type'], $this->supported_acf_fields)){
				switch($field_object['field_object']['type']){
					case 'text':
					case 'textarea':
					case 'email':
					case 'url':
					case 'password':
					case 'number':
						if(!array_key_exists('toolbar', $new_options)){
							$options['toolbar'] = false;
						}
						$options['media_upload'] = false;
						break;			
					case 'wysiwyg':
						if(!array_key_exists('toolbar', $new_options)){
							$options['toolbar'] = 'full';
						}

						if($field_object['field_object']['media_upload']){
							$options['media_upload'] = true;
						}else{
							$options['media_upload'] = false;
						}
						break;	
					case 'image':
					case 'file':
					case 'oembed':
						$options['toolbar']      = false;
						$options['media_upload'] = 'only';
						break;
				}
			}else{
				if($field_object['field_object']['type'] == ''){
					trigger_error('ACF field key "' . $field_type . '" not found', E_USER_ERROR);
				}else{
					trigger_error('ACF field type "' . $field_object['field_object']['type'] . '" is not yet supported', E_USER_ERROR);
				}
			}
		}

		return apply_filters('compile_options', $options);
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
			trigger_error('No configuration found. Please configure by adding a filter to \'wa_fronted_options\'', E_USER_ERROR);
		}

		global $post;

		$default_options = array(
			'media_upload' => true,
			'toolbar'      => 'full',
			'post_id'      => $post->ID,
			'field_type'   => false,
			'permission'   => 'default',
			'image_size'   => 'post-thumbnail'
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
			foreach($post_type_options['editable_areas'] as $index => $values){
				$post_type_options['editable_areas'][$index] = $this->compile_options($default_options, $values);
				if($this->check_permission($post_type_options['editable_areas'][$index]['permission'])){
					$continue = true;
				}
			}
		}

		if($continue){
			return json_encode($post_type_options);
		}else{
			return false;
		}
	}

	/**
	 * Queues script files and styles if logged in user has any editable areas and current page is not in admin. 
	 * Hookable through action 'wa_fronted_scripts'
	 */
	public function scripts_and_styles() {

		if($_SESSION['wa_fronted_options'] !== false){
			do_action('wa_fronted_before_scripts', $_SESSION['wa_fronted_options']);
			
			wp_enqueue_media();

			wp_enqueue_script('jquery-ui-core');
			wp_enqueue_script('jquery-ui-draggable');
			wp_enqueue_script('jquery-ui-droppable');
			wp_enqueue_script('jquery-ui-resizable');
			wp_enqueue_script('jquery-ui-datepicker');
			wp_enqueue_script('jquery-ui-slider');
			wp_enqueue_script('jquery-ui-selectmenu');

			wp_enqueue_script(
				'jqueryui-timepicker-addon',
				plugins_url( '/bower_components/jqueryui-timepicker-addon/dist/jquery-ui-timepicker-addon.min.js', __FILE__ ),
				array( 
					'jquery', 
					'jquery-ui-core',
					'jquery-ui-datepicker',
					'jquery-ui-slider'
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
					'jquery-ui-resizable',
					'jquery-ui-datepicker',
					'jquery-ui-slider',
					'jquery-ui-selectmenu',
					'jqueryui-timepicker-addon'
				),
				'0.1',
				true
			);

			wp_localize_script(
				'wa-fronted-scripts',
				'global_vars',
				array(
					'wp_lang'     => get_bloginfo('language'),
					'ajax_url'    => admin_url('admin-ajax.php'),
					'options'     => $_SESSION['wa_fronted_options'],
					'image_sizes' => $this->get_image_sizes(),
					'nonce'       => wp_create_nonce('wa_fronted_save_nonce')
				)
			);

			wp_enqueue_style( 
				'wa-fronted-medium-editor', 
				plugins_url( '/bower_components/medium-editor/dist/css/medium-editor.min.css', __FILE__ )
			);
			wp_enqueue_style( 
				'wa-fronted-medium-editor-theme', 
				plugins_url( '/bower_components/medium-editor/dist/css/themes/bootstrap.min.css', __FILE__ )
			);
			wp_enqueue_style( 
				'wa-fronted-timepicker-addon', 
				plugins_url( '/bower_components/jqueryui-timepicker-addon/dist/jquery-ui-timepicker-addon.min.css', __FILE__ )
			);
			wp_enqueue_style( 
				'wa-fronted-style', 
				plugins_url( '/css/style.css', __FILE__ )
			);

			if(function_exists('acf_enqueue_uploader')){
				acf_enqueue_uploader();
			}

			do_action('wa_fronted_after_scripts', $_SESSION['wa_fronted_options']);
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
		if($_SESSION['wa_fronted_options'] !== false){
			$pattern = get_shortcode_regex();
			preg_match_all( '/'. $pattern .'/s', $content, $matches );
			if(array_key_exists( 0, $matches )){
				$shortcodes = $matches[0];
				foreach($shortcodes as $shortcode){
					preg_match('/(?>\\[)(.*)(?>\\s)/s', $shortcode, $sub_matches);
					$content = str_replace($shortcode, '
						<!-- shortcode -->
							<div 
								class="wa-shortcode-wrap" 
								data-shortcode-base="' . $sub_matches[1] . '" 
								data-shortcode="' . rawurlencode($shortcode) . '">
								' . $shortcode . '
							</div>
						<!-- /shortcode -->', $content);
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
		if($_SESSION['wa_fronted_options'] !== false){
			$pattern = '(?=<!--\\sshortcode\\s-->)(.*)(?<=\\<!--\\s\\/shortcode\\s-->)';

			preg_match_all( '/'. $pattern .'/s', $content, $matches );
			if(array_key_exists( 0, $matches )){
				$rendered_shortcodes = $matches[0];
				foreach($rendered_shortcodes as $rendered_shortcode){
					preg_match('/(?<=data-shortcode=\\\\\")(.*?)(?=\\\\\".*)/s', $rendered_shortcode, $sub_matches);
					$unrendered_shortcode = rawurldecode($sub_matches[0]);
					$content = str_replace($rendered_shortcode, $unrendered_shortcode, $content);
				}
			}
		}
		return $content;
	}

	/**
	 * Renders a shortcode from either AJAX or paramenter and returns rendered html
	 * @return string html content
	 */
	public function wa_render_shortcode($shortcode = false, $comments = false){
		$is_ajax = false;
		if(!$shortcode){
			$shortcode = stripslashes($_POST['shortcode']);
			$comments  = wp_validate_boolean($_POST['comments']);
			$is_ajax   = true;
		}

		preg_match('/(?>\\[)([^\\s]+)/s', $shortcode, $sub_matches);
		
		$html = 
			(($comments) ? '<!-- shortcode -->' : '') . '
				<div 
					class="wa-shortcode-wrap" 
					data-shortcode-base="' . $sub_matches[1] . '" 
					data-shortcode="' . rawurlencode($shortcode) . '">
					' . do_shortcode($shortcode) . '
				</div>
			' . (($comments) ? '<!-- /shortcode -->' : '');

		if($is_ajax){
			echo $html;
			die();
		}else{
			return $html;
		}
	}

	/**
	 * Get autosaved content and compare saved dates
	 * @return array autosaved content
	 */
	public function wa_fronted_get_autosave(){

	}

	/**
	 * Autosaves edited content to cookie
	 * Hookable through action 'wa_fronted_autosave'
	 * @todo: Add autosave function
	 */
	public function wa_fronted_autosave(){

		$return = array();

		if(isset($_POST['data'])){
			$data = $_POST['data'];

			foreach($data as $this_data){
				$safe_content = wp_kses_stripslashes($this->unfilter_shortcodes($this_data['content']));
				$field_type   = $this_data['options']['field_type'];
				$post_id      = (int)$this_data['options']['post_id'];

			}
			
			do_action('wa_fronted_autosave', $data);
		
		}
		
		wp_send_json($return);
	}

	/**
	 * Saves field content sent by ajax
	 * Hookable through action 'wa_fronted_save'
	 * @return json $result
	 * @todo: Add save of meta_{META KEY}
	 */
	public function wa_fronted_save(){

		$return = array(
			'success' => true
		);

		if(isset($_POST['data']) && wp_verify_nonce( $_POST['wa_fronted_save_nonce'], 'wa_fronted_save_nonce' )){
			$data = $_POST['data'];

			foreach($data as $this_data){
				$safe_content = wp_kses_stripslashes($this->unfilter_shortcodes($this_data['content']));
				$field_type   = $this_data['options']['field_type'];
				$post_id      = (int)$this_data['options']['post_id'];

				if($field_type == 'post_content' || $field_type == 'post_title' || $field_type == 'post_excerpt'){
					wp_update_post(array(
						'ID'        => $post_id,
						$field_type => $safe_content
					));
				}else if(strpos($field_type, 'acf_') !== false){

					$acf_field_key = $this->extract_acf_field_key($field_type)['field_key'];
					$field_object  = $this->wa_get_acf_field_object($field_type);

					switch($field_object['field_object']['type']){
						case 'text':
						case 'email':
						case 'url':
						case 'password':
						case 'number':
							$safe_content = trim(strip_tags($safe_content));
						case 'textarea':
							if($field_object['field_object']['new_lines'] == 'wpautop' || $field_object['field_object']['new_lines'] == 'br'){
								$safe_content = str_replace('</p>', '<br/>', str_replace(array('<p>','<br/>','<br />'), '', $safe_content));
							}else{
								$safe_content = strip_tags($safe_content);
							}
							$safe_content = trim($safe_content);
						case 'wysiwyg':
							if($field_object['sub_field']){
								update_sub_field($acf_field_key, $safe_content, $post_id);
							}else{
								update_field($acf_field_key, $safe_content, $post_id);
							}
							break;
						// Saved for future use, handled by acf_form() right now
						// case 'oembed':
						// case 'image':
						// case 'file':
						// 	if($field_object['sub_field']){
						// 		update_sub_field($acf_field_key, $safe_content, $post_id);
						// 	}else{
						// 		update_field($acf_field_key, $safe_content, $post_id);
						// 	}
						// 	break;
					}
				}
			}

			do_action('wa_fronted_save', $data);

		}else{
			$return['success'] = false;
			$return['error']   = 'Sent data not valid';
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
		if($_SESSION['wa_fronted_options'] !== false):
		?>
			<div id="wa-fronted-toolbar">
				<button id="wa-fronted-save" title="<?php _e('Save', 'wa-fronted'); ?>">
					<i class="fa fa-save"></i>
					<?php _e('Save', 'wa-fronted'); ?>
				</button>

				<button id="wa-fronted-settings" title="<?php _e('Post settings', 'wa-fronted'); ?>">
					<i class="dashicons dashicons-admin-settings"></i> 
				</button>

				<?php do_action('wa_fronted_toolbar', $_SESSION['wa_fronted_options']); ?>
			</div>
		<?php
		endif;
	}

	/**
	 * Runs in wp_footer, adds spinner and settings modal
	 */
	public function wa_fronted_footer(){
		if($_SESSION['wa_fronted_options'] !== false):
			global $post;
			$all_statuses = array_diff_key(
				get_post_stati('', 'objects'),
				array_flip(
					array(
						'auto-draft',
						'future',
						'inherit',
						'trash'
					)
				)
			);
			$current_post_status = get_post_status( $post->ID );
			$field_prefix = 'wa_fronted_';
		?>
			<div id="wa-fronted-settings-modal">
				<div class="wa-fronted-modal-inner">
					<button class="close-wa-fronted-modal"><i class="fa fa-close"></i></button>

					<form id="wa-fronted-settings" method="POST">

						<div class="fieldgroup">
							<label for="<?php echo $field_prefix; ?>post_name"><?php _e('Post slug', 'wa-fronted'); ?></label>
							<input type="text" name="<?php echo $field_prefix; ?>post_name" id="<?php echo $field_prefix; ?>post_name" value="<?php echo $post->post_name; ?>">
						</div>

						<div class="fieldgroup">
							<label for="<?php echo $field_prefix; ?>post_status"><?php _e('Post status', 'wa-fronted'); ?></label>
							<select name="<?php echo $field_prefix; ?>post_status" id="<?php echo $field_prefix; ?>post_status">
								<?php foreach($all_statuses as $status): ?>
									<option value="<?php echo $status->name; ?>" <?php echo ($current_post_status == $status->name) ? 'selected' : ''; ?>>
										<?php echo $status->label; ?>
									</option>
								<?php endforeach; ?>
							</select>
						</div>

						<div class="fieldgroup">
							<label for="<?php echo $field_prefix; ?>post_date"><?php _e('Post date', 'wa-fronted'); ?></label>
							<input type="text" name="<?php echo $field_prefix; ?>post_date" id="<?php echo $field_prefix; ?>post_date" class="wa_fronted_datepicker" value="<?php echo $post->post_date; ?>">
						</div>

						<?php 
							do_action('wa_fronted_settings_form', $_SESSION['wa_fronted_options']); 
							wp_nonce_field('wa_fronted_settings_save', 'wa_fronted_settings_nonce');
						?>

						<input type="hidden" name="<?php echo $field_prefix; ?>post_id" id="<?php echo $field_prefix; ?>post_id" value="<?php echo $post->ID; ?>">

						<div class="wa-fronted-modal-footer">
							<button type="submit" class="button button-primary button-large submit-wa-fronted-modal"><i class="dashicons dashicons-yes"></i> Update</button>
							<?php do_action('wa_fronted_settings_modal_footer', $_SESSION['wa_fronted_options']); ?>
						</div>
					</form>
				</div>
			</div>

			<div id="wa-fronted-spinner">
				<img src="<?php echo includes_url(); ?>/images/spinner-2x.gif">
			</div>
		<?php
		endif;
	}

	/**
	 * Output wrapper for acf dialog/popup
	 */
	public function wa_acf_dialog(){
		if($_SESSION['wa_fronted_options'] !== false):
		?>
			<div id="acf-dialog" class="wp-core-ui" style="display:none;">
				<button id="close-acf-dialog"><i class="fa fa-close"></i></button>
				<div id="acf-dialog-inner"></div>
			</div>
		<?php
		endif;
	}

	/**
	 * Get ACF field object based on prefixed field key
	 * @param  string $field_key prefixed ACF field key
	 * @return array             if not Ajax, returns an array with field object and boolean if it is sub field
	 */
	public function wa_get_acf_field_object($field_key = false){
		if(!function_exists('get_field_object')){
			return false;
		}

		$is_ajax = false;
		if(isset($_POST['field_key'])){
			$is_ajax   = true;
			$field_key = $_POST['field_key'];
		}

		if(strpos($field_key, 'acf_') !== false){
			
			$acf_field_key_array = $this->extract_acf_field_key($field_key);
			$field_object        = get_field_object($acf_field_key_array['field_key']);

			if(!$field_object){
				if($is_ajax){
					wp_send_json(array(
						'error' => 'Invalid ACF field'
					));
				}else{
					trigger_error('ACF field key is not valid', E_USER_ERROR);
				}
			}else{
				if($is_ajax){
					wp_send_json($field_object);
				}else{
					return array(
						'sub_field'    => $acf_field_key_array['sub_field'],
						'field_object' => $field_object
					);
				}
			}
		}else{
			$return = array(
				'error' => true
			);
			
			if($is_ajax){
				wp_send_json($return);
			}else{
				return $return;
			}
		}
	}

	/**
	 * Get ACF field object with value based on non prefixed field key
	 * @param  string $field_key ACF field key (non prefixed)
	 * @param  mixed $post_id
	 * @return array             if not Ajax, returns an array with field object and contents
	 */
	public function wa_get_acf_field_contents($field_key = false, $post_id = false){
		if(!function_exists('get_field_object')){
			return false;
		}

		$is_ajax = false;
		if(isset($_POST['field_key'])){
			$is_ajax   = true;
			$field_key = $_POST['field_key'];
			$post_id   = $_POST['post_id'];
		}

		$field_object = get_field_object($field_key, $post_id);

		if(!$field_object){
			if($is_ajax){
				wp_send_json(array(
					'error' => 'Invalid ACF field'
				));
			}else{
				trigger_error('ACF field key is not valid', E_USER_ERROR);
			}
		}else{
			if($is_ajax){
				wp_send_json($field_object);
			}else{
				return $field_object;
			}
		}
	}

	/**
	 * Extract the actual field key parts of a prefixed key string
	 * @param  string $prefixed_key prefixed acf field key
	 * @return array               non prefixed acf field key and bool if it is subfield
	 */
	protected function extract_acf_field_key($prefixed_key){
		if(strpos($prefixed_key, 'acf_') !== false){
			if(strpos($prefixed_key, 'acf_sub_') !== false){
				$is_sub_field  = true;
				$acf_field_key = str_replace('acf_sub_', '', $prefixed_key);
			}else{
				$is_sub_field  = false;
				$acf_field_key = str_replace('acf_', '', $prefixed_key);
			}

			return array(
				'sub_field' => $is_sub_field,
				'field_key' => $acf_field_key
			);
		}else{
			return false;
		}
	}

	/**
	 * Get html for acf field form
	 * @param  string $field_key acf field key (non prefixed)
	 * @param  mixed $post_id
	 * @return string             html
	 */
	public function wa_get_acf_form($field_key = false, $post_id = false){
		$is_ajax = false;
		if(isset($_POST['field_key'])){
			$is_ajax   = true;
			$field_key = $_POST['field_key'];
			$post_id   = $_POST['post_id'];
			if(intval($post_id)){
				$post_id = intval($post_id);
			}
		}

		$form_id      = 'acf-form-' . $field_key;
		$redirect_uri = (isset($_POST['redirect'])) ? $_POST['redirect'] : $_SERVER['REQUEST_URI'];

		$options = array(
			'id'      => $form_id,
			'post_id' => $post_id,
			'fields'  => array(
				$field_key
			),
			'return'  => $redirect_uri
		);

		ob_start();
		acf_form($options);
		$output = ob_get_clean();
		
		$return = array(
			'form_id' => $form_id,
			'output'  => $output
		);

		if($is_ajax){
			wp_send_json($return);
		}else{
			return $return;
		}

	}

	protected function settings_form_save(){
		if($_SESSION['wa_fronted_options'] !== false){

			$field_prefix = 'wa_fronted_';
			$update_this  = array();

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
				}
			}
			
			if(!empty($update_this)){
				$current_post = get_post($update_this['ID']);
				$update       = wp_update_post(apply_filters('wa_fronted_settings_values', $update_this), true);
				
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
}

/**
 * Inits WA_Fronted class when all plugins have been loaded
 * This is to ensure possible extension will be loaded before we intialize
 */
if(!function_exists('wa_fronted_init')){
	function wa_fronted_init(){
		$WA_Fronted = new WA_Fronted();
	}
}

add_action('plugins_loaded', 'wa_fronted_init', 999);