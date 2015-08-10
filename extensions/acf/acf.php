<?php
class WA_Fronted_ACF extends WA_Fronted{
	protected $supported_acf_fields;

	public function __construct(){
		add_action( 'wa_fronted_inited', array( $this, 'acf_init' ));
		add_action( 'wa_fronted_after_init', array( $this, 'wa_fronted_acf_form' ));
		add_action( 'wa_fronted_after_scripts', array( $this, 'acf_scripts' ) );
		add_action( 'wa_fronted_save', array( $this, 'acf_save' ) );
		add_action( 'wp_footer', array( $this, 'wa_acf_dialog' ) );

		add_action( 'wp_ajax_wa_save_acf_form', 'acf_form_head' );
		
		add_action( 'wp_ajax_wa_get_acf_field_object', array( $this, 'wa_get_acf_field_object' ) );
		add_action( 'wp_ajax_wa_get_acf_field_contents', array( $this, 'wa_get_acf_field_contents' ) );
		add_action( 'wp_ajax_wa_get_acf_form', array( $this, 'wa_get_acf_form' ) );

		add_filter( 'compile_options', array( $this, 'compile_acf_options'), 10, 3 );
	}

	/**
	 * Filters output values
	 */
	public function acf_init(){
		add_filter( 'acf/load_value/type=wysiwyg', array( $this, 'filter_shortcodes' ), 10, 3 );
		add_filter( 'acf/update_value', 'wp_kses_post', 10, 1 );
	}

	/**
	 * Enqueues ACF uploader scripts
	 * @param  mixed $options either false or json encoded options
	 */
	public function acf_scripts( $options ){
		if(function_exists('acf_enqueue_uploader')){
			acf_enqueue_uploader();

			wp_enqueue_script(
				'wa-fronted-acf-scripts',
				plugins_url( '/acf.min.js', __FILE__ ),
				array( 
					'wa-fronted-scripts'
				),
				'0.1',
				true
			);
		}
	}

	/**
	 * Outputs necessary ACF form head function
	 * @param  mixed $options either false or json encoded options
	 */
	public function wa_fronted_acf_form( $options ){
		if(function_exists('acf_form_head') && $options !== false){
			acf_form_head();
		}
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
	 * Compiles and merges the default options with user defined ACF specific options or tries to set itself
	 * @param  array $compiled_options
	 * @param  array $default_options
	 * @param  array $new_options
	 * @return array                   compiled options array
	 */
	public function compile_acf_options( $compiled_options, $default_options, $new_options ){
		$field_type = $compiled_options['field_type'];
		if(strpos($field_type, 'acf_') !== false){
			
			$field_object = $this->wa_get_acf_field_object($field_type);
			if(!isset($this->supported_acf_fields)){
				$this->supported_acf_fields = $this->get_supported_acf_fields();
			}

			if($field_object && in_array($field_object['field_object']['type'], $this->supported_acf_fields)){
				switch($field_object['field_object']['type']){
					case 'email':
					case 'url':
					case 'password':
					case 'number':
					case 'text':
					case 'textarea':
						if(!array_key_exists('toolbar', $new_options)){
							$compiled_options['toolbar'] = false;
						}
						$compiled_options['media_upload'] = false;
						break;		
					case 'wysiwyg':
						if(!array_key_exists('toolbar', $new_options)){
							$compiled_options['toolbar'] = 'full';
						}

						if($field_object['field_object']['media_upload']){
							$compiled_options['media_upload'] = true;
						}else{
							$compiled_options['media_upload'] = false;
						}
						break;	
					case 'image':
					case 'file':
					case 'oembed':
						$compiled_options['native']       = false;
						$compiled_options['toolbar']      = false;
						$compiled_options['media_upload'] = 'only';
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

		return $compiled_options;
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

	/**
	 * Upon save, checks if data to save is ACF values and updates field values
	 * @param  array $data data to save
	 */
	public function acf_save( $data ){
		foreach( $data as $this_data ){
			$field_type = $this_data['options']['field_type'];
			
			if(strpos($field_type, 'acf_') !== false){

				$safe_content  = wp_kses_stripslashes($this->unfilter_shortcodes($this_data['content']));
				$post_id       = (int)$this_data['options']['post_id'];
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
	}
}

$WA_Fronted_ACF = new WA_Fronted_ACF();