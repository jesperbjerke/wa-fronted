/* global tinymce */
window.wp = window.wp || {};

tinymce.PluginManager.add( 'fronted_shortcode', function( editor ) {
	var tinymce = window.tinymce,
		tinymce_editor_obj = editor;

	editor.shortcode_edit = {
		/**
		 * Binds all shortcode wraps in editor to show edit button on hover
		 * @param  {jQuery Object} editor
		 */
		bind_shortcode_edit: function(editor){
			var self = this;
			editor = jQuery(editor);
			editor.find('.wa-shortcode-wrap')
				.off('hover')
				.hover(
					function(){
						self.show_shortcode_button(jQuery(this), editor);
					},
					function(){
						self.hide_shortcode_button();
					}
				);
		},

		/**
		 * Binds and shows shortcode edit button
		 * @param  {jQuery Object} element shortcode wrap element
		 * @param  {jQuery Object} editor current editor element
		 */
		show_shortcode_button: function(element, editor){

			var self 		  	= this,
				wrap_children   = element.children(),
				wrap_contents   = (wrap_children.length !== 0) ? jQuery(wrap_children[0]) : element,
				offset          = wrap_contents.offset(),
				scroll_top      = jQuery(window).scrollTop(),
				distance_to_top = offset.top - scroll_top,
				pos_top         = offset.top;
				
			var shortcode_toolbar = jQuery('#wa-fronted-edit-shortcode');

			shortcode_toolbar.removeClass('arrow-over arrow-under');

	        if(distance_to_top <= 42){
	            pos_top = offset.top + wrap_contents.height() + 42;
	            shortcode_toolbar.addClass('arrow-over');
	        }else{
	            shortcode_toolbar.addClass('arrow-under');
	        }

			shortcode_toolbar
				.css({
					'left' : (offset.left + ((wrap_contents.width() / 2) - (shortcode_toolbar.width() / 2))),
					'top'  : pos_top
				})
				.addClass('show')
				.hover(
					function(){
						jQuery(this).addClass('show');
					},
					function(){
						self.hide_shortcode_button();
					}
				);

			var shortcode_button = shortcode_toolbar.find('#wa-fronted-edit-shortcode-button'),
				remove_shortcode_button = shortcode_toolbar.find('#wa-fronted-remove-shortcode-button');

			shortcode_button.addClass('show');
			shortcode_button.off();
			shortcode_button.one('click', function(e){
				e.preventDefault();
				self.show_shortcode_edit(element, editor);
			});

			remove_shortcode_button.addClass('show');
			remove_shortcode_button.off();
			remove_shortcode_button.one('click', function(e){
				e.preventDefault();
				element.remove();
				self.hide_shortcode_button();
				tinymce_editor_obj.fire('change');
			});
		},

		hide_shortcode_button: function(){
			jQuery('#wa-fronted-edit-shortcode').removeClass('show');
			jQuery('#wa-fronted-edit-shortcode-button').addClass('show');
			jQuery('#wa-fronted-remove-shortcode-button').addClass('show');
			jQuery('#wa-fronted-edit-shortcode .shortcode-input-wrapper').removeClass('show');
		},

		/**
		 * Either calls appropriate action or shows shortcode edit input
		 * @param  {jQuery Object} element shortcode wrap element
		 * @param  {jQuery Object} editor current editor element
		 */
		show_shortcode_edit: function(element, editor){

			var self 	  		  = this,
				shortcode         = wa_fronted.shortcode_from_attr(element),
				shortcode_base    = element.attr('data-shortcode-base'),
				shortcode_actions = wa_fronted.apply_filters('shortcode_actions', ['gallery']);

			if(shortcode_actions.indexOf(shortcode_base) !== -1){

				wa_fronted.is_editing_shortcode = element;
				wa_fronted.do_action('shortcode_action_' + shortcode_base, shortcode, element);

			}else{

				var	wrap_children     = element.children(),
					wrap_contents     = (wrap_children.length !== 0) ? jQuery(wrap_children[0]) : element,
					offset            = wrap_contents.offset(),
					shortcode_toolbar = jQuery('#wa-fronted-edit-shortcode');
				
				jQuery('#wa-fronted-edit-shortcode-button').removeClass('show');
				jQuery('#wa-fronted-remove-shortcode-button').removeClass('show');

				shortcode_toolbar.find('.shortcode-input-wrapper').addClass('show');

				shortcode_toolbar.find('#submit-shortcode')
					.off()
					.one('click', function(e){
						e.preventDefault();
						wa_fronted.show_loading_spinner();
						var new_shortcode = shortcode_toolbar.find('#wa_fronted_shortcode_input').val();

					    wa_fronted.shortcode_to_html(new_shortcode, false, function(html){
					    	if(html !== ''){
					            wa_fronted.replace_html(element, html);
					        	self.bind_shortcode_edit(editor);
					        }else{
					    		toastr.error(wa_fronted.i18n('Render unsuccessful'), wa_fronted.i18n('Sent code is not a valid shortcode'));
					    	}

					    	wa_fronted.hide_loading_spinner();
					    });

					});

				shortcode_toolbar
					.css({
						'left' : (offset.left + ((wrap_contents.width() / 2) - (shortcode_toolbar.width() / 2)))
					})
					.find('input').val(shortcode).focus();

			}
		}
	};

	editor.addButton('render_shortcode', {
		tooltip : wa_fronted.i18n('Render as shortcode'),
		text    : '[ ]',
		context : 'insert',
		onclick : function() {
		    wa_fronted.show_loading_spinner();
		    var curr_text = editor.selection.getContent({format : 'text'});

		    wa_fronted.shortcode_to_html(curr_text, true, function(html){

		    	if(html !== ''){
		            editor.selection.setContent(html);
		    	}else{
		    		toastr.error(wa_fronted.i18n('Render unsuccessful'), wa_fronted.i18n('Selected text is not a valid shortcode'));
		    	}

		    	editor.shortcode_edit.bind_shortcode_edit(editor.targetElm);
		    	wa_fronted.hide_loading_spinner();
		    });
		}
	});

	editor.settings.toolbar.push('render_shortcode');

	jQuery(window).load(function(){
		editor.shortcode_edit.bind_shortcode_edit(editor.targetElm);
	});

});