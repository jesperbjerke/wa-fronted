/**
 * MediumEditor extension to enable media uploads through wp.media (Media Gallery), 
 * editing inserting images in content as well as gallery shortcodes and featured image
 */
function Wa_image_upload(this_options) {
    this.editor_options        = this_options;
    this.get_image_src_timeout = false;
    this.handles               = false;
    this.resizing_img          = false;

    this.button                = document.createElement('button');
    this.button.className      = 'medium-wa-image-upload-action';
    this.button.icon           = document.createElement('i');
    this.button.icon.className = 'fa fa-picture-o';
    this.button.appendChild(this.button.icon);
    this.button.onclick        = this.onClick.bind(this);
    document.body.appendChild(this.button);
}

/**
 * Creates wp.media instance based on type
 * @param  {string} type image|gallery determines type of wp.media instance
 * @param  {string} shortcode_string [optional] a valid WordPress shortcode
 * @param  {jQuery Object} shortcode_wrap [optional] jquery object of shortcode wrapper element
 */
Wa_image_upload.prototype.setup_wp_media = function(type, shortcode_string, shortcode_wrap) {
    shortcode_string = shortcode_string || false;
    shortcode_wrap   = shortcode_wrap || false;

    var self = this;

    //Destroy current frame, else return
    if(self.frame){
        if(self.frame.options.state !== type){
            self.frame.dispose();
        }else{
            return;
        }
    }

    if(type === 'insert'){
        self.frame = wp.media({
            frame    : 'post',
            editing  : true,
            multiple : false
        });   
    }else if(type === 'gallery-edit' && shortcode_string !== false){
        var selection = self.select(shortcode_string);
        if(selection !== false){
            self.frame = wp.media({
                frame     : 'post',
                state     : 'gallery-edit',
                title     : wp.media.view.l10n.editGalleryTitle,
                editing   : true,
                multiple  : true,
                selection : selection
            });
        }else{
            self.frame = wp.media({
                frame    : 'post',
                state    : 'gallery-edit',
                title    : wp.media.view.l10n.editGalleryTitle,
                editing  : true,
                multiple : true
            });
        }
    }else if(type === 'featured-image'){
        self.frame = wp.media({
            frame  : 'post',
            state  : 'featured-image',
            states : [ new wp.media.controller.FeaturedImage() , new wp.media.controller.EditImage() ],
            // editing: true,
            // multiple: false
        });   
    }

    self.frame.on( 'insert', function() {
        var selection = self.frame.state().get('selection');

        if(selection.length === 0){
            self.insertGallery(self.frame);
        }else{
            if(typeof self.replace_this !== 'undefined' && self.replace_this !== false){
                self.insertImage(self.frame, self.replace_this);
            }else{
                self.insertImage(self.frame);
            }
        }
    });

    self.frame.on( 'update', function() {
        self.insertGallery(self.frame, shortcode_wrap);
    });

    self.frame.state('featured-image').on( 'select', function() {
        var selection = self.frame.state().get('selection').single();
        if(typeof self.replace_this !== 'undefined' && self.replace_this !== false){
            self.insertImage(self.frame, self.replace_this);
        }else{
            self.insertImage(self.frame);
        }
    });
}

/**
 * Init extension
 */
Wa_image_upload.prototype.init = function() {
    this.setup_wp_media('insert');
    this.instance = this.base;
    this.bindings(this.instance, jQuery(this.instance.elements));
};

/**
 * Calculate aspect ratio
 * @param  {float} width
 * @param  {float} height
 * @return {float} aspect_ratio
 */
Wa_image_upload.prototype.aspect_ratio = function(width, height){
    return width / height;
}

/**
 * Proper rounding for decimals
 * @param  {float} value    value to round
 * @param  {int} decimals  number of decimals to return
 * @return {int}          result
 */
Wa_image_upload.prototype.round = function(value, decimals) {
    return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
}

/**
 * Loops through WordPress image sizes and finds closest match
 * @param  {int} height  current image height
 * @param  {int} width  current image width
 * @return {mixed}        object with closest match or false if none
 */
