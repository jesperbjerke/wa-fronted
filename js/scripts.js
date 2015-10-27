/**
 * Tiny MCE scripts
 */
//@prepros-prepend 'tinymce/tinymce.shortcode.js'
//@prepros-prepend 'tinymce/tinymce.image.js'
//@prepros-prepend 'tinymce/tinymce.theme.js'

/**
 * 3rd party libs
 */
//@prepros-prepend 'modernizr.custom.js'
//@prepros-prepend '../bower_components/tipso/src/tipso.min.js'
//@prepros-prepend '../bower_components/toastr/toastr.js'
//@prepros-prepend '../bower_components/select2/dist/js/select2.full.min.js'
//@prepros-prepend '../bower_components/rangy/rangy-core.min.js'

/**
 * Custom packages
 */
//@prepros-prepend 'featured-image.js'
//@prepros-prepend 'eventmanager.js'
//@prepros-append 'validate.js'

function escape_regexp(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

window.wa_fronted = {};
var wa_fronted = window.wa_fronted;

(function($){

	window.wp = window.wp || {};
	var tinymce = window.tinymce;

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
    };

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

				rangy.init();

				var editor_setup = function(index, el){
					el = $(el);
					el.addClass('wa-fronted-editor');
					self.setup_editor(el, self.options.editable_areas[i], self.options);
					self.data.editable_areas.push({
						editor  : el,
						options : self.options.editable_areas[i]
					});
				};

				for(var i = 0; i < self.options.editable_areas.length; i++){
					var editors = $(self.options.editable_areas[i].container);
					if(editors.length !== 0){
						$.each(editors, editor_setup);
					}
				}

				//Setup toastr options
				toastr.options.timeOut       = "7000";
				toastr.options.positionClass = "toast-bottom-right";
				toastr.options.closeButton   = true;

				var post_id = $('#wa-fronted-revisions').attr('data-post-id');
				if(post_id){
					self.check_autosave(post_id);
				}

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
				$('#wa-fronted-revisions-modal').fadeOut('fast');
				$('#wa-fronted-settings-modal').fadeIn('fast');
				$('html, body').addClass('wa-modal-open');
			});

			$('#wa-fronted-revisions').click(function(){
				$('#wa-fronted-settings-modal').fadeOut('fast');
				$('html, body').removeClass('wa-modal-open');

				var post_id = $(this).attr('data-post-id');
				self.show_revision_modal(post_id);
			});

			$('.close-wa-fronted-modal').click(function(){
				$('#wa-fronted-settings-modal, #wa-fronted-revisions-modal').fadeOut('fast');
				$('html, body').removeClass('wa-modal-open');
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

			$('#wa-fronted-settings-modal select').select2({
				minimumResultsForSearch : 10,
				formatNoMatches : function(term){
					var no_results_string = self.i18n('No results found.');

					if(term !== ''){
						var curr_select 	= $(this);
							taxonomy        = curr_select.attr('data-tax'),
							is_hierarchical = curr_select.attr('data-hierarchical');

						no_results_string += ' <a class="wa-add-tax-btn" href="javascript:void(0)" onclick="wa_fronted.add_tax_term(\''
							+ term + '\', \''
							+ taxonomy + '\', '
							+ is_hierarchical
							+ ')"><i class="dashicons dashicons-plus"></i> ' + self.i18n('Add') + '</a>';
					}

					return no_results_string;
				}
			});

			self.do_action('on_bind');

			window.onbeforeunload = function(){
				if(self.data.has_changes && !self.data.is_saving){
			  		return self.i18n('The changes you have made will be lost if you navigate away from this page.');
				}
			};
		},

		/**
		 * Sets up editor instance with specific options for field
		 * @param  {jQuery Object} 		element to attach editor to
		 * @param  {Object} 			specific options for this field
		 * @param  {Object} 			all options for all fields
		 */
		setup_editor: function(this_editor, this_options, all_options){

			var self = this,
				editor_options = {
					selector : this_options.container,
					theme : 'fronted',
				    toolbar	: [
						'bold',
						'italic',
						'strikethrough',
						'bullist',
						'numlist',
						'blockquote',
						'alignleft',
						'aligncenter',
						'alignright',
						'link',
						'unlink',
						'h2',
						'h3'
					],
					plugins : [
						'hr',
						'lists',
						'media',
						'paste',
						'wordpress',
						'wplink',
						'wpdialogs',
						'wpview'
			        ],
					inline : true,
					relative_urls : false,
					convert_urls : false,
					paste_as_text : true,
					browser_spellcheck : true,
					directionality : this_options.direction,
					wpeditimage_html5_captions : true,
					fronted_options : this_options,
					wpautop : false,
					setup: function( editor ) {

						if(this_options.paragraphs !== true){
							editor.on('keydown', function(e){
								if(e.which === 13){
									e.preventDefault();
									e.stopPropagation();
									return false;
								}else{
									return true;
								}
							});
							editor.on('blur', function(e){
								editor.setContent(editor.getContent({format : 'text'}));
							});
						}

						//Hook onto paste event and determine if pasted content is valid oEmbed
						editor.on('paste', function(event){
							var clipboardData = event.clipboardData.getData('text/plain');
							if(clipboardData && (clipboardData.indexOf('http://') !== -1 || clipboardData.indexOf('https://') !== -1)){
								event.preventDefault();
								self.show_loading_spinner();
								$.post(
									global_vars.ajax_url,
									{
										'action' : 'wa_get_oembed',
										'link'	 : clipboardData
									},
									function(response){
										if(response.oembed !== false){
											editor.insertContent(response.oembed);
										}else{
											editor.insertContent('<a href="' + clipboardData + '">' + clipboardData + '</a>');
										}
										self.hide_loading_spinner();
									}
								);
							}
						});

						// Register changes to the editor and show savebutton
						editor.on('change', function (event) {
							clearTimeout(self.data.timers[editor.id]);
							self.data.timers[editor.id] = setTimeout(function(){
								self.data.has_changes = true;
								self.validate(this_editor, this_options);
								self.autosave(this_editor, this_options);
								self.show_save_button();
							}, 1000);
						});

						editor.on('click', function(event){
							if(event.target.nodeName === 'A' && event.ctrlKey){
								var win = window.open(event.target.href, '_blank');
  								win.focus();
							}
						});

						editor.on('focus', function(event){
							window.wpActiveEditor = editor.id;
						});

						self.do_action('on_tinymce_setup', editor, this_options, all_options);
					}
				};

			if(this_options.toolbar === undefined){
				this_options.toolbar = 'full';
			}

			if(this_options.toolbar === 'false' || this_options.toolbar === false){
				editor_options.toolbar = false;
			}else if(this_options.toolbar !== 'full'){
				editor_options.toolbar = (this_options.toolbar.replace(/\s+/g, '')).split(',');
			}

			if(this_options.toolbar !== 'false' && this_options.toolbar !== false){
				editor_options.toolbar = self.apply_filters('toolbar_buttons', editor_options.toolbar, this_options);
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

			if(this_options.media_upload !== 'only' && this_options.native){

				if(this_options.field_type !== 'meta_select'){

					if(this_options.media_upload === true){
						editor_options.plugins.push('fronted_image');
					}

					if(this_options.shortcodes === true){
						editor_options.plugins.push('fronted_shortcode');
					}

					editor_options.plugins = self.apply_filters('editor_plugins', editor_options.plugins, this_options);

					tinymce.init(editor_options);

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
					select_el.select2({
						minimumResultsForSearch : 10
					});
					select_el.on('change', function( event ) {
						var value = select_el.val();
						if(!self.specific_output_to(this_editor, this_options, value, value)){
							this_editor.html(value);
							this_editor.attr('data-db-value', value);
						}
					});

					var content_width = this_editor.width(),
						content_pos   = this_editor.position(),
						button_el     = select_el.data('select2').container,
						menu_el       = select_el.data('select2').dropdown;

					button_el
						.css({
							'left' : (content_pos.left + ((content_width / 2) - (button_el.width() / 2))) + 'px'
						})
						.addClass('wa-fronted-selectmenu');

					var edit_select_timeout;

					var hide_selectmenu = function(){
						edit_select_timeout = setTimeout(function(){
							button_el.removeClass('show');
							select_el.select2('close');
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

				new fronted_featured_img(this_editor, this_options);

			}else{
				self.do_action('on_setup_editor', this_editor, this_options, all_options);
			}
		},

		/**
		 * Auto save post
		 * @param  {jQuery Object} 	editor element of what to save
		 * @param  {Object} 		options for this editor
		 */
		autosave: function(editor_container, options){
			var self = this;
			// Setup timer so we dont spam database with autosaves
			clearTimeout(self.data.timers.autosave);
			self.data.timers.autosave = setTimeout(function(){
				// Dont do autosave if we're already saving normally
				if(!self.data.is_saving){
					var editors = self.data.editable_areas,
						save_this = [];

					for(var i = 0; i < editors.length; i++){
						if(editors[i].options.field_type !== 'post_thumbnail'){
							var db_value = editors[i].editor.attr('data-db-value'),
								content = '';

							if(typeof db_value !== 'undefined' && db_value !== false){
								content = db_value;
							}else{
								content = tinymce.editors[editors[i].editor[0].id].getContent();
							}

							save_this.push({
								'content' : content,
								'options' : editors[i].options
							});
						}
					}

					$.post(
						global_vars.ajax_url,
						{
							'action'                : 'wa_fronted_autosave',
							'data'                  : save_this,
							'wa_fronted_save_nonce' : global_vars.nonce
						},
						function(response){
							if(response.success){
								toastr.info(self.i18n('A draft of this post has been saved automatically'), self.i18n('Draft autosaved'));
							}
						}
					);
				}
			}, 10000);
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
					if(editors[i].options.field_type !== 'post_thumbnail'){
						var db_value = editors[i].editor.attr('data-db-value'),
							content = '';

						if(typeof db_value !== 'undefined' && db_value !== false){
							content = db_value;
						}else{
							content = tinymce.editors[editors[i].editor[0].id].getContent();
						}

						save_this.push({
							'content' : content,
							'options' : editors[i].options
						});
					}
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
							toastr.success(self.i18n('Contents have been saved successfully'), self.i18n('Save successful'));
						}else if(typeof response.error !== 'undefined'){
							toastr.error(response.error, self.i18n('Save unsuccessful'));
						}

						self.data.is_saving = false;
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
				toastr.error(self.i18n('There were validation errors!'), self.i18n('Save unsuccessful'));
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
		 * @param  {Object} element 	jQuery object
		 * @return {string}         	shortcode
		 */
		shortcode_from_attr: function(element){
			return decodeURIComponent(element.attr('data-shortcode'));
		},

		/**
		 * Takes a shortcode and returns rendered html from it
		 * @param  {string}   shortcode 	a valid WordPress shortcode
		 * @param  {Function} callback  	callback function, sends html as parameter
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
		 * @return {Object} 	pixel position in X and Y
		 */
		getCaretPositionPx: function() {
		    var x = 0, y = 0;
		    var sel = window.getSelection();
		    if (sel.rangeCount) {

		        var range = sel.getRangeAt(0);

	            if (range.getClientRects) {
	                var rects = range.getClientRects();
	                if (rects.length > 0) {
	                    x = rects[0].left;
	                    y = rects[0].top;
	                }
	            }

	            if (x == 0 && y == 0) {
	                var span = window.document.createElement("span");
	                if (span.getClientRects) {
	                    // Ensure span has dimensions and position by
	                    // adding a zero-width space character
	                    span.appendChild( window.document.createTextNode("\u200b") );
	                    range.insertNode(span);
	                    rect = span.getClientRects()[0];
	                    x = rect.left;
	                    y = rect.top;
	                    var spanParent = span.parentNode;
	                    spanParent.removeChild(span);

	                    // Glue any broken text nodes back together
	                    spanParent.normalize();
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
		insertHtmlAtCaret: function(html, sel, range) {
		    var self = this;

		    sel = sel || false;
		    range = range || false;

		    if (window.getSelection) {
		        // IE9 and non-IE

		        if(sel === false && range === false){
			        if(typeof self.data.current_selection === 'undefined' || self.data.current_selection === false){
			            sel = window.getSelection();
			            range = sel.getRangeAt(0);
			        }else{
			            sel = self.data.current_selection;
			            range = self.data.current_range;
			        }
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
		 * @param  {mixed} element 		a selector or jQuery object of element to replace
		 */
		replace_html: function(element, new_content){
			el = $(element);
			el.replaceWith(new_content);
		},

		/**
		 * If value should be validated, run validation function and trigger tooltip if invalid
		 * @param  {jQuery Object} 	this_editor
		 * @param  {Object} 		this_options
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
		},

		/**
		 * Create new taxonomy term and add it to the select2 selectbox
		 * @param {string} 		 term            	the new term name
		 * @param {string}  	taxonomy        	taxonomy to add the term to
		 * @param {Boolean} 	is_hierarchical 	if taxonomy is hierarchical
		 * @param {function} 	callback
		 */
		add_tax_term: function(term, taxonomy, is_hierarchical){
			var self = this,
				term_params = {
					'action'   : 'wa_add_tax_term',
					'term'     : term,
					'taxonomy' : taxonomy
	            };

			self.show_loading_spinner();

			$.post(
	            global_vars.ajax_url,
	            term_params,
	            function(response){
					$('<option value="' + response.term_id + '" selected>' + term + '</option>').appendTo('#wa_fronted_tax_' + taxonomy);
					$('#wa_fronted_tax_' + taxonomy).trigger('change');
	            	self.hide_loading_spinner();
	            }
	        );
		},

		/**
		 * Gets revisions from post id
		 * @param  {int}   		post_id
		 * @param  {Function} 	callback
		 */
		get_revisions: function(post_id, callback){
			var self = this;
			self.show_loading_spinner();

			$.post(
	            global_vars.ajax_url,
	            {
					'action'  : 'wa_get_revisions',
					'post_id' : post_id
	            },
	            function(response){
	            	self.hide_loading_spinner();
	            	callback(response);
	            }
	        );

		},

		/**
		 * Change all data on page to data from revision
		 * @param  {Object} revision 	revision data to change to
		 */
		switch_to_revision: function(revision){
			var self = this,
				editors = self.data.editable_areas;

			for(var i = 0; i < editors.length; i++){

				var new_content = false,
					output_content = false;

				if(revision.hasOwnProperty(editors[i].options.field_type)){
					new_content = revision[editors[i].options.field_type];
				}

				var db_value = self.apply_filters('revision_db_value', new_content, editors[i], revision);

				output_content = self.apply_filters('revision_content', new_content, editors[i], revision);

				if(output_content !== false){
					if(!self.specific_output_to(editors[i].editor, editors[i].options, db_value, output_content)){
						editors[i].editor.html(output_content);
					}

					var this_tinymce = tinymce.get(editors[i].editor.attr('id'));
					if(this_tinymce !== null && this_tinymce.hasOwnProperty('shortcode_edit')){
						this_tinymce.shortcode_edit.bind_shortcode_edit(editors[i].editor);
					}
					self.validate(editors[i].editor, editors[i].options);
				}

			}

			self.data.has_changes = true;
			self.show_save_button();

		},

		/**
		 * Retrieves revisions and shows revisions switcher
		 * @param  {int} post_id
		 */
		show_revision_modal: function(post_id, switch_to_latest){
			var self = this;

			switch_to_latest = switch_to_latest || false;

			self.get_revisions(post_id, function(revisions){

				if(revisions.length !== 0){

					var current_revision = revisions.length - 1;
						revision_input 	= $('#wa_fronted_switch_revision');

					if(revisions[current_revision].post_name.indexOf('-autosave-v1') !== -1){
						current_revision = current_revision - 1;
					}

					if(switch_to_latest){
						current_revision = revisions.length - 1;
						self.switch_to_revision(revisions[current_revision]);
					}

					revision_input.val(revisions[current_revision].post_date);

					if(current_revision === (revisions.length - 1)){
						$('#wa-previous-revision').removeClass('disabled');
						$('#wa-next-revision').addClass('disabled');
					}else if(current_revision === 0){
						$('#wa-next-revision').removeClass('disabled');
						$('#wa-previous-revision').addClass('disabled');
					}else{
						$('#wa-next-revision').removeClass('disabled');
						$('#wa-previous-revision').removeClass('disabled');
					}

					$('#wa-previous-revision, #wa-next-revision').off();

					$('#wa-previous-revision').on('click', function(e){
						e.preventDefault();
						if(current_revision - 1 >= 0){
							$('#wa-next-revision').removeClass('disabled');

							current_revision = current_revision - 1;
							revision_input.val(revisions[current_revision].post_date);
							self.switch_to_revision(revisions[current_revision]);

							if(current_revision === 0){
								$(this).addClass('disabled');
							}
						}
					});

					$('#wa-next-revision').on('click', function(e){
						e.preventDefault();
						if(current_revision + 1 <= (revisions.length - 1)){
							$('#wa-previous-revision').removeClass('disabled');

							current_revision = current_revision + 1;
							revision_input.val(revisions[current_revision].post_date);
							self.switch_to_revision(revisions[current_revision]);

							if(current_revision === (revisions.length - 1)){
								$(this).addClass('disabled');
							}
						}
					});

					$('#wa-fronted-revisions-modal').fadeIn('fast');
				}

			});
		},

		/**
		 * Check if an autosave exists and tell the use if it does
		 * @param  {int} post_id
		 */
		check_autosave: function(post_id){
			var self = this;

			$.post(
	            global_vars.ajax_url,
	            {
					'action'  : 'wa_fronted_get_autosave',
					'post_id' : post_id
	            },
	            function(response){
	            	if(response.success && response.data !== false){
	            		if(confirm(self.i18n('There is an autosave of this post that is more recent than the version below. View the autosave?'))){
	            			self.show_revision_modal(post_id, true);
	            		}
	            	}
	            }
	        );

		},

		/**
		 * Returns translated string if there is one, otherwise the original
		 * @param  {string} string string to translate
		 * @return {string}        translated string
		 */
		i18n: function(){

			var args = Array.prototype.slice.call( arguments );
			var string = args.shift();

			if(global_vars.i18n.hasOwnProperty(string)){
				string = global_vars.i18n[string];
			}

			if(string.indexOf('%s') !== -1){
				if(Array.isArray(args) && args.length !== 0){
					for(var i = 0; i < args.length; i++){
						string = string.replace('%s', args[i]);
					}
				}
			}
		
			return string;
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