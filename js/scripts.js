//@prepros-prepend 'modernizr.custom.js'
//@prepros-prepend '../bower_components/medium-editor/dist/js/medium-editor.min.js'
//@prepros-prepend '../bower_components/tipso/src/tipso.min.js'
//@prepros-prepend '../bower_components/toastr/toastr.js'
//@prepros-prepend 'eventmanager.js'
//@prepros-prepend 'medium-wa-image-upload.js'
//@prepros-prepend 'medium-wa-render-shortcode.js'
//@prepros-append 'validate.js'

function escape_regexp(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

var wa_fronted;

(function($){

    $.fn.getCursorPosition = function() {
        var el = $(this).get(0);
        var pos = 0;
        if('selectionStart' in el) {
            pos = el.selectionStart;
        } else if('selection' in document) {
            el.focus();
            var Sel = document.selection.createRange();
            var SelLength = document.selection.createRange().text.length;
            Sel.moveStart('character', -el.value.length);
            pos = Sel.text.length - SelLength;
        }
        return pos;
    }

	wa_fronted = {

		options: $.parseJSON(global_vars.options),

		/**
		 * Contains running auto save timers and editable areas and temporary current data
		 * @type {Object}
		 */
		data: {
			editable_areas         : [],
			timers                 : {},
			current_selection      : false,
			current_range          : false,
			current_editor_options : false,
			has_changes            : false,
			has_errors             : false,
			is_saving              : false
		},

		/*
		*  This function uses wp.hooks to mimics WP add_action
		*
		*  @param	
		*  @return
		*/
		add_action: function() {
			
			// allow multiple action parameters such as 'ready append'
			var actions = arguments[0].split(' ');
			
			for( k in actions ) {
			
				// prefix action
				arguments[0] = 'wa_fronted.' + actions[ k ];
				
				wp.hooks.addAction.apply(this, arguments);
			}
			
			return this;
			
		},
		
		/*
		*  This function uses wp.hooks to mimics WP remove_action
		*
		*  @param	
		*  @return
		*/
		remove_action: function() {
			
			// prefix action
			arguments[0] = 'wa_fronted.' + arguments[0];
			
			wp.hooks.removeAction.apply(this, arguments);
			
			return this;
			
		},
		
		/*
		*  This function uses wp.hooks to mimics WP do_action
		*
		*  @param	
		*  @return
		*/
		do_action: function() {
			
			// prefix action
			arguments[0] = 'wa_fronted.' + arguments[0];
			
			wp.hooks.doAction.apply(this, arguments);
			
			return this;
			
		},
		
		/*
		*  This function uses wp.hooks to mimics WP add_filter
		*
		*  @param	
		*  @return
		*/
		add_filter: function() {
			
			// prefix action
			arguments[0] = 'wa_fronted.' + arguments[0];
			
			wp.hooks.addFilter.apply(this, arguments);
			
			return this;
			
		},
		
		/*
		*  This function uses wp.hooks to mimics WP remove_filter
		*
		*  @param	
		*  @return
		*/
		remove_filter: function() {
			
			// prefix action
			arguments[0] = 'wa_fronted.' + arguments[0];
			
			wp.hooks.removeFilter.apply(this, arguments);
			
			return this;
			
		},
		
		/*
		*  This function uses wp.hooks to mimics WP apply_filters
		*
		*  @param	
		*  @return
		*/
		apply_filters: function() {
			
			// prefix action
			arguments[0] = 'wa_fronted.' + arguments[0];
			
			return wp.hooks.applyFilters.apply(this, arguments);
			
		},

		/**
		 * Loop through all editable areas and setup editor for each
		 */
		initialize: function(){
			var self = this;

			if(typeof self.options.editable_areas !== 'undefined' && self.options.editable_areas.length !== 0){
				for(var i = 0; i < self.options.editable_areas.length; i++){
					
					var editors = $(self.options.editable_areas[i].container);

					if(editors.length !== 0){
						$.each(editors, function(index, el){
							el = $(el);
							el.addClass('wa-fronted-editor');
							self.setup_editor(el, self.options.editable_areas[i], self.options);
							self.data.editable_areas.push({
								editor  : el,
								options : self.options.editable_areas[i]
							});
						});
					}
				}

				//Setup toastr options
				toastr.options.timeOut       = "7000";
				toastr.options.positionClass = "toast-bottom-right";

				self.do_action('on_init');
				self.bind();
			}
		},

		/**
		 * Do global event bindings
		 */
		bind: function(){
			var self = this;

			$('#wa-fronted-save').click(function(){
				self.save();
			});

			$('#wa-fronted-settings').click(function(){
				$('#wa-fronted-settings-modal').fadeIn('fast');
			});

			$('.close-wa-fronted-modal').click(function(){
				$('#wa-fronted-settings-modal').fadeOut('fast');
			});

			var wa_datepicker = $('.wa_fronted_datepicker');
			wa_datepicker.each(function(index, el){

				var this_dp = $(el),
					opts = {
						dateFormat : 'yy-mm-dd'
					};

				if(this_dp.attr('data-time') !== 'false'){
					opts.timeFormat = 'HH:mm:ss';
				}else{
					opts.showTimepicker = false;
				}

				this_dp.datetimepicker(opts);

				this_dp.datetimepicker('setDate', this_dp.val());
			});

			$('#wa-fronted-settings-modal select').selectmenu();

			self.do_action('on_bind');

			window.onbeforeunload = function(){
				if(self.data.has_changes && !self.data.is_saving){
			  		return 'The changes you have made will be lost if you navigate away from this page.';
				}
			};
		},

		/**
		 * Sets up editor instance with specific options for field
		 * @param  {jQuery Object} element to attach editor to
		 * @param  {Object} specific options for this field
		 * @param  {Object} all options for all fields
		 */
		setup_editor: function(this_editor, this_options, all_options){

			var self = this,
				editor_options = {
				    toolbar	: {
				    	buttons : [
					    	'bold', 
					    	'italic', 
					    	'underline', 
					    	'anchor', 
					    	'h2',
					    	'h3', 
					    	'quote', 
					    	'unorderedlist', 
					    	'orderedlist', 
					    	'justifyLeft', 
					    	'justifyCenter', 
					    	'justifyRight',
					    	'renderShortcode'
					    ]
					},
					buttonLabels      : 'fontawesome',
					imageDragging     : false,
					cleanPastedHTML   : true,
					placeholder       : false,
					// forcePlainText : true,
					autoLink          : true,
					anchorPreview     : false,
					anchor            : {
				    	linkValidation : true
				    },
				    extensions 		  : {}
				};

			if(this_options.toolbar === undefined){
				this_options.toolbar = 'full';
			}

			if(this_options.toolbar === 'false' || this_options.toolbar === false){
				editor_options.toolbar = false;
			}else if(this_options.toolbar !== 'full'){
				editor_options.toolbar.buttons = (this_options.toolbar.replace(/\s+/g, '')).split(',');
			}
			
			if(this_options.toolbar !== 'false' && this_options.toolbar !== false){
				editor_options.toolbar.buttons = self.apply_filters('toolbar_buttons', editor_options.toolbar.buttons, this_options);
			}

			this_editor.click(function(){
				var sel = window.getSelection();
				if(sel){
			        self.data.current_selection = $.extend({}, sel);
			        if(sel.rangeCount){
			        	self.data.current_range = sel.getRangeAt(0);
					}
				}
			});

			var editor = false;

			if(this_options.media_upload !== 'only' && this_options.native){

				if(this_options.field_type !== 'meta_select'){

					if(this_options.media_upload === true){
						editor_options.extensions.image_upload = new Wa_image_upload(this_options);
					}

					if(editor_options.toolbar.hasOwnProperty('buttons') && editor_options.toolbar.buttons.indexOf('renderShortcode')){
						editor_options.extensions.renderShortcode = new Wa_render_shortcode(this_options);
					}
					
					editor_options.extensions = self.apply_filters('medium_extensions', editor_options.extensions, this_options);

					editor = new MediumEditor(this_editor, editor_options);

					//Hook onto paste event and determine if pasted content is valid oEmbed
					editor.subscribe('editablePaste', function (event, editable) {
						event.preventDefault();
						var clipboardData = event.clipboardData.getData('text/plain');
						if(clipboardData && (clipboardData.indexOf('http://') !== -1 || clipboardData.indexOf('https://') !== -1)){
							self.show_loading_spinner();
							$.post(
								global_vars.ajax_url,
								{
									'action' : 'wa_get_oembed',
									'link'	 : clipboardData
								}, 
								function(response){
									if(response.oembed !== false){
										var current_content = this_editor.html(),
											regex_str	= escape_regexp(clipboardData),
											regex       = new RegExp(regex_str, 'm'),
											new_content = current_content.replace(regex, response.oembed);
										this_editor.html(new_content);
									}
									self.hide_loading_spinner();
								}
							);
						}
					});

					if(this_options.paragraphs === false){
						this_editor.keypress(function(e){
							return e.which != 13; 
						});
						this_editor.on('focusout', function(e){
							this_editor.html(this_editor.text());
						});
					}

					if(this_options.direction === 'rtl'){
						this_editor.attr('dir', 'rtl');
					}

				}else if(this_options.hasOwnProperty('values') && this_options.values.length > 1 && this_options.hasOwnProperty('meta_key') && this_options.native){

					//Setup select dropdown

					var select_el = document.createElement('select');
					
					select_el.id        = 'select_' + this_options.meta_key;
					select_el.name      = 'select_' + this_options.meta_key;
					select_el.className = 'wa_fronted_select';

					for(var i = 0; i < this_options.values.length; i++){
						var this_value = this_options.values[i],
							option_el = document.createElement('option');
							
							option_el.value     = this_value.value;
							option_el.innerHTML = this_value.label;
					
							if(this_value.hasOwnProperty('selected') && this_value.selected){
								option_el.selected = true;
								this_editor.attr('data-db-value', this_value.value);
							}

							select_el.appendChild(option_el);
					}

					document.body.appendChild(select_el);
					var select_el = $(select_el);
					select_el.selectmenu({
						change: function( event, ui ) {
							if(!self.specific_output_to(this_editor, this_options, ui.item.value, ui.item.value)){
								this_editor.html(ui.item.value);
								this_editor.attr('data-db-value', ui.item.value);
							}
						}
					});

					var content_width = this_editor.width(),
						content_pos   = this_editor.position(),
						button_el     = select_el.selectmenu('instance').button,
						menu_el       = select_el.selectmenu('instance').menu;

					button_el
						.css({
							'left' : (content_pos.left + ((content_width / 2) - 13)) + 'px'
						})
						.addClass('wa-fronted-selectmenu');

					var edit_select_timeout;

					var hide_selectmenu = function(){
						edit_select_timeout = setTimeout(function(){
							button_el.removeClass('show');
							select_el.selectmenu('close');
						}, 500);
					};

					this_editor.hover(
						function(){
							clearTimeout(edit_select_timeout);
							var pos = this_editor.position();
							button_el
								.css({
									'top' : pos.top + 'px'
								})
								.addClass('show');
						},
						hide_selectmenu
					);

					button_el.hover(
						function(){
							clearTimeout(edit_select_timeout);
						},
						hide_selectmenu
					);

					menu_el.hover(
						function(){
							clearTimeout(edit_select_timeout);
						},
						hide_selectmenu
					);

				}

			}else if(this_options.media_upload === 'only' && this_options.native){
				editor_options.toolbar    = false;
				editor_options.spellcheck = false;
				editor_options.extensions = {
			    	'image_upload' : new Wa_image_upload(this_options)
			    }

				editor_options.extensions = self.apply_filters('medium_extensions', editor_options.extensions, this_options);

				editor = new MediumEditor(this_editor, editor_options);
			}else{
				self.do_action('on_setup_editor', this_editor, this_options, all_options);
			}


			//If editor exists
			if(editor !== false){
				//Register changes to the editor and show savebutton
				editor.subscribe('editableInput', function (event, editable) {
					clearTimeout(self.data.timers[editor.id]);
					self.data.timers[editor.id] = setTimeout(function(){
						self.data.has_changes = true;
						self.validate(this_editor, this_options);
						self.auto_save(this_editor, this_options);
						self.show_save_button();
					}, 1000);
				});
			}
		},

		/**
		 * Trigger custom Medium-Editor event
		 * @param  {string} event name of custom event
		 */
		trigger: function(instance, event){
			instance.events.customEvents[event][0]();
		},

		/**
		 * Auto save post
		 * @param  {jQuery Object} editor element of what to save
		 * @param  {Object} options for this editor
		 * @todo: auto save post
		 */
		auto_save: function(editor_container, options){
			// console.log('auto save', editor_container, options);
		},

		/**
		 * Save post
		 */
		save: function(){
			var self = this,
				editors = self.data.editable_areas,
				save_this = [];

			self.show_loading_spinner();
			
			if(!self.data.has_errors){

				self.data.is_saving = true;

				for(var i = 0; i < editors.length; i++){

					var db_value = editors[i].editor.attr('data-db-value'),
						content = '';

					if(typeof db_value !== 'undefined' && db_value !== false){
						content = db_value;
					}else{
						content = editors[i].editor.html();
					}

					save_this.push({
						'content' : content,
						'options' : editors[i].options
					});
				}

				$.post(
					global_vars.ajax_url,
					{
						'action'                : 'wa_fronted_save',
						'data'                  : save_this,
						'wa_fronted_save_nonce' : global_vars.nonce
					}, 
					function(response){
						if(response.success){
							location.reload();
						}
						self.hide_loading_spinner();
					}
				);
			}else{
				for(var i = 0; i < editors.length; i++){
					if(editors[i].options.hasOwnProperty('has_errors') && editors[i].options.has_errors){
						editors[i].editor.tipso('destroy');
						editors[i].editor.tipso({
							'content'    : self.validation_msg(editors[i].options.validation.type, editors[i].options.validation.compare),
							'useTitle'   : false,
							'background' : '#bd362f'
						});
						editors[i].editor.tipso('show');
					}
				}
				self.hide_loading_spinner();
				toastr.error('Save unsuccessful', 'There were validation errors!');
			}
		},

		show_save_button: function(){
			$('#wa-fronted-save').fadeIn('fast');
		},

		show_loading_spinner: function(){
			$('#wa-fronted-spinner').fadeIn('fast');
		},
		
		hide_loading_spinner: function(){
			$('#wa-fronted-spinner').fadeOut('fast');
		},

		/**
		 * Decodes shortcode from [data-shortcode] attribute on target element
		 * @param  {Object} element jQuery object
		 * @return {string}         shortcode
		 */
		shortcode_from_attr: function(element){
			return decodeURIComponent(element.attr('data-shortcode'));
		},

		/**
		 * Takes a shortcode and returns rendered html from it
		 * @param  {string}   shortcode A valid WordPress shortcode
		 * @param  {Function} callback  Callback function, sends html as parameter
		 */
		shortcode_to_html: function(shortcode, comments, callback){
			$.post(
	            global_vars.ajax_url,
	            {
					'action'    : 'wa_render_shortcode',
					'shortcode' : shortcode,
					'comments'  : comments
	            }, 
	            function(response){
	                callback(response);
	            }
	        );
		},

		/**
		 * Get position of caret in pixels
		 * @return {Object} pixel position in X and Y
		 */
		getCaretPositionPx: function() {
		    var x = 0, y = 0;
		    var sel = window.getSelection();
		    if (sel.rangeCount) {

		        var range = sel.getRangeAt(0);
		        var needsToWorkAroundNewlineBug = (range.startContainer.nodeName.toLowerCase() == 'p' && range.startOffset == 0);

		        if (needsToWorkAroundNewlineBug) {
		            x = range.startContainer.offsetLeft;
		            y = range.startContainer.offsetTop;
		        } else {
		            if (range.getClientRects) {
		                var rects = range.getClientRects();
		                if (rects.length > 0) {
		                    x = rects[0].left;
		                    y = rects[0].top;
		                }
		            }
		        }
		    }
		    return { x: x, y: y };
		},

		/**
		 * Get currently selected text
		 * @return {string}
		 */
		getSelectionText: function(){
		    var text = "";
		    if (window.getSelection) {
		        text = window.getSelection().toString();
		    } else if (document.selection && document.selection.type != "Control") {
		        text = document.selection.createRange().text;
		    }
		    return text;
		},

		/**
		 * Output to specific element or attribute
		 * @todo read output options
		 */
		specific_output_to: function(this_editor, this_options, db_value, output_content){
			if(!this_options.hasOwnProperty('output_to')){
				return false;
			}

			if(this_options.output_to.hasOwnProperty('selector')){
				var selector = this_editor.find(this_options.output_to.selector);
				if(selector.length === 0){
					return false;
				}

				if(this_options.output_to.hasOwnProperty('attr')){
					selector.attr(this_options.output_to.attr, output_content);
				}else{
					selector.html(output_content);
				}
			}else if(Array.isArray(this_options.output_to)){

				for(var i = 0; i < this_options.output_to.length; i++){
					var this_selector_opts = this_options.output_to[i];
					if(!this_selector_opts.hasOwnProperty('selector')){
						continue;
					}

					var selector = this_editor.find(this_selector_opts.selector);
					if(selector.length === 0){
						return false;
					}

					if(this_selector_opts.hasOwnProperty('attr')){
						selector.attr(this_selector_opts.attr, output_content);
					}else{
						selector.html(output_content);
					}
				}

			}else{
				var selector = this_editor;
				if(this_options.output_to.hasOwnProperty('attr')){
					selector.attr(this_options.output_to.attr, output_content);
				}else{
					selector.html(output_content);
				}
			}

			this_editor.attr('data-db-value', db_value);

			return true;
		},

		/**
		 * Insert html at current caret position
		 * Curtesy of https://github.com/jillix/medium-editor-custom-html/
		 * @param {string} html
		 */
		insertHtmlAtCaret: function(html) {
		    var self = this,
		    	sel, 
		    	range;
		    if (window.getSelection) {
		        // IE9 and non-IE
		        if(typeof self.data.current_selection === 'undefined' || self.data.current_selection === false){
		            sel = window.getSelection();
		            range = sel.getRangeAt(0);
		        }else{
		            sel = self.data.current_selection;
		            range = self.data.current_range;
		        }

		        if(typeof range !== 'undefined' && range !== false){
		        	range.deleteContents();
		        }

		        // Range.createContextualFragment() would be useful here but is
		        // only relatively recently standardized and is not supported in
		        // some browsers (IE9, for one)
		        var el = document.createElement("div");
		        el.innerHTML = html;
		        var frag = document.createDocumentFragment(), node, lastNode;
		        while ((node = el.firstChild)) {
		            lastNode = frag.appendChild(node);
		        }
		        range.insertNode(frag);

		        self.current_selection = false;
		    } else if (document.selection && document.selection.type != "Control") {
		        // IE < 9
		        document.selection.createRange().pasteHTML(html);
		    }
		},

		/**
		 * Replaces selector or jQuery object with new content
		 * @param  {mixed} element a selector or jQuery object of element to replace
		 */
		replace_html: function(element, new_content){
			el = $(element);
			el.replaceWith(new_content);
		},

		/**
		 * If value should be validated, run validation function and trigger tooltip if invalid
		 * @param  {jQuery Object} this_editor
		 * @param  {Object} this_options
		 */
		validate: function(this_editor, this_options){
			var self = this;
			if(this_options.validation !== false){
				if(!self.validator(this_editor.text(), this_options.validation.type, this_options.validation.compare)){
					self.data.has_errors    = true;
					this_options.has_errors = true;
					this_editor.tipso({
						'content'    : self.validation_msg(this_options.validation.type, this_options.validation.compare),
						'useTitle'   : false,
						'background' : '#23282d'
					});
					this_editor.tipso('show');
				}else{
					this_editor.tipso('hide');
					this_editor.tipso('destroy');
				}
			}
		}

	};


	$(document).ready(function(){
		if((typeof global_vars.options !== 'undefined') && Modernizr.contenteditable){

			window.wp = window.wp || {};
			if(typeof window.wp.hooks === 'undefined'){
				window.wp.hooks = new EventManager();
			}

			wa_fronted.initialize();
		}
	});

})(jQuery);