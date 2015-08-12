<?php
class WA_Fronted_WooCommerce extends WA_Fronted{

	protected $supported_woo_fields;


	public function __construct(){
		add_action( 'wa_fronted_save', array( $this, 'woo_save' ) );
		add_action( 'wa_fronted_settings_form', array( $this, 'woo_form' ) );
		add_action( 'wa_fronted_settings_form_save', array( $this, 'woo_form_save' ) );

		add_filter( 'compile_options', array( $this, 'compile_woo_options'), 10, 3 );
	}

	/**
	 * Defines supported WooCommerce fields/values, hookable through filter 'supported_woo_fields'
	 * Needs to be prefixed with 'woo_'
	 */
	protected function get_supported_woo_fields(){
		$supported_woo_fields = array(
			'woo_sku',
			'woo_price',
			'woo_sale_price',
			'woo_short_description'
		);

		return apply_filters('supported_woo_fields', $supported_woo_fields);
	}

	/**
	 * Compiles and merges the default options with user defined WooCommerce specific options or tries to set itself
	 * @param  array $compiled_options
	 * @param  array $default_options
	 * @param  array $new_options
	 * @return array                   compiled options array
	 */
	public function compile_woo_options( $compiled_options, $default_options, $new_options ){
		$field_type = $compiled_options['field_type'];
		if(strpos($field_type, 'woo_') !== false && is_product($compiled_options['post_id'])){
			
			$product = get_product($compiled_options['post_id']);

			if($product->is_type('simple')){
				if(!isset($this->supported_woo_fields)){
					$this->supported_woo_fields = $this->get_supported_woo_fields();
				}

				if(in_array($field_type, $this->supported_woo_fields)){
					switch($field_type){
						case 'woo_price':
						case 'woo_sale_price':
							$compiled_options['validation'] = array(
								'type' => 'contains_num'
							);
						case 'woo_sku':
							if(!array_key_exists('toolbar', $new_options)){
								$compiled_options['toolbar'] = false;
							}
							$compiled_options['media_upload'] = false;
							$compiled_options['paragraphs']   = false;
							break;
						case 'woo_short_description':
							if(!array_key_exists('toolbar', $new_options)){
								$compiled_options['toolbar'] = 'full';
							}
							$compiled_options['media_upload'] = true;
							break;
					}
				}else{
					trigger_error('WooCommerce field type "' . $field_type . '" is not yet supported', E_USER_ERROR);
				}
			}
		}

		return $compiled_options;
	}

	/**
	 * Get float value of string
	 * @param  string $str
	 * @return float
	 */
	public function get_float($str) { 
		if(strstr($str, ",")) { 
			$str = str_replace(".", "", $str); // replace dots (thousand seps) with blancs 
			$str = str_replace(",", ".", $str); // replace ',' with '.' 
		} 

		if(preg_match("#([0-9\.]+)#", $str, $match)) { // search for number that may contain '.' 
			return floatval($match[0]); 
		} else { 
			return floatval($str); // take some last chances with floatval 
		} 
	} 

	/**
	 * Upon save, checks if data to save is WooCommerce values and updates field values
	 * @param  array $data data to save
	 */
	public function woo_save( $data ){

		$final_price_set = false;

		foreach( $data as $this_data ){

			$field_type = $this_data['options']['field_type'];

			if(strpos($field_type, 'woo_') !== false){
				
				$safe_content = wp_kses_stripslashes($this->unfilter_shortcodes($this_data['content']));
				$post_id      = (int)$this_data['options']['post_id'];
				$price_val    = $this->get_float(wp_strip_all_tags($safe_content, true));

				switch($field_type){
					case 'woo_sku':
						update_post_meta( $post_id, '_sku', wp_strip_all_tags($safe_content, true) );
						break;
					case 'woo_price':
						update_post_meta( $post_id, '_regular_price', $price_val );
						if(!$final_price_set){
							update_post_meta( $post_id, '_price', $price_val );
						}
					case 'woo_sale_price':
						update_post_meta( $post_id, '_sale_price', $price_val );
						update_post_meta( $post_id, '_price', $price_val );
						$final_price_set = true;
						break;
					case 'woo_short_description':
						wp_update_post(array(
							'ID'           => $post_id,
							'post_excerpt' => $safe_content
						));
						break;
				}
			}
		}
	}