Wa_image_upload.prototype.get_closest_image_size = function(attachment_id, height, width, callback){

    var self       = this,
        height     = Math.round(height),
        width      = Math.round(width),
        image_type = false,
        closest    = {
            diff      : null,
            size_name : null,
            height    : null,
            width     : null,
            crop      : null
        },
        aspect_ratio = self.round(self.aspect_ratio(width, height), 2);

    for(size in global_vars.image_sizes){
        var this_size        = global_vars.image_sizes[size],
            size_height      = parseInt(this_size.height),
            size_width       = parseInt(this_size.width),
            new_aspect_ratio = self.round(self.aspect_ratio(size_width, size_height), 2),
            this_image_type  = false;

        if(aspect_ratio === new_aspect_ratio || (this_size.crop !== true && this_size.crop !== 1)){
            var height_diff = Math.abs(height - size_height);

            if(height_diff < closest.diff || closest.diff === null){
                closest.diff      = height_diff;
                closest.size_name = size;
                closest.height    = size_height;
                closest.width     = size_width;
                closest.crop      = this_size.crop;
            }
        }
    }

    if(closest.size_name !== null){
        jQuery.post(
            global_vars.ajax_url,
            {
                'action'        : 'wa_get_image_src',
                'attachment_id' : attachment_id,
                'size'          : closest.size_name
            }, 
            function(response){
                callback(response);
            }
        );
    }
}

/**
 * Registers bindings, unregisters if already exists
 * @param  {Object} instance instance of MediumEditor
 * @param  {jQuery Object} editor_container jQuery element of editor
 */
Wa_image_upload.prototype.bindings = function(instance, editor_container){
    var self = this;

    jQuery('body').click(function(e){
        jQuery(self.button).removeClass('show');
        if(self.image_toolbar !== undefined && e.target.classList[0] !== 'resize_handles'){
            self.image_toolbar.removeClass('show');
        }
    });

    //Init jquery ui resizable
    editor_container.on('resizecreate', function(event, ui){
        var image_classes = event.target.firstChild.className,
            alignment = image_classes.match(/([align]\S+)/)[1];
        
        jQuery(event.target)
            .css({
                'overflow' : 'visible',
                'margin'   : ''
            })
            .addClass(alignment);
    });

    self.enable_resizing(instance, editor_container);

    editor_container.click(function(e){
        if(jQuery(e.target).parents('.wa-shortcode-wrap').length !== 0){
            e.preventDefault();
            var shortcode_wrap = jQuery(e.target).parents('.wa-shortcode-wrap');
            if(shortcode_wrap.attr('data-shortcode-base') === 'gallery'){
                self.setup_wp_media(
                    'gallery-edit', 
                    wa_fronted.shortcode_from_attr(shortcode_wrap), 
                    shortcode_wrap
                );
                self.frame.open();
            }
        }else if(wa_fronted.getSelectionText() === '' && e.target.tagName !== 'IMG'){
            e.preventDefault();
            self.setup_wp_media('insert');
            
            clearTimeout(showTimer);
            var showTimer = setTimeout(function(){
                self.showToolbar(e, editor_container);
            }, instance.options.delay);

        }else if(e.target.tagName === 'IMG' && e.target.className.match(/wp-image-\d+/) === null){
            self.setup_wp_media('featured-image');
            wa_fronted.show_loading_spinner();
            jQuery.post(
                global_vars.ajax_url,
                {
                    'action'  : 'wa_get_thumbnail_id',
                    'post_id' : self.editor_options.post_id
                }, 
                function(response){
                    if(response.attachment_id !== '' && response.attachment_id !== false){
                        wp.media.view.settings.post.featuredImageId = parseInt(response.attachment_id);
                        self.WPMedia(parseInt(response.attachment_id));
                    }
                    wa_fronted.hide_loading_spinner();
                }
            );
        }
    });

    self.enable_drop_upload(instance, editor_container);
};

Wa_image_upload.prototype.enable_drop_upload = function(instance, editor_container) {
    
    if(Modernizr.filereader){
        var self = this,
            allowed_file_types = [
                'image/jpeg',
                'image/png',
                'image/gif'
            ];

        instance.subscribe('editableDrop', function (event, editable) {

            event.preventDefault();
            event.stopPropagation();

            if(event.dataTransfer.files.length !== 0){
                wa_fronted.show_loading_spinner();
                var file = event.dataTransfer.files[0];

                if(jQuery.inArray(file.type, allowed_file_types) !== -1){
                    var fileReader = new FileReader();

                    fileReader.onload = function(evt){
                        jQuery.post(
                            global_vars.ajax_url,
                            {
                                'action'                : 'wa_create_image',
                                'post_id'               : self.editor_options.post_id,
                                'file_data'             : encodeURIComponent(evt.target.result),
                                'file_name'             : file.name,
                                'file_type'             : file.type,
                                'wa_fronted_save_nonce' : global_vars.nonce
                            }, 
                            function(response){
                                self.dropImage(event.target, response.attachment_obj, false);
                            }
                        );
                    };

                    fileReader.readAsDataURL(file);
                }else{
                    wa_fronted.show_loading_spinner();
                }
            }
        });
    }
}

