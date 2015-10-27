(function($){
	$(document).ready(function(){
		var sui = window.Shortcode_UI;
		if(typeof sui !== 'undefined'){
			if(sui.hasOwnProperty('utils') && sui.utils.hasOwnProperty('shortcodeViewConstructor')){
				sui.shortcodes.each( function( shortcode ) {
					wa_fronted.add_filter('shortcode_actions', function(shortcodes){
						shortcodes = shortcodes || [];
						shortcodes.push(shortcode.get('shortcode_tag'));
						return shortcodes;
					});
					wa_fronted.add_action('shortcode_action_' + shortcode.get('shortcode_tag'), function(selected_shortcode, element){
						sui.utils.shortcodeViewConstructor.edit(selected_shortcode);
					});
				});
			}
		}
	});
})(jQuery);