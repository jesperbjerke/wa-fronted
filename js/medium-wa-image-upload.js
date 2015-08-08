/**
 * MediumEditor extension to enable media uploads through wp.media (Media Gallery), 
 * editing inserting images in content as well as gallery shortcodes and featured image
 */
function Wa_image_upload(this_options) {
    this.editor_options        = this_options;
    this.button                = document.createElement('button');
    this.button.className      = 'medium-wa-image-upload-action';
    this.button.icon           = document.createElement('i');
    this.button.icon.className = 'fa fa-picture-o';
    this.button.appendChild(this.button.icon);
    this.button.onclick        = this.onClick.bind(this);
    this.get_image_src_timeout = false;
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
    if(this.frame){
        if(this.frame.options.state !== type){
            this.frame.dispose();
        }else{
            return;
        }
    }

    if(type === 'insert'){
        this.frame = wp.media({
            frame    : 'post',
            editing  : true,
            multiple : false
        });   
    }else if(type === 'gallery-edit' && shortcode_string !== false){
        var selection = this.select(shortcode_string);
        if(selection !== false){
            this.frame = wp.media({
                frame     : 'post',
                state     : 'gallery-edit',
                title     : wp.media.view.l10n.editGalleryTitle,
                editing   : true,
                multiple  : true,
                selection : selection
            });
        }else{
            this.frame = wp.media({
                frame    : 'post',
                state    : 'gallery-edit',
                title    : wp.media.view.l10n.editGalleryTitle,
                editing  : true,
                multiple : true
            });
        }
    }else if(type === 'featured-image'){
        this.frame = wp.media({
            frame  : 'post',
            state  : 'featured-image',
            states : [ new wp.media.controller.FeaturedImage() , new wp.media.controller.EditImage() ],
            // editing: true,
            // multiple: false
        });   
    }

    this.frame.on( 'insert', function() {
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

    this.frame.on( 'update', function() {
        self.insertGallery(self.frame, shortcode_wrap);
    });

    this.frame.state('featured-image').on( 'select', function() {
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
    clearTimeout(this.get_image_src_timeout);

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
        aspect_ratio = this.round(this.aspect_ratio(width, height), 2);

    if(height === width){
        image_type = 'square';
    }else{
        image_type = 'original';
    }

    for(size in global_vars.image_sizes){
        var this_size        = global_vars.image_sizes[size],
            size_height      = parseInt(this_size.height),
            size_width       = parseInt(this_size.width),
            new_aspect_ratio = self.round(self.aspect_ratio(size_width, size_height), 2),
            this_image_type  = false;

        if((size_height === size_width) && this_size.crop === true){
            this_image_type = 'square';
        }else{
            this_image_type = 'original';
        }

        if((Math.abs(aspect_ratio - new_aspect_ratio) < 3) && (image_type === this_image_type)){
            var height_diff = Math.abs(height - size_height);

            if(closest.diff === null || height_diff < closest.diff){
                closest.diff      = height_diff;
                closest.size_name = size;
                closest.height    = size_height;
                closest.width     = size_width;
                closest.crop      = this_size.crop;
            }
        }
    }

    clearTimeout(this.get_image_src_timeout);
    this.get_image_src_timeout = setTimeout(function(){
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
    }, 1000);
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

        }else if(e.target.tagName === 'IMG'){
            e.preventDefault();
            var img_el = jQuery(e.target),
                img_link = img_el.parents('a'),
                img_wrap = img_el;

            if(img_link.length !== 0){
                img_wrap = img_link;
            }

            self.replace_this = img_wrap;


            var class_match = e.target.className.match(/wp-image-\d+/);
            if(class_match !== null){
                self.setup_wp_media('insert');
                self.WPMedia(parseInt(class_match[0].match(/\d+/)[0]));
            }else{
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

        }
    });

    instance.subscribe('editableDrag', function (event, editable) {
        console.log(editable);
    });

    instance.subscribe('editableDrop', function (event, editable) {
        console.log(editable);
    });
};

/**
 * Make images resizable and change img src to the closest to new size
 * @param  {Object} instance instance of MediumEditor
 * @param  {jQuery Object} editor_container jQuery element of editor
 */
Wa_image_upload.prototype.enable_resizing = function(instance, editor_container) {
    var self = this;
    editor_container.find('img[class*="wp-image-"]').resizable({
        autoHide    : true,
        aspectRatio : true,
        ghost       : true,
        handles     : 'nw, ne, sw, se',
        resize      : function(event, ui){
            var class_match = ui.element.context.className.match(/wp-image-\d+/);
            if(class_match !== null){
                var attachment_id = class_match[0].match(/\d+/)[0];
                self.get_closest_image_size(attachment_id, ui.size.height, ui.size.width, function(response){
                    if(response[3] === true){
                        var size_class = ui.element.context.className.match(/size-\S+/),
                            image_el = jQuery(ui.element.context);

                        if(size_class !== null){
                            image_el
                                .removeClass(size_class[0])
                                .addClass('size-' + response[4]);
                        }
                        image_el.attr('src', response[0]);
                    }
                });
            }

            wa_fronted.trigger(instance, 'editableInput');
        }
    });
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
        imageArray   = [],
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