/**
 * Make images resizable and change img src to the closest to new size
 * @param  {Object} instance instance of MediumEditor
 * @param  {jQuery Object} editor_container jQuery element of editor
 */
Wa_image_upload.prototype.enable_resizing = function(instance, editor_container) {
    var self = this,
        images = editor_container.find('img[class*="wp-image-"]');

    if(images.length > 0){
        if(self.handles === false){
            self.handles              = document.createElement('div');
            self.handles.className    = 'resize_handles';

            self.handles.se           = document.createElement('span');
            self.handles.se.className = 'resize_handle se fa fa-arrows-alt';
            self.handles.appendChild(self.handles.se);
        
            document.body.appendChild(self.handles);

            self.handles = jQuery(self.handles);
            self.on_resize_image();
            self.enable_image_toolbar(instance, editor_container);
            self.enable_drag(instance, editor_container);
        }

        for(var i = 0; i < images.length; i++){
            var this_image = jQuery(images[i]);
            if(this_image.data('resizable') !== true){
                this_image.data('resizable', true);
                this_image.on('hover', function( event ){
                    var hovering_img = jQuery(this);
                    self.resizing_img = hovering_img;
                    self.position_handles(hovering_img);
                });
            }
        }

    }
}

/**
 * Positions resizing handles based on container and sets necessary values
 */
Wa_image_upload.prototype.position_handles = function(container) {

    var self = this,
        offset = container.offset(),
        handle = self.handles.find('.resize_handle');

    self.handles.css({
        'width'  : container.width() + 10,
        'height' : container.height() + 10,
        'top'    : offset.top - 5,
        'left'   : offset.left - 5
    });

    self.handles.addClass('show');

    self.handles.off();
    
    self.handles.on('mouseout blur', function(){
        self.handles.removeClass('show');
    });

    self.handles.on('click', function(e){
        if(e.target.classList[0] !== 'resize_handle'){
            self.show_image_edit_toolbar(e);
        }
    });

    handle.off();
    handle.on('mousedown touchstart', function(event){
        self.current_size = {
            'height' : container.height(),
            'width'  : container.width(),
            'x'      : event.clientX,
            'y'      : event.clientY
        };

        event.preventDefault();
        self.is_resizing = true;
    }); 
}

/**
 * Binds and handles resizing function
 */
Wa_image_upload.prototype.on_resize_image = function() {
    var self = this;

    jQuery(document).on('mousemove touchmove mouseup touchend', function(event){
        if(self.is_resizing === true && (event.type === 'mousemove' || event.type === 'touchmove')){

            event.stopPropagation();
            event.preventDefault();

            var new_size = {
                    'width'   : self.current_size.width + (event.clientX - self.current_size.x),
                    'height'  : self.current_size.height + (event.clientY - self.current_size.y),
                    'offsetX' : (event.clientX - self.current_size.x),
                    'offsetY' : (event.clientY - self.current_size.y),
                },
                final_size = {
                    'height' : 0,
                    'width'  : 0
                };

            //Calculate size proportionally to keep aspect ratio
            if (Math.abs(new_size.offsetX) > Math.abs(new_size.offsetY)) {
                final_size.width = Math.round(self.current_size.width + new_size.offsetX);
                final_size.height = Math.round(final_size.width * (self.current_size.height / self.current_size.width));
            } else {
                final_size.height = Math.round(self.current_size.height + new_size.offsetY);
                final_size.width = Math.round(final_size.height * (self.current_size.width / self.current_size.height));
            }

            self.resizing_img.width(final_size.width);
            self.resizing_img.height(final_size.height);

            self.handles.css({
                'width'  : final_size.width + 10,
                'height' : final_size.height + 10
            });

        }else if(self.is_resizing === true && (event.type === 'mouseup' || event.type === 'touchend')){

            event.preventDefault();
            self.is_resizing = false;

            //Ensure aspect ratio
            self.resizing_img.height((self.current_size.height / self.current_size.width) * self.resizing_img.width());

            //Set wp image size to closest matching
            clearTimeout(self.get_image_src_timeout);
            self.get_image_src_timeout = setTimeout(function(){
                var class_match = self.resizing_img[0].className.match(/wp-image-\d+/);
                if(class_match !== null){
                    var attachment_id = class_match[0].match(/\d+/)[0];
                    self.get_closest_image_size(attachment_id, self.resizing_img.height(), self.resizing_img.width(), function(response){
                        if(response[3] === true){
                            self.resizing_img[0].className = self.resizing_img[0].className.replace(/size-\S+/, 'size-' + response[4]);
                            self.resizing_img.attr('src', response[0]);
                        }
                    });
                }

                wa_fronted.trigger(self.instance, 'editableInput');
            }, 500);

        }
    });
}


