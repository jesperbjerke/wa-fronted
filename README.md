WA Fronted WordPress Plugin
===========================

[![Join the chat at https://gitter.im/jesperbjerke/wa-fronted](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/jesperbjerke/wa-fronted?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
Discuss this project at Gitter

Frontend editor for WordPress, an experiment with a goal to enhance usability and convenience of editing exisiting content.

> This plugin is intended strictly for developers, it will **not** work "out of the box".

![](https://github.com/jesperbjerke/wa-fronted/blob/master/screenshots/screenshot-1.jpg)
![](https://github.com/jesperbjerke/wa-fronted/blob/master/screenshots/screenshot-2.jpg)
![](https://github.com/jesperbjerke/wa-fronted/blob/master/screenshots/screenshot-3.jpg)

To enable an editable area, simply add a filter function to 'wa_fronted_options' that passes and returns a multidimensional array. Note that both themes and plugins can call this filter before or after eachother and build upon or replace options.

The first level of the array consists of the key "defaults" (optional) and "post_types". In "defaults", specify whatever you want to be set as default when you have not set anything else in that specific area. In "post_types" you create an array for each post type you want to enable frontend editing for (you can also use 'front_page' if you just want to target your static front page). Inside, you set "editable_areas" with an array with options for each editable area on this post type.

The following example will enable the regular post content on front page to be editable from frontend if logged in user has role "administrator", with a toolbar consisting of only bold and italic buttons, but on posts we allow a full toolbar and leaving permission to the default (current_user_can('edit_posts')).

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
* **container** (required, string): selector of wrapping element of what you want to edit. Can be any valid jQuery selector string
* **field_type** (required, string): `post_content`, `post_title`, `acf_{FIELD ID}` / `acf_sub_{SUBFIELD ID}` (if set and **toolbar** is not specified, **toolbar** will set itself based on what field it is)
* **permission** (optional, string): `logged-in` (enable to all logged in users), `default` (default, enabled if user has capability *edit_posts*), `{USER ROLE}` (enable to specific user role)
* **post_id** (optional, int): Insert post id to override the `global $post` variable. If used in combination with `acf_{FIELD ID}`, note that it can also be set to *options / taxonomies / users / etc*
* **toolbar** (optional, mixed bool/string): `full` (default, all buttons), `false` (do not show toolbar), `comma-separated string` (bold, italic, underline, anchor, header1, header2, quote, unorderedlist, orderedlist, justifyLeft, justifyCenter, justifyRight)
* **media_upload** (optional, mixed bool/string): `true` (default, will allow user to insert/upload media to the editable area), `false` (disable media upload), `only` (constrain the editable area to only edit media. ie; no text, no toolbar)
* **output** (optional, string): *only applies to ACF fields with complex output* value to retrieve from get_field() to output as a dot separated string representing the traversing of value array, ie. for an image field that should output the thumbnail: "sizes.thumbnail".
* **output_to** (optional, array): *if not specified, the returned data after save will be put directly into the container element* 
```php
array(
	"selector" => (string) selector of element inside **container** to output content to. Can be any valid jQuery selector string,
	"attr"	=> (mixed bool/string) if output should be set to an attribute of **selector**, otherwise false or not set
)
```

## Action hooks
* **wa_fronted_init** runs upon plugin initialization, after the class's __construct function
* **wa_before_fronted_scripts** runs before plugin has registered all its scripts and styles (passes complete options array as argument)
* **wa_after_fronted_scripts** runs after plugin has registered all its scripts and styles (passes complete options array as argument)
* **wa_fronted_save** runs after regular save function (passes $data as argument)
* **wa_fronted_autosave** runs after regular autosave function (passes $data as argument)

*I'll try to add hooks where I see it could be useful, but if you are missing one, please post an issue requesting it*

## Filters
* **supported_acf_fields** modify supported ACF fields array (1 argument)
* **compile_options** modify the partially compiled options array (1 argument, called multiple times)
* **wa_fronted_options** modify options array, use this to set your options (1 argument)

*I'll try to add filters where I see it could be useful, but if you are missing one, please post an issue requesting it*

##Supported ACF field types
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

##Pending features
* [ ] Ability to edit featured image
* [ ] Show unsaved changes warning if leaving page
* [ ] Ability to edit other columns from the posts table (like post_author, post_date and so on)
* [ ] Native custom fields support
* [ ] Shortcodes support (other than gallery)
* [ ] Autosave
* [ ] WooCommerce support (other than standard WP-fields)
* [ ] Image upload by dropping an image into the editable area
* [ ] Drag image to move it within the editable area
* [ ] Extend plugability further and support for extensions (enable to hook onto and modify js editor)
* [ ] Multiple "output_to" selectors and attrs
* [ ] Choice-based fields like dropdown-select (click on content to show dropdown and select option to insert)
* [ ] More ACF fields support
* [ ] Smarter outputing of value (like if it's an image field and has no output options, determine by itself)
* [ ] Enable editing from archives/blog home
* [ ] Make it possible to create new posts from frontend

##Collaboration notes
* I'm using sass for styling and PrePros for compiling (there's a free version if you wanna check it out)
* JS files are minified and concatenated with PrePros, so without it you'll have to load the other js files individually (see prepros-prepend comments in the beginning of scripts.js)
* I'm using bower for keeping medium-editor up to date, right now there are no other dependancies other than jQuery but that comes with WP
* Features and third party add ons should be free and open source
* Comment your code