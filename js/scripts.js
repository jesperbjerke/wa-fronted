//@prepros-prepend 'modernizr.custom.js'
//@prepros-prepend '../bower_components/medium-editor/dist/js/medium-editor.min.js'
//@prepros-prepend 'medium-wa-image-upload.js'

var wa_fronted = {

	options: jQuery.parseJSON(global_vars.options),

	/**
	 * Contains running auto save timers and editable areas
	 * @type {Object}
	 */
	data: {
		editable_areas         : [],
		timers                 : {},
		current_selection      : false,
		current_range          : false,
		current_editor_options : false,
		has_changes            : false,
		acf_temp               : {
			field_key : false,
			post_id   : false
		}
	},

	/**
	 * Loop through all editable areas and setup editor for each
	 */
	initialize: function(){
		var self = this;
		if(typeof self.options.editable_areas !== undefined && self.options.editable_areas.length !== 0){
			for(var i = 0; i < self.options.editable_areas.length; i++){
				
				var editors = jQuery(self.options.editable_areas[i].container);

				if(editors.length !== 0){
					jQuery.each(editors, function(index, el){
						el = jQuery(el);
						el.addClass('wa-fronted-editor');
						self.setup_editor(el, self.options.editable_areas[i], self.options);
						self.data.editable_areas.push({
							editor  : el,
							options : self.options.editable_areas[i]
						});
					});
				}
			}

			self.bind();
		}
	},

	/**
	 * Do global event bindings
	 */
	bind: function(){
		var self = this;
		jQuery('#acf-dialog #close-acf-dialog').click(function(e){
			e.preventDefault();
			e.stopPropagation();
			self.hide_acf_form();
		});

		jQuery('#wa-fronted-save').click(function(){
			self.save();
		});

		if(typeof acf !== 'undefined'){
			acf.add_action('submit', function(form){
				self.refresh_acf_field(self.data.acf_temp.field_key, self.data.acf_temp.post_id, self.data.current_editor_options, self.data.current_editor);
			});
		}

		jQuery('#wa-fronted-settings').click(function(){
			jQuery('#wa-fronted-settings-modal').fadeIn('fast');
		});

		jQuery('.close-wa-fronted-modal').click(function(){
			jQuery('#wa-fronted-settings-modal').fadeOut('fast');
		});

		var wa_datepicker = jQuery('.wa_fronted_datepicker');
		wa_datepicker.datetimepicker({
			dateFormat : 'yy-mm-dd',
			timeFormat : 'HH:mm:ss'
		});
		wa_datepicker.datetimepicker('setDate', wa_datepicker.val());

		jQuery('#wa-fronted-settings-modal select').selectmenu();

		window.onbeforeunload = function(){
			if(self.data.has_changes){
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
			    buttons: [
			    	'bold', 
			    	'italic', 
			    	'underline', 
			    	'anchor', 
			    	'header1', 
			    	'header2', 
			    	'quote', 
			    	'unorderedlist', 
			    	'orderedlist', 
			    	'justifyLeft', 
			    	'justifyCenter', 
			    	'justifyRight'
			    ],
			    buttonLabels: 'fontawesome',
			    imageDragging: false,
			    autoLink: true,
			    anchorPreview: false,
			    anchor: {
			    	linkValidation: true
			    }
			};

		if(this_options.toolbar === undefined){
			this_options.toolbar = 'full';
		}

		if(this_options.toolbar === 'false' || this_options.toolbar === false){
			editor_options.disableToolbar = true;
		}else if(this_options.toolbar !== 'full'){
			editor_options.buttons = (this_options.toolbar.replace(/\s+/g, '')).split(',');
		}

		this_editor.click(function(){
			var sel = window.getSelection();
			if(sel){
		        self.data.current_selection = jQuery.extend({}, sel);
		        if(sel.rangeCount){
		        	self.data.current_range = sel.getRangeAt(0);
				}
			}
		});

		var editor = false;

		if(this_options.media_upload !== 'only'){

			if(this_options.media_upload === true){
				editor_options.extensions = {
			    	'image_upload' : new Wa_image_upload(this_options)
			    }
			}

			editor = new MediumEditor(this_editor, editor_options);

			//Hook onto paste event and determine if pasted content is valid oEmbed
			editor.subscribe('editablePaste', function (event, editable) {
				event.preventDefault();
				var clipboardData = event.clipboardData.getData('text/plain');
				if(clipboardData && (clipboardData.indexOf('http://') !== -1 || clipboardData.indexOf('https://') !== -1)){
					self.show_loading_spinner();
					jQuery.post(
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
								console.log(regex, new_content);
								this_editor.html(new_content);
							}
							self.hide_loading_spinner();
						}
					);
				}
			});

		}else{

			//Send field_type to server and validate it against ACF
			self.get_acf_field_object(this_options.field_type, function(field_object){
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
						editor_contents = jQuery(editor_children[0]),
						content_width   = editor_contents.width(),
						content_pos     = editor_contents.position();

					this_editor.prepend('<button title="Edit ' + field_object.type + '" class="edit-acf-field" style="left: ' + (content_pos.left + ((content_width / 2) - 13)) + 'px;"><i class="fa fa-edit"></i></button>');
					this_editor.hover(
						function(){
							var pos = editor_contents.position();
							this_editor.find('.edit-acf-field')
								.css({
									'top' : pos.top + 'px'
								})
								.addClass('show');
						},
						function(){
							this_editor.find('.edit-acf-field')
								.removeClass('show');
						}
					);

					this_editor.find('.edit-acf-field').click(function(e){
						e.preventDefault();
						e.stopPropagation();
						self.show_acf_form(field_object.key, this_options.post_id, this_options, this_editor);
					});

				}else if(field_object.hasOwnProperty('error')){
					//field_type is not an ACF field
					editor_options.toolbar    = false;
					editor_options.spellcheck = false;
					editor_options.extensions = {
				    	'image_upload' : new Wa_image_upload(this_options)
				    }

					editor = new MediumEditor(this_editor, editor_options);
				}
			});

		}

		//If editor exists
		if(editor !== false){
			//Register changes to the editor and show savebutton
			editor.subscribe('editableInput', function (event, editable) {
				clearTimeout(self.data.timers[editor.id]);
				self.data.timers[editor.id] = setTimeout(function(){
					self.data.has_changes = true;
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
		console.log('auto save', editor_container, options);
	},

	/**
	 * Save post
	 */
	save: function(){
		var self = this,
			editors = self.data.editable_areas,
			save_this = [];

		self.show_loading_spinner();

		for(var i = 0; i < editors.length; i++){

			var db_value = editors[i].editor.attr('data-db-value'),
				content = '';

			if(typeof db_value !== typeof undefined && db_value !== false){
				content = db_value;
			}else{
				content = editors[i].editor.html();
			}

			save_this.push({
				'content' : content,
				'options' : editors[i].options
			});
		}

		jQuery.post(
			global_vars.ajax_url,
			{
				'action'                : 'wa_fronted_save',
				'data'                  : save_this,
				'wa_fronted_save_nonce' : self.options.nonce
			}, 
			function(response){
				if(response.success){
					location.reload();
				}
				self.hide_loading_spinner();
			}
		);
	},

	show_save_button: function(){
		jQuery('#wa-fronted-save').fadeIn('fast');
	},

	show_loading_spinner: function(){
		jQuery('#wa-fronted-spinner').fadeIn('fast');
	},
	
	hide_loading_spinner: function(){
		jQuery('#wa-fronted-spinner').fadeOut('fast');
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
		jQuery.post(
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
	 * Get ACF field object based on prefixed field key
	 * @param  {string}   field_key prefixed ACF field key
	 * @param  {Function} callback
	 */
	get_acf_field_object: function(field_key, callback){
		jQuery.post(
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
		jQuery.post(
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
		jQuery.post(
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

		self.data.acf_temp.field_key     = field_key;
		self.data.acf_temp.post_id       = post_id;
		self.data.current_editor_options = this_options;
		self.data.current_editor         = this_editor;

		self.get_acf_form(field_key, post_id, function(response){
			jQuery('#acf-dialog #acf-dialog-inner').html(response.output);

			jQuery('#acf-dialog #acf-dialog-inner form').submit(function(event){
				//the default behavior of the form submit reloads the page, which we dont want to do, so we prevent it here and handle content refresh on our own
				event.preventDefault();
			});

			jQuery('#acf-dialog')
				.fadeIn()
				.addClass('active');
		});
	},

	/**
	 * Hides acf form dialog
	 */
	hide_acf_form: function(){
		jQuery('#acf-dialog')
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

			if(!self.specific_output_to(this_editor, this_options, response.value.ID, output_content)){
				this_editor.html(output_content);
			}

			self.hide_acf_form();
		});
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
	        var needsToWorkAroundNewlineBug = (range.startContainer.nodeName.toLowerCase() == 'p'
	                                           && range.startOffset == 0);

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
		if(!this_options.hasOwnProperty('output_to') || !this_options.output_to.hasOwnProperty('selector')){
			return false;
		}

		var selector = jQuery(this_options.output_to.selector);
		if(selector.length === 0){
			return false;
		}

		if(this_options.output_to.hasOwnProperty('attr')){
			selector.attr(this_options.output_to.attr, output_content);
		}else{
			selector.html(output_content);
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
	        if(typeof self.data.current_selection === undefined || typeof self.data.current_selection === 'undefined' || self.data.current_selection === false){
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
		el = jQuery(element);
		el.replaceWith(new_content);
	}

};

jQuery(document).ready(function(){
	if((typeof global_vars.options !== 'undefined') && Modernizr.contenteditable){
		wa_fronted.initialize();
	}
});

function escape_regexp(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};