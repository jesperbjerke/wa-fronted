var fronted_featured_img = function(editor, options){
	this.options       = options;
	this.editor        = editor;
	this.has_thumbnail = false;
	this.frame         = false;
	this.replace_this  = false;

	this.init();
};

(function($){

	window.wp = window.wp || {};

	fronted_featured_img.prototype.init = function(){
		var self = this;

		if(self.editor.find('img.attachment-post-thumbnail').length !== 0){
			self.has_thumbnail = true;
			self.replace_this = self.editor.find('img.attachment-post-thumbnail');
		}else{
			self.show_placeholder();
		}

        self.frame = window.wp.media({
            frame  : 'post',
            state  : 'featured-image',
            states : [ new window.wp.media.controller.FeaturedImage() , new window.wp.media.controller.EditImage() ]
        }); 

	    self.frame.state('featured-image').on( 'select', function() {
	        var selection = self.frame.state().get('selection').single();

	        if(typeof self.replace_this !== 'undefined' && self.replace_this !== false){
	            self.insert_image(self.frame, self.replace_this);
	        }else{
	            self.insert_image(self.frame);
	        }
	    });

		self.create_toolbar();
	};

	fronted_featured_img.prototype.create_toolbar = function(){
		var self = this;

        featured_image_toolbar           = document.createElement('div');
        featured_image_toolbar.className = 'fronted-featured-image-toolbar';
        featured_image_toolbar.buttons   = [
            {
				'id'       : 'add-image',
				'icon'     : 'dashicons dashicons-format-image',
				'title'    : wa_fronted.i18n('Add image'),
				'on_empty' : true,
				'func'     : function(e){
					self.edit();
                }
            },
            {
				'id'       : 'edit-image',
				'icon'     : 'dashicons dashicons-edit',
				'title'    : wa_fronted.i18n('Edit image'),
				'on_empty' : false,
				'func'     : function(e){
		            wa_fronted.show_loading_spinner();
		            jQuery.post(
		                global_vars.ajax_url,
		                {
		                    'action'  : 'wa_get_thumbnail_id',
		                    'post_id' : self.options.post_id
		                }, 
		                function(response){
		                    if(response.attachment_id !== '' && response.attachment_id !== false){
		                        window.wp.media.view.settings.post.featuredImageId = parseInt(response.attachment_id);
		                        self.edit(parseInt(response.attachment_id));
		                    }
		                    wa_fronted.hide_loading_spinner();
		                }
		            );
                }
            },
            {
				'id'       : 'remove-image',
				'icon'     : 'dashicons dashicons-no',
				'title'    : wa_fronted.i18n('Remove image'),
				'on_empty' : false,
				'func'     : function(e){
		            wa_fronted.show_loading_spinner();
		            jQuery.post(
		                global_vars.ajax_url,
		                {
		                    'action'  : 'wa_delete_post_thumbnail',
		                    'post_id' : self.options.post_id
		                }, 
		                function(response){
		                	self.editor.find('img.attachment-post-thumbnail').remove();
		                	self.has_thumbnail = false;

		                	self.show_placeholder();
		                	// self.show_toolbar(e, self);

		                    wa_fronted.hide_loading_spinner();
		                }
		            );
                }
            }
        ];

	    featured_image_toolbar.buttons = wa_fronted.apply_filters('featured_image_toolbar', featured_image_toolbar.buttons, self.options);

	    for(var i = 0; i < featured_image_toolbar.buttons.length; i++){
	        var button      = featured_image_toolbar.buttons[i],
	            button_el   = document.createElement('button'),
	            button_icon = document.createElement('i');
	            
	            button_el.className   = 'fronted-featured-image-' + button.id;
	            button_icon.className = button.icon;
	            button_icon.title     = button.title;

	        button_el.appendChild(button_icon);
	        featured_image_toolbar.appendChild(button_el);

	        button_el.addEventListener('click', button.func);
	    }

	    document.body.appendChild(featured_image_toolbar);
	    self.featured_image_toolbar = jQuery(featured_image_toolbar);

		self.editor.on('mouseenter click', function(event){ self.show_toolbar(event, self) });
		self.editor.on('mouseleave', function(event){ self.hide_toolbar(event, self); });
		self.featured_image_toolbar.on('mouseleave', function(event){ self.hide_toolbar(event, self); });
	};
	
	/**
	 * Show toolbar depending on if post has featured image
	 * @param  {Object} e    event object
	 * @param  {Object} self this
	 */
	fronted_featured_img.prototype.show_toolbar = function(e, self){
		e.preventDefault();
		var self = this;

		if(self.featured_image_toolbar[0].buttons.length !== 0){
			for(var i = 0; i < self.featured_image_toolbar[0].buttons.length; i++){
				var button = self.featured_image_toolbar[0].buttons[i],
					button_el = self.featured_image_toolbar.find('.fronted-featured-image-' + button.id);

				if(self.has_thumbnail){
					if(button.on_empty){
						button_el.removeClass('show');
					}else{
						button_el.addClass('show');
					}
				}else{
					if(button.on_empty){
						button_el.addClass('show');
					}else{
						button_el.removeClass('show');
					}
				}
			}
		}

		var post_thumbnail = self.editor.find('img.attachment-post-thumbnail');
		post_thumbnail = (post_thumbnail.length === 0) ? self.editor.find('.featured-post-placeholder') : post_thumbnail;

		var thumbnail_offset = post_thumbnail.offset();

		self.featured_image_toolbar
			.css({
				'width'  : post_thumbnail.width(),
				'height' : post_thumbnail.height(),
				'top'    : thumbnail_offset.top,
				'left'   : thumbnail_offset.left
			})
			.addClass('show');
	};

	fronted_featured_img.prototype.hide_toolbar = function(e, self){
		e.preventDefault();
		var self = this;
		if(e.toElement !== null && e.toElement.className.indexOf('fronted-featured-image-') === -1){
			self.featured_image_toolbar.removeClass('show');
		}
	};
	
	/**
	 * Insert and show placeholder image if no featured image exists
	 */
	fronted_featured_img.prototype.show_placeholder = function(){
		var self = this;
		if(self.editor.find('.featured-post-placeholder').length === 0){
			self.editor.append('<div class="featured-post-placeholder"><i class="dashicons dashicons-format-image"></i></div>');
		}else{
			self.editor.find('.featured-post-placeholder').show();
		}

		self.replace_this = self.editor.find('.featured-post-placeholder');
	};


	/**
	 * Show WP Media modal
	 * @param  {[type]} attachment_id [description]
	 * @return {[type]}               [description]
	 */
	fronted_featured_img.prototype.edit = function(attachment_id){
	    var frame = this.frame,
	        self  = this;
        
	    attachment_id = attachment_id || false;
	    
        frame.once( 'open', function() {
            var selection = frame.state().get('selection');
            
            if(attachment_id !== false){
                attachment = window.wp.media.attachment(attachment_id);
                attachment.fetch();
                selection.add(attachment);
            }else{
                selection.reset();
            }
        });

	    frame.open();
	};


	/**
	 * Insert image into content
	 * @param  {Object} wp.media frame
	 */
	fronted_featured_img.prototype.insert_image = function(frame, replace_this){
	    var self         = this,
	        state        = frame.state(),
	        selection    = state.get('selection'),
	        replace_this = replace_this || false;

	    if ( ! selection ) return;
	    selection.each(function(attachment) {
	        var display = state.display( attachment ).toJSON(),
	            obj_attachment = attachment.toJSON(),
	            caption = obj_attachment.caption, 
	            options, 
	            html;

	        // If captions are disabled, clear the caption.
	        if ( ! window.wp.media.view.settings.captions )
	            delete obj_attachment.caption;

	        display = window.wp.media.string.props( display, obj_attachment );

	        options = {
	            id           : obj_attachment.id,
	            post_content : obj_attachment.description,
	            post_excerpt : caption
	        };

	        if(state.id !== 'featured-image') {

	            if ( display.linkUrl )
	                options.url = display.linkUrl;

	            if ( 'image' === obj_attachment.type ) {
	                display.url = display.src;

	                html = window.wp.media.string.image( display );

	                _.each({
	                    align : 'align',
	                    size  : 'image-size',
	                    alt   : 'image_alt'
	                }, function( option, prop ) {
	                    if ( display[ prop ] )
	                        options[ option ] = display[ prop ];
	                });
	            } else if ( 'video' === obj_attachment.type ) {
	                html = window.wp.media.string.video( display, obj_attachment );
	            } else if ( 'audio' === obj_attachment.type ) {
	                html = window.wp.media.string.audio( display, obj_attachment );
	            } else {
	                html = window.wp.media.string.link( display );
	                options.post_title = display.title;
	            }

	            //attach info to attachment.attributes object
	            attachment.attributes['nonce']      = window.wp.media.view.settings.nonce.sendToEditor;
	            attachment.attributes['attachment'] = options;
	            attachment.attributes['html']       = html;
	            attachment.attributes['post_id']    = window.wp.media.view.settings.post.id;

	            if(replace_this !== false){
	                if( window.wp.media.view.settings.captions && caption ){
	                    wa_fronted.shortcode_to_html(attachment.attributes['html'], true, function(html){
	                        wa_fronted.replace_html(replace_this, html);
	                        self.replace_this = false;
	                        self.enable_resizing(self.instance, jQuery(self.instance.elements));
	                    });
	                }else{
	                    wa_fronted.replace_html(replace_this, attachment.attributes['html']);
	                    self.replace_this = false;
	                }
	            }else{
	                if( window.wp.media.view.settings.captions && caption ){
	                    wa_fronted.shortcode_to_html(attachment.attributes['html'], true, function(html){
	                        wa_fronted.insertHtmlAtCaret(html);
	                        self.enable_resizing(self.instance, jQuery(self.instance.elements));
	                    });
	                }else{
	                    wa_fronted.insertHtmlAtCaret(attachment.attributes['html']);
	                }
	            }

	        } else {

	            wa_fronted.show_loading_spinner();
	            jQuery.post(
	                global_vars.ajax_url,
	                {
	                    'action'        : 'wa_set_thumbnail',
	                    'attachment_id' : options.id,
	                    'image_size'    : self.options.image_size,
	                    'post_id'       : self.options.post_id
	                }, 
	                function(response){
	                    if(response.hasOwnProperty('html')){
	                        if(replace_this !== false){
	                            wa_fronted.replace_html(replace_this, response.html);
	                            self.replace_this = self.editor.find('img.attachment-post-thumbnail'); 
	                            self.has_thumbnail = true;
	                        }
	                    }
	                    wa_fronted.hide_loading_spinner();
	                }
	            );

	        }
	    });                
	};

})(jQuery);