Wa_image_upload.prototype.enable_drag = function(instance, editor_container) {

}

/**
 * Adds and binds image editing toolbar
 * @param  {Object} instance         medium-editor instance
 * @param  {jQuery Object} editor_container current editor object
 */
Wa_image_upload.prototype.enable_image_toolbar = function(instance, editor_container) {
    var self = this,
        image_toolbar           = document.createElement('div');
        image_toolbar.className = 'medium-wa-image-edit-toolbar';
        image_toolbar.buttons   = [
            {
                'id' : 'alignleft',
                'icon' : 'dashicons dashicons-align-left',
                'title' : 'Align left',
                'func' : function(){
                    self.resizing_img[0].className = self.resizing_img[0].className.replace(/align\w+/, 'alignleft');
                }
            },
            {
                'id' : 'aligncenter',
                'icon' : 'dashicons dashicons-align-center',
                'title' : 'Align center',
                'func' : function(){
                    self.resizing_img[0].className = self.resizing_img[0].className.replace(/align\w+/, 'aligncenter');
                }
            },
            {
                'id' : 'alignright',
                'icon' : 'dashicons dashicons-align-right',
                'title' : 'Align right',
                'func' : function(){
                    self.resizing_img[0].className = self.resizing_img[0].className.replace(/align\w+/, 'alignright');
                }
            },
            {
                'id' : 'edit',
                'icon' : 'dashicons dashicons-edit',
                'title' : 'Edit',
                'func' : function(){

                    var img_link = self.resizing_img.parents('a'),
                        img_wrap = self.resizing_img;

                    if(img_link.length !== 0){
                        img_wrap = img_link;
                    }

                    self.replace_this = img_wrap;

                    var class_match = self.resizing_img[0].className.match(/wp-image-\d+/);
                    if(class_match !== null){
                        self.setup_wp_media('insert');
                        self.WPMedia(parseInt(class_match[0].match(/\d+/)[0]));
                    }
                
                }
            },
            {
                'id' : 'remove',
                'icon' : 'dashicons dashicons-no',
                'title' : 'Remove',
                'func' : function(){

                    var img_link = self.resizing_img.parents('a'),
                        img_wrap = self.resizing_img;

                    if(img_link.length !== 0){
                        img_wrap = img_link;
                    }

                    wa_fronted.replace_html(img_wrap, '');

                }
            }
        ];

    for(var i = 0; i < image_toolbar.buttons.length; i++){
        var button      = image_toolbar.buttons[i],
            button_el   = document.createElement('button'),
            button_icon = document.createElement('i');
            
            button_el.className   = 'wa-image-edit-' + button.id;
            button_icon.className = button.icon;
            button_icon.title     = button.title;

        button_el.appendChild(button_icon)
        image_toolbar.appendChild(button_el);

        button_el.addEventListener('click', button.func);
    }

    document.body.appendChild(image_toolbar);
    self.image_toolbar = jQuery(image_toolbar);
}