	/**
	 * Adds form fields to settings modal
	 * @param  string $options json object
	 */
	public function woo_form( $options ){
		global $post, $product;
		
		if(is_product($post->ID) && $product->is_type('simple')):

			$field_prefix = 'woo_';
			if($product->managing_stock()):
			?>
				<div class="fieldgroup">
					<label for="<?php echo $field_prefix; ?>stock"><?php _e('Stock Qty', 'woocommerce'); ?></label>
					<input type="text" name="<?php echo $field_prefix; ?>stock" id="<?php echo $field_prefix; ?>stock" value="<?php echo $product->get_stock_quantity(); ?>">
				</div>
			<?php 
			endif; 

			$all_statuses = array(
				'instock'    => __('In stock', 'woocommerce'),
				'outofstock' => __('Out of stock', 'woocommerce')
			);
			?>
				<div class="fieldgroup">
					<label for="<?php echo $field_prefix; ?>stock_status"><?php _e('Stock status', 'woocommerce'); ?></label>
					<select name="<?php echo $field_prefix; ?>stock_status" id="<?php echo $field_prefix; ?>stock_status">
						<?php foreach($all_statuses as $status_key => $status_label): ?>
							<option value="<?php echo $status_key; ?>" <?php echo ($product->stock_status == $status_key) ? 'selected' : ''; ?>>
								<?php echo $status_label; ?>
							</option>
						<?php endforeach; ?>
					</select>
				</div>
			<?php

			$visibility_options = array(
				'visible' => __('Catalog/search', 'woocommerce'),
				'catalog' => __('Catalog', 'woocommerce'),
				'search'  => __('Search', 'woocommerce'),
				'hidden'  => __('Hidden', 'woocommerce')
			);
			?>
				<div class="fieldgroup">
					<label for="<?php echo $field_prefix; ?>visibility"><?php _e('Catalog visibility', 'woocommerce'); ?></label>
					<select name="<?php echo $field_prefix; ?>visibility" id="<?php echo $field_prefix; ?>visibility">
						<?php foreach($visibility_options as $option_key => $option_label): ?>
							<option value="<?php echo $option_key; ?>" <?php echo ($product->visibility == $option_key) ? 'selected' : ''; ?>>
								<?php echo $option_label; ?>
							</option>
						<?php endforeach; ?>
					</select>
				</div>

				<div class="fieldgroup">
					<label for="<?php echo $field_prefix; ?>featured"><?php _e('Featured product', 'woocommerce'); ?></label>
					<input type="checkbox" name="<?php echo $field_prefix; ?>featured" id="<?php echo $field_prefix; ?>featured" value="1" <?php echo ($product->is_featured()) ? 'checked' : ''; ?>>
				</div>

			<?php
				$sale_from = get_post_meta( $post->ID, '_sale_price_dates_from', true );
				$sale_to = get_post_meta( $post->ID, '_sale_price_dates_to', true );
			?>

				<div class="fieldgroup half">
					<label for="<?php echo $field_prefix; ?>sale_from"><?php _e('Schedule sale from', 'wa-fronted'); ?></label>
					<input type="text" name="<?php echo $field_prefix; ?>sale_from" id="<?php echo $field_prefix; ?>sale_from" class="wa_fronted_datepicker" data-time="false" value="<?php echo ($sale_from) ? date_i18n('Y-m-d', $sale_from) : ''; ?>">
				</div>

				<div class="fieldgroup half">
					<label for="<?php echo $field_prefix; ?>sale_to"><?php _e('Schedule sale to', 'wa-fronted'); ?></label>
					<input type="text" name="<?php echo $field_prefix; ?>sale_to" id="<?php echo $field_prefix; ?>sale_to" class="wa_fronted_datepicker" data-time="false" value="<?php echo ($sale_to) ? date_i18n('Y-m-d', $sale_to) : ''; ?>">
				</div>
			<?php

		endif;
	}
	
	/**
	 * Saves posted values
	 */
	public function woo_form_save(){
		$field_prefix = 'woo_';
		$post_id      = $_POST['wa_fronted_post_id'];

		if(is_product($post_id)){
			$product = get_product($post_id);

			if($product->is_type('simple')){
				foreach($_POST as $key => $value){
					switch($key){
						case $field_prefix . 'stock':
							if(intval($value)){
								$product->set_stock($value);
							}
							break;
						case $field_prefix . 'stock_status':
							$product->set_stock_status($value);
							break;
						case $field_prefix . 'visibility':
							update_post_meta( $post_id, '_visibility', $value );
							break;
						case $field_prefix . 'sale_from':
							$value = ($value == '') ? '' : strtotime($value);
							update_post_meta( $post_id, '_sale_price_dates_from',  $value );
							break;
						case $field_prefix . 'sale_to':
							$value = ($value == '') ? '' : strtotime($value);
							update_post_meta( $post_id, '_sale_price_dates_to', $value );
							break;
					}
				}
				
				$sale_from = strtotime($_POST[$field_prefix . 'sale_from']);
				$sale_to   = strtotime($_POST[$field_prefix . 'sale_to']);
				$now       = strtotime('now', current_time( 'timestamp' ));

				if($sale_to && $sale_from){
					if($sale_from <= $now && $sale_to >= $now){
						$set_price = $product->get_sale_price();
					}else{
						$set_price = $product->get_regular_price();
					}
				}else{
					if($product->get_sale_price()){
						$set_price = $product->get_sale_price();
					}else{
						$set_price = $product->get_regular_price();
					}
				}
				
				update_post_meta( $post_id, '_price', $set_price);

				$is_featured = $product->is_featured();
				if(isset($_POST[$field_prefix . 'featured']) && !$is_featured){
					update_post_meta( $post_id, '_featured', 'yes' );
				}else if(!isset($_POST[$field_prefix . 'featured']) && $is_featured){
					update_post_meta( $post_id, '_featured', 'no' );
				}
			}
			
		}
	}
}

$WA_Fronted_WooCommerce = new WA_Fronted_WooCommerce();