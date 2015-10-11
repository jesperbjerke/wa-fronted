var Wa_render_shortcode = MediumEditor.Extension.extend({
  name: 'renderShortcode',

  init: function () {
    this.button = this.document.createElement('button');
    this.button.classList.add('medium-editor-action');
    this.button.classList.add('renderShortcode');
    this.button.title = 'render shortcode';
    this.button.innerHTML = '<b>[ ]</b>';
    var container = this.base.elements[0];
    this.on(this.button, 'click', this.handleClick.bind(this, container));
  },

  getButton: function () {
    return this.button;
  },

  handleClick: function (event) {
  	var container = jQuery(this.base.elements[0]);
    wa_fronted.show_loading_spinner();
    var curr_text = wa_fronted.getSelectionText();

    wa_fronted.shortcode_to_html(curr_text, true, function(html){

    	if(html !== ''){
            var current_content = container.html(),
                regex_str       = escape_regexp(curr_text),
                regex           = new RegExp(regex_str, 'm'),
                new_content     = current_content.replace(regex, html);

            container.html(new_content);
    	}else{
    		toastr.error(wa_fronted.i18n('Render unsuccessful'), wa_fronted.i18n('Selected text is not a valid shortcode'));
    	}

    	wa_fronted.hide_loading_spinner();
    });
  }
});