Wa_image_upload.prototype.show_image_edit_toolbar = function(event) {

    var self   = this,
        offset = self.resizing_img.offset(),
        scroll_top = jQuery(window).scrollTop(),
        distance_to_top = offset.top - scroll_top,
        pos_top = offset.top;
        
        self.image_toolbar.removeClass('arrow-over arrow-under');

        if(distance_to_top <= 42){
            pos_top = offset.top + self.resizing_img.height() + 42;
            self.image_toolbar.addClass('arrow-over');
        }else{
            self.image_toolbar.addClass('arrow-under');
        }

        self.image_toolbar
            .css({
                'top' : pos_top,
                'left' : (offset.left + ((self.resizing_img.width() / 2) - (self.image_toolbar.width() / 2)))
            })
            .addClass('show');
}

/**
 * Gets initial gallery-edit images. Function modified from wp.media.gallery.edit
 * @param {string} shortcode_string
 * @return {Object} wp.media selection
 */
Wa_image_upload.prototype.select = function(shortcode_string) {
    var shortcode = wp.shortcode.next('gallery', shortcode_string),
        defaultPostId = wp.media.gallery.defaults.id,
        attachments, selection;
 
    // Bail if we didn't match the shortcode or all of the content.
    if ( ! shortcode )
        return false;
 
    // Ignore the rest of the match object.
    shortcode = shortcode.shortcode;
 
    if ( _.isUndefined( shortcode.get('id') ) && ! _.isUndefined( defaultPostId ) )
        shortcode.set( 'id', defaultPostId );
 
    attachments = wp.media.gallery.attachments( shortcode );
    selection = new wp.media.model.Selection( attachments.models, {
        props:    attachments.props.toJSON(),
        multiple: true
    });
     
    selection.gallery = attachments.gallery;
 
    // Fetch the query's attachments, and then break ties from the
    // query to allow for sorting.
    selection.more().done( function() {
        // Break ties with the query.
        selection.props.set({ query: false });
        selection.unmirror();
        selection.props.unset('orderby');
    });
 
    return selection;
}

/**
 * Show image upload button (toolbar)
 * @param  {Object} event object
 * @param  {jQuery Object} this editor
 */
Wa_image_upload.prototype.showToolbar = function(event, editor_container) {
	var self = this;
    self.positionImageToolbar(event);
	jQuery(self.button).addClass('show');
    jQuery(window).scroll(function(){
        self.positionImageToolbar(event);
    });
};

/**
 * Bind what happens when user clicks button in toolbar
 */
Wa_image_upload.prototype.onClick = function() {
    this.WPMedia();
};

/**
 * Insert gallery into content
 * @param  {Object} wp.media frame
 * @param  {jQuery Object} shortcode_wrap [optional] wrapping element
 */
Wa_image_upload.prototype.insertGallery = function(frame, shortcode_wrap){
    shortcode_wrap = shortcode_wrap || false;

    var gallery_controller = frame.states.get('gallery-edit');
        library = gallery_controller.get('library'),
        self = this;

    if(library.length !== 0){
        var shortcode = wp.media.gallery.shortcode(library).string();

        wa_fronted.shortcode_to_html(
            shortcode, 
            ((shortcode_wrap === false) ? true : false), 
            function(response){
                if(shortcode_wrap !== false){
                    wa_fronted.replace_html(shortcode_wrap, response);
                }else{
                    wa_fronted.insertHtmlAtCaret(response);
                }

                wa_fronted.trigger(self.instance, 'editableInput');
            }
        );
    }
};

/**
 * Insert image into content
 * @param  {Object} wp.media frame
 */
