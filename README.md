WA Fronted WordPress Plugin
===========================

[![Join the chat at https://gitter.im/jesperbjerke/wa-fronted](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/jesperbjerke/wa-fronted?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
Discuss this project at Gitter

Frontend editor for WordPress, an experiment with a goal to enhance usability and convenience of editing exisiting content.

> This plugin is intended strictly for plugin and theme developers, it will **not** work "out of the box". Are you an end-user? [Look here!](https://lasso.is/)

![](https://github.com/jesperbjerke/wa-fronted/blob/master/screenshots/screenshot-1.jpg)
![](https://github.com/jesperbjerke/wa-fronted/blob/master/screenshots/screenshot-2.jpg)
![](https://github.com/jesperbjerke/wa-fronted/blob/master/screenshots/screenshot-3.jpg)

## Configuration
To enable an editable area, simply add a filter function to `wa_fronted_options` that passes and returns a multidimensional array. Note that both themes and plugins can call this filter before or after eachother and build upon or replace options.

The first level of the array consists of the key `defaults` (optional) and `post_types`. In `defaults`, specify whatever you want to be set as default when you have not set anything else in that specific area. In `post_types` you create an array for each post type you want to enable frontend editing for (you can also use `front_page` if you just want to target your static front page). Inside, you set `editable_areas` with an array with options for each editable area on this post type.

The following example will enable the regular post content on front page to be editable from frontend if logged in user has role `administrator`, with a toolbar consisting of only bold and italic buttons, but on posts we allow a full toolbar and leaving permission to the default (`current_user_can('edit_posts')`).

```php
<?php 
function my_editor_options($exisiting_options){
	//It is recommended to do an array_merge with the exisiting options to not break other settings
	return array_merge($exisiting_options, array(
		"defaults" => array(
			"permission"   => "default",
			"toolbar"      => "full",
			"media_upload" => true
		),
		"post_types" => array(
			"front_page" => array(
				"editable_areas" => array(
					array(
						"container"  => ".entry-content",
						"field_type" => "post_content",
						"toolbar"    => "bold, italic",
						"permission" => "administrator"
					)
				)
			),
			"post" => array(
				"editable_areas" => array(
					array(
						"container"  => ".entry-content",
						"field_type" => "post_content",
						"toolbar"    => "full"
					)
				)
			)
		)
	)); 
}
add_filter('wa_fronted_options', 'my_editor_options');
?>
```

## Options
* **native** (optional, bool): `true` (default, setup the native editor), `false` (utilize the do_action function instead)
* **direction** (optional, string): `ltr` (default, left-to-right reading direction), `rtl` (right-to-left reading direction)
* **container** (required, string): selector of wrapping element of what you want to edit. Can be any valid jQuery selector string
* **field_type** (required, string): `post_content`, `post_title`, `post_thumbnail` (note that if you don't use the_post_thumbnail() function, the image has to have the class 'attachment-post-thumbnail'), `acf_{FIELD ID}` / `acf_sub_{SUBFIELD ID}` (if set and **toolbar** is not specified, **toolbar** will set itself based on what field it is), `woo_{WooCommerce field (see supported fields below)}`, `meta_{custom field type (see supported fields below)}`
* **permission** (optional, string): `logged-in` (enable to all logged in users), `default` (default, enabled if user has capability *edit_posts*), `{USER ROLE}` (enable to specific user role)
* **post_id** (optional, int): Insert post id to override the `global $post` variable. If used in combination with `acf_{FIELD ID}`, note that it can also be set to *options / taxonomies / users / etc*
* **toolbar** (optional, mixed bool/string): `full` (default, all buttons), `false` (do not show toolbar), `comma-separated string` (`bold`, `italic`, `underline`, `anchor`, `header1`, `header2`, `quote`, `unorderedlist`, `orderedlist`, `justifyLeft`, `justifyCenter`, `justifyRight`)
* **media_upload** (optional, mixed bool/string): `true` (default, will allow user to insert/upload media to the editable area), `false` (disable media upload), `only` (constrain the editable area to only edit media. ie; no text, no toolbar)
* **image_size** (optional, string): any registered image size (only applicable if **field_type** is `post_thumbnail` and you want another image size than WP default, which is `post-thumbnail`)
* **output** (optional, string): alue to retrieve from `get_field()` to output as a dot separated string representing the traversing of value array, ie. for an image field that should output the thumbnail: `sizes.thumbnail` *(only applicable to ACF fields with complex output)*
* **output_to** (optional, array): *if not specified, the returned data after save will be put directly into the container element* 
```php
array(
	"selector" => (string) selector of element inside **container** to output content to. Can be any valid jQuery selector string,
	"attr"	=> (mixed bool/string) if output should be set to an attribute of **selector**, otherwise false or not set
)
```
* **paragraphs** (optional, bool): `true` (default, allow linebreaks/paragraphs when pressing the enter key), `false` (prevent enter key) 
* **validation** (optional, mixed bool/array): `false` (default, do not validate)
```php
array(
	"type" => (string) validation type to check against, see validation types below,
	"compare" => (mixed) if needed, pass value to compare against
)
```
* **meta_key** (optional, string): if **field_type** is a custom field, set which meta_key to save to

#### Validation types
> Some validation types requires you to pass a comparison value. ACF field validation will be read from the field object

* **not_blank** (string is not empty or null)
* **is_date**
* **is_email**
* **is_num**
* **contains_num**
* **is_alphanum**
* **is_url**
* **is_tel** 
* **min_length** (string length is greater)
* **max_length** (string length is less)
* **is_length** (string length equals)
* **min** (number is greater)
* **max** (number is less)
* **between** (number is between two array values)
* **equal_to** (number equals)

## Action hooks

### PHP
* **wa_fronted_inited** runs upon plugin initialization, before the options array has been set
* **wa_fronted_after_init** runs after the options array has been set (passes complete JSON encoded options as argument)
* **wa_fronted_before_scripts** runs before plugin has registered all its scripts and styles (passes complete JSON encoded options as argument)
* **wa_fronted_after_scripts** runs after plugin has registered all its scripts and styles (passes complete JSON encoded options as argument)
* **wa_fronted_save** runs after regular save function (passes $data as argument)
* **wa_fronted_autosave** runs after regular autosave function (passes $data as argument)
* **wa_fronted_toolbar** runs when bottom toolbar renders (before ending `</div>`) (passes complete JSON encoded options as argument)
* **wa_fronted_settings_form** runs within the settings modal form element (passes complete JSON encoded options as argument)
* **wa_fronted_settings_modal_footer** runs when settings modal footer renders (the container where the update button is, still inside the settings form element) (passes complete options array as argument)
* **wa_fronted_settings_form_save** runs after the post has been updated with the new values but before user has been redirected to the new permalink

### Javascript
> The javascript action hooks functions very similarly to their native PHP counterparts. Only difference is that these functions resides within the `wa_fronted` object, so to call the `add_action` function, you type like so: `wa_fronted.add_action('action_name', function);`

* **on_init** runs within the wa_fronted.initialize function
* **on_bind** runs within the wa_fronted.bind function
* **on_setup_editor** if the option `native` is true, this action will run instead of the regular editor setup, passes 3 arguments, jQuery object of editor container, current editor options and full options object

*I'll try to add hooks where I see it could be useful, but if you are missing one, please post an issue requesting it*

## Filters

### PHP
* **compile_options** modify the partially compiled options array (3 arguments, $compiled_options, $default_options, $new_options, called multiple times)
* **wa_fronted_options** modify options array, use this to set your options (1 argument)
* **wa_fronted_settings_fields** modify default settings fields to render into form (1 argument, array of field keys)
* **wa_fronted_settings_values** modify values before they're sent to the `wp_update_post` function array, use this to set your options (1 argument)
* **supported_acf_fields** modify supported ACF fields array (1 argument)
* **supported_woo_fields** modify supported WooCommerce fields/values array (1 argument)
* **supported_custom_fields** modify supported native custom field types (1 argument)

### Javascript
> The javascript filters functions very similarly to their native PHP counterparts. Only difference is that these functions resides within the `wa_fronted` object, so to call the `add_filter` function, you type like so: `wa_fronted.add_filter('filter_name', function(value){ return value; });`

* **toolbar_buttons** modify the buttons available to the editor toolbar (2 arguments), passes an array of strings as the first argument *(which should be returned)* and current editor options as second
* **medium_extensions** modify extensions of the Medium Editor (2 arguments), passes an object with active extensions as the first argument *(which should be returned)*, and current editor options as second. Want to make a toolbar extension? [Look here](https://github.com/yabwe/medium-editor/tree/master/src/js/extensions)
* **validate** add a custom validation method should only return true or false (4 arguments), `bool` (result), `value to validate`, `validation method called`, `comparison value`
* **validation_msg** add a custom validation error message (3 arguments), `message`, `validation method`, `comparison value`

*I'll try to add filters where I see it could be useful, but if you are missing one, please post an issue requesting it*

## Features
> Unchecked boxes are features that are planned to be implemented in the near future (in no particular order)

* [x] Automatic changing of image size to load when changing size of image in content
* [x] Gallery shortcode editing
* [x] Advanced Custom Fields support (see supported ACF fields for more details)
* [x] Automatic oEmbed conversion upon paste
* [x] Automatic url to link conversion
* [x] Automatic updates
* [x] Ability to edit featured image
* [x] Show unsaved changes warning if leaving page
* [x] Ability to edit other columns from the posts table (`post_name`, `post_date` and `post_status`)
* [x] Extend pluggability further and support for extensions (enable to hook onto and modify js editor)
* [x] Ability to set post as featured
* [x] Allow/Disable comments
* [x] WooCommerce support for simple product types (see supported WooCommerce fields for more details)
* [x] Live value validation
* [x] Image upload by dropping an image into the editable area
* [x] Basic RTL support
* [x] Native custom fields support
* [ ] Validate on server-side before save
* [ ] Shortcodes support (other than gallery)
* [ ] Autosave (need some discussion on how to best implement this)
* [ ] Drag image to move it within the editable area
* [ ] Multiple `output_to` selectors and attrs
* [ ] Choice-based fields like dropdown-select (click on content to show dropdown and select option to insert)
* [ ] More ACF fields support
* [ ] Smarter outputting of value (like if it's an image field and has no output options, determine by itself)
* [ ] Post revisions
* [ ] Edit taxonomies (and native tags and categories)
* [ ] How-to guide for integration and extensions
* [ ] Translation
* [ ] Mirror style of current WP admin theme
* [ ] Extended WooCommerce support
* [ ] Ability to set default options on posttype level of array

## Proposed features
> These features requires further discussion, not yet set to be implemented

* [ ] Enhance UX by visualizing which area you are editing
* [ ] Make it possible to create new posts from frontend
* [ ] Change common ajax functions to make use of WP Rest API instead (when implemented into core)
* [ ] Spellchecking and word suggestion, auto correction
* [ ] Ability to update widget contents
* [ ] Editing from archives/blog home
* [ ] Markdown parser
* [ ] Column-maker (made as an add-on?)

### Supported custom field types
* Text `meta_text`
* Text Area `meta_textarea`
* Number `meta_number`
* Email `meta_email`
* Url `meta_url`
* Wysiwyg Editor `meta_wysiwyg`
* Image `meta_image`

### Supported ACF field types
* Text
* Text Area
* Number
* Email
* Url
* Password
* Wysiwyg Editor
* oEmbed
* Image
* File

### Supported WooCommerce fields (for simple product types)
* SKU `woo_sku`
* Price `woo_price`
* Sale Price `woo_sale_price`
  * Scheduling
* Short Description `woo_short_description`
* Inventory (through settings modal)
  * Stock Quantitiy (if manage stock is enabled)
  * Stock Status
* Catalog visibility (through settings modal)
* Featured product (through settings modal)

## Extending
There will be a proper how-to guide here, but for now, you can look in the `extensions` folder for examples on how to create an extension

## Collaboration notes
* I'm using Sass for styling and [PrePros](https://prepros.io/) for compiling (there's a free version if you wanna check it out)
* JS files are minified and concatenated with [PrePros](https://prepros.io/), so without it you'll have to load the other js files individually (see prepros-prepend comments in the beginning of scripts.js)
* I'm using [Bower](http://bower.io/) for keeping the following librarires up to date:
  * [Medium Editor](https://github.com/yabwe/medium-editor)
  * [jQuery Timepicker Addon](https://github.com/trentrichardson/jQuery-Timepicker-Addon)
  * [tipso](https://github.com/object505/tipso)
  * [toastr](https://github.com/CodeSeven/toastr)
* Core features should be free and open source
* Comment your code

## License
See the [LICENSE](LICENSE.md) file for license rights (GPLv2)