var wa_fronted_acf;

(function($){

	wa_fronted.add_action('on_bind', function(){

		$('#acf-dialog #close-acf-dialog').click(function(e){
			e.preventDefault();
			e.stopPropagation();
			wa_fronted_acf.hide_acf_form();
		});

		if(typeof acf !== 'undefined'){
			acf.add_action('submit', function(form){
				var form_values = form.serializeArray(),
					form_data 	= {
						action : 'wa_save_acf_form'
					};

				for(var i = 0; i < form_values.length; i++){
					form_data[form_values[i].name] = form_values[i].value;
				}

				$.post(
					global_vars.ajax_url,
					form_data
				).done(function(return_data){
					/**
					 * since the returned data is not valuable to us in that format, 
					 * we need to fetch the new data separately
					 */
					wa_fronted_acf.refresh_acf_field(
						wa_fronted_acf.data.acf_temp.field_key, 
						wa_fronted_acf.data.acf_temp.post_id, 
						wa_fronted.data.current_editor_options, 
						wa_fronted.data.current_editor
					);
				});
			});
		}
	});

	wa_fronted.add_action('on_setup_editor', function(this_editor, this_options, all_options){
		//Send field_type to server and validate it against ACF
		wa_fronted_acf.get_acf_field_object(this_options.field_type, function(field_object){
			if(!field_object.hasOwnProperty('error')){
				//field_type is a valid ACF field
				switch(field_object.type){
					case 'file':
					case 'image':
						if(field_object.value !== null){
							this_editor.attr('data-db-value', field_object.value.ID);
						}
						break;
				}

				var editor_children = this_editor.children(),
					editor_contents = (editor_children.length !== 0) ? $(editor_children[0]) : this_editor,
					content_width   = editor_contents.width(),
					content_pos     = editor_contents.position();

				$('body').prepend('<button id="' + field_object.key + '" title="Edit ' + field_object.type + '" class="edit-acf-field" style="left: ' + (content_pos.left + ((content_width / 2) - 13)) + 'px;"><i class="fa fa-edit"></i></button>');
				
				var edit_button = $('#' + field_object.key),
					acf_button_timeout;

				var hide_acf_button = function(){
					acf_button_timeout = setTimeout(function(){
						edit_button.removeClass('show');
					}, 500);
				};

				this_editor.hover(
					function(){
						clearTimeout(acf_button_timeout);
						var pos = editor_contents.position();
						edit_button
							.css({
								'top' : pos.top + 'px'
							})
							.addClass('show');
					},
					hide_acf_button
				);

				edit_button
					.hover(
						function(){
							clearTimeout(acf_button_timeout);
						},
						hide_acf_button
					)
					.click(function(e){
						e.preventDefault();
						e.stopPropagation();
						
						wa_fronted_acf.show_acf_form(
							field_object.key, 
							this_options.post_id, 
							this_options, 
							this_editor
						);
					});

			}
		});
	});

	wa_fronted_acf = {

		data : {
			acf_temp : {
				field_key : false,
				post_id   : false
			}
		},

		/**
		 * Get ACF field object based on prefixed field key
		 * @param  {string}   field_key prefixed ACF field key
		 * @param  {Function} callback
		 */
		get_acf_field_object: function(field_key, callback){
			$.post(
	            global_vars.ajax_url,
	            {
					'action'    : 'wa_get_acf_field_object',
					'field_key' : field_key
	            }, 
	            function(response){
	                callback(response);
	            }
	        );	
		},

		/**
		 * Get ACF field content based on non prefixed field key and post id
		 * @param  {string}   field_key ACF field key (non prefixed)
		 * @param  {Function} callback
		 */
		get_acf_field_contents: function(field_key, post_id, callback){
			$.post(
	            global_vars.ajax_url,
	            {
					'action'    : 'wa_get_acf_field_contents',
					'field_key' : field_key,
					'post_id'   : post_id
	            }, 
	            function(response){
	                callback(response);
	            }
	        );	
		},

		/**
		 * Get html for acf field form
		 * @param  {string}   field_key acf field key (non prefixed)
		 * @param  {mixed}   post_id   
		 * @param  {Function} callback
		 */
		get_acf_form: function(field_key, post_id, callback){
			$.post(
	            global_vars.ajax_url,
	            {
					'action'    : 'wa_get_acf_form',
					'field_key' : field_key,
					'post_id'   : post_id,
					'redirect'  : window.location.pathname
	            }, 
	            function(response){
	                callback(response);
	            }
	        );		
		},

		/**
		 * Shows acf form based on field_key and post_id
		 * @param  {string}   field_key acf field key (non prefixed)
		 * @param  {mixed}   post_id
		 * @param  {mixed}   this_options current editor options
		 * @param  {Object}   this_editor current editor options
		 */
		show_acf_form: function(field_key, post_id, this_options, this_editor){
			var self = this;

			self.data.acf_temp.field_key           = field_key;
			self.data.acf_temp.post_id             = post_id;
			wa_fronted.data.current_editor_options = this_options;
			wa_fronted.data.current_editor         = this_editor;

			self.get_acf_form(field_key, post_id, function(response){
				$('#acf-dialog #acf-dialog-inner').html(response.output);

				$('#acf-dialog #acf-dialog-inner form').submit(function(event){
					/**
					 * the default behavior of the form submit reloads the page,
					 * which we dont want to do, so we prevent it here and handle submitting and content refresh on our own
					 */
					event.preventDefault();
				});

				$('#acf-dialog')
					.fadeIn()
					.addClass('active');
			});
		},

		/**
		 * Hides acf form dialog
		 */
		hide_acf_form: function(){
			$('#acf-dialog')
				.fadeOut()
				.removeClass('active');
		},

		/**
		 * Refreshes element content with new field data
		 * @param {string} field_key acf field key
		 * @param {string} post_id
		 * @param {string} this_options current editor options
		 * @param {string} this_editor current editor
		 */
		refresh_acf_field: function(field_key, post_id, this_options, this_editor){
			var self = this;
			self.get_acf_field_contents(field_key, post_id, function(response){
				var output_content = '';

				if(this_options.hasOwnProperty('output')){
					var output_trail = this_options.output.split('.');
					output_content = response.value;
					for(var i = 0; i < output_trail.length; i++){
						output_content = output_content[output_trail[i]];
					}
				}else{
					output_content = response.value;
				}

				if(!wa_fronted.specific_output_to(this_editor, this_options, response.value.ID, output_content)){
					this_editor.html(output_content);
				}

				self.hide_acf_form();
			});
		}

	};

})(jQuery);