Wa_image_upload.prototype.insertImage = function(frame, replace_this){
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
        if ( ! wp.media.view.settings.captions )
            delete obj_attachment.caption;

        display = wp.media.string.props( display, obj_attachment );

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

                html = wp.media.string.image( display );

                _.each({
                    align : 'align',
                    size  : 'image-size',
                    alt   : 'image_alt'
                }, function( option, prop ) {
                    if ( display[ prop ] )
                        options[ option ] = display[ prop ];
                });
            } else if ( 'video' === obj_attachment.type ) {
                html = wp.media.string.video( display, obj_attachment );
            } else if ( 'audio' === obj_attachment.type ) {
                html = wp.media.string.audio( display, obj_attachment );
            } else {
                html = wp.media.string.link( display );
                options.post_title = display.title;
            }

            //attach info to attachment.attributes object
            attachment.attributes['nonce']      = wp.media.view.settings.nonce.sendToEditor;
            attachment.attributes['attachment'] = options;
            attachment.attributes['html']       = html;
            attachment.attributes['post_id']    = wp.media.view.settings.post.id;

            if(replace_this !== false){
                if( wp.media.view.settings.captions && caption ){
                    wa_fronted.shortcode_to_html(attachment.attributes['html'], true, function(html){
                        wa_fronted.replace_html(replace_this, html);
                        self.replace_this = false;                
                    });
                }else{
                    wa_fronted.replace_html(replace_this, attachment.attributes['html']);
                    self.replace_this = false;
                }
            }else{
                wa_fronted.insertHtmlAtCaret(attachment.attributes['html']);
            }

            wa_fronted.trigger(self.instance, 'editableInput');
            self.enable_resizing(self.instance, jQuery(self.instance.elements));

        } else {

            wa_fronted.show_loading_spinner();
            jQuery.post(
                global_vars.ajax_url,
                {
                    'action'        : 'wa_set_thumbnail',
                    'attachment_id' : options.id,
                    'image_size'    : self.editor_options.image_size,
                    'post_id'       : self.editor_options.post_id
                }, 
                function(response){
                    if(response.hasOwnProperty('html')){
                        if(replace_this !== false){
                            wa_fronted.replace_html(replace_this, response.html);
                            self.replace_this = false;   
                        }
                    }
                    wa_fronted.hide_loading_spinner();
                }
            );

        }
    });                
};

/**
 * Inserts image into content after being dropped
 * @param  {Object} attachment
 */
Wa_image_upload.prototype.dropImage = function(target, attachment, replace_this){
    replace_this = replace_this || false;

    var self = this,
        use_size = attachment.sizes.medium,
        html = '<img src="' + use_size.url + '" width="' + use_size.width + '" height="' + use_size.height + '" alt="' + attachment.title + '" class="wp-image-' + attachment.id + ' alignleft size-medium" style="height:' + use_size.height + '; width:' + use_size.width + ';">';

    if(replace_this !== false){
        wa_fronted.replace_html(replace_this, html);
        self.replace_this = false;
    }else{
        jQuery(target).append(html);
        wa_fronted.hide_loading_spinner();
    }

    setTimeout(function(){
        wa_fronted.trigger(self.instance, 'editableInput');
        self.enable_resizing(self.instance, jQuery(self.instance.elements));
    }, 500);
};

/**
 * Show wp.media instance
 * @param {int} attachment_id [optional]
 */
Wa_image_upload.prototype.WPMedia = function(attachment_id) {
    attachment_id = attachment_id || false;

    var frame = this.frame,
        self  = this;
    
        frame.once( 'open', function() {
            var selection = frame.state().get('selection');
            
            if(attachment_id !== false){
                attachment = wp.media.attachment(attachment_id);
                attachment.fetch();
                selection.add(attachment);
            }else{
                selection.reset();
            }
        });

    frame.open();
};

/**
 * Return button parameters for MediumEdtior toolbar
 * @return {Object} button
 */
Wa_image_upload.prototype.getButton = function() {
    return this.button;
};

/**
 * Position the image button (toolbar) in the editor
 * @param  {Object} event
 */
Wa_image_upload.prototype.positionImageToolbar = function(e) {

    this.button.style.left = '0';

    var windowWidth     = this.base.options.contentWindow.innerWidth,
        toolbarWidth    = this.button.offsetWidth,
        halfOffsetWidth = toolbarWidth / 2,
        buttonHeight    = 50,
        defaultLeft     = halfOffsetWidth,
        caretPos        = wa_fronted.getCaretPositionPx();

	if (caretPos.y < buttonHeight) {
        this.button.classList.add('medium-toolbar-arrow-over');
        this.button.classList.remove('medium-toolbar-arrow-under');
        this.button.style.top = caretPos.y + (buttonHeight - 5) + 'px';
    } else {
        this.button.classList.add('medium-toolbar-arrow-under');
        this.button.classList.remove('medium-toolbar-arrow-over');
        this.button.style.top = caretPos.y - (buttonHeight - 5) + 'px';
    }

    if (caretPos.x < halfOffsetWidth) {
        this.button.style.left = defaultLeft + halfOffsetWidth + 'px';
    } else if ((windowWidth - caretPos.x) < halfOffsetWidth) {
        this.button.style.left = windowWidth + defaultLeft - halfOffsetWidth + 'px';
    } else {
        this.button.style.left = caretPos.x - halfOffsetWidth + 'px';
    }

};