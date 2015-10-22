CHANGELOG
=========
## 1.2
* Fixed shortcodes not being filtered on save
* Fixed shortcode edit button not binding on load

## 1.1
* Switched Medium Editor to TinyMCE in order to be closer to WP Core
* Added filter `featured_image_toolbar`
* Added filter `on_tinymce_setup`
* Added option `shortcodes`
* Changed filter `medium_extensions` to `editor_plugins`
* Changed options saved to session to be saved to WA_Fronted::options instead
* Changed so that WA_Fronted::$options is not JSON encoded until it's sent to javascript
* Fixed issue #13
* Fixed faulty compilation of options based on field types

## 1.0
* Fixed shortcode edit and image edit toolbar taking up space in footer
* Fixed problem with image dragging and showing the image edit toolbar
* Fixed shortcodes not rendering when showing revisions
* Fixed a few CSS kinks
* Fixed image align left and center
* Made an [online demo](http://fronted.westart.se)

## 0.9.5
* Added autosaving
* Added filter `wa_fronted_get_autosave`
* Added filter `wa_fronted_autosave_data`
* Added filter `wa_get_js_i18n`
* Added translation function for javascript
* Added ability to edit rendered shortcodes
* Added filter `shortcode_actions`
* Added action `shortcode_action_{shortcode base}`
* Fixed faulty regex in `wa_render_shortcode`
* Fixed faulty regex in `filter_shortcodes` if there were multiple occurrences of the exact same shortcode
* Fixed faulty regex in `unfilter_shortcodes`

## 0.9.1
* Updated Medium Editor to 5.8.3
* Fixed typo in the PHP version check
* Cleaned up and restructured README.md for 1.0 release
* Added javascript and php function reference to the Wiki
* Added extension how-to guide to the Wiki

## 0.9
* Added ability to set post parent to hierarchical post types
* Added ability to drag image to move it within the editable area
* Added PHP version check before init
* Made the image upload button into an extendable toolbar element
* Added javascript filter `image_upload_toolbar`
* Added javascript filter `image_edit_toolbar`
* Added [Rangy](https://github.com/timdown/rangy)
* Updated Plugin Update Checker to master branch

## 0.8.5
* Added support for adding/managing taxonomies, categories and tags
* Added post revision handling
* Added php filter `wa_fronted_revisions`
* Added javascript filter `revision_content`
* Added javascript filter `revision_db_value`
* Changed jQuery UI selectmenu to [select2](https://select2.github.io/)
* Moved documentation to Wiki

## 0.8
* Updated Medium Editor to 5.8.2
* Updated Tipso to 1.0.6
* Added ability to save data to wp_options table
* Added trim() before saving content to remove excessive whitespace
* Ability to set default options in posttype-level of array
* Styled checkboxes in settings modal

## 0.7.5
* Updated Medium Editor to 5.8.1
* Added multiple `output_to` support
* Added support for writing shortcodes
* Added toolbar button `renderShortcode`
* Fixed some toolbar buttons not being rendered
* Fixed issue where image with caption would not render if inserted without selection
* Fixed issue with aligning/editing/removing images with caption

## 0.7
* Added choice-based fields (enables dropdown select to choose between values to insert) for custom fields
* Added support for ACF fields: `select` and `radio` 
* Added ability to omit `selector` and only set `attr` in `output_to` to target the editor element
* Removed fatal error trigger if no configuration filter found (plugin will just not initialize instead)
* Changed link to Editus (formerly known as Lasso) in README.md
* Fixed issue where the ACF-edit button would be replaced by new content after save

## 0.6.5
* Added native custom field support
* Fixed faulty logic in validation settings in ACF field type switch

## 0.6.1
* Updated Medium Editor to 5.7.0
* Added basic RTL support

## 0.6
* Updated Medium Editor to 5.6.3
* Added file-api to modernizr
* Added image upload by dropping image to the editable area
* Changed jQuery UI resizable to custom function instead (problems with unnecessary bloated markup and css added by jQuery UI)
* Fixed issue with getting proper image size of square images when resizing
* Performance improvements of image resizing
* Added `cleanPastedHTML : true` to medium-editor to fix ugly markup when copying and pasting html
* Added image toolbar when clicking on image, mimicking toolbar in tinymce

## 0.5
* Updated Medium Editor to 5.6.2
* Added Sale price scheduling for WooCommerce
* Added live validation
* Added option `paragraphs`
* Added option `validation`

## 0.4.5
* Updated Medium Editor to 5.6.1
* Added WooCommerce support (as another core extension)
* Added filter `supported_woo_fields`
* Added filter `wa_fronted_settings_fields`
* Added ability to set post as featured
* Added ability allow/disable comments
* Fixed faulty nonce sent through Ajax

## 0.4
* Updated Medium Editor to 5.6.0
* Refactored `wa-fronted.php` and `scripts.js`, separating ACF functions into a core extension
* Added extendability to the javascript object, curtesy of ACF, (mimics wp hooks in PHP like `add_action` and `add_filter`)
* Added editor option `native`
* Changed how `acf_form()` would save since it stopped submitting through Ajax
* Fixed issue where editor toolbar would not respect options since Medium Editor changed `disableToolbar`
* Fixed issue where specific `output_to` would not search within the container element

## 0.3.1
* Updated Medium Editor to 5.5.3

## 0.3
* Updated Plugin Update Checker to 2.2
* Changed action hooks `wa_before_fronted_scripts`, `wa_after_fronted_scripts` to `wa_fronted_before_scripts`, `wa_fronted_after_scripts` (to respect a more uniform naming standard of hooks)
* Added settings modal with options to change different post settings
* Added nonce validation to ajax post save
* Added action hook `wa_fronted_settings_form`
* Added action hook `wa_fronted_settings_modal_footer`
* Added action hook `wa_fronted_settings_form_save`
* Added filter `wa_fronted_settings_values`

## 0.2
* Added support for featured image
* Disabled and moved unnecessary functions if not logged in and not on frontend
* Added unsaved changes warning if leaving page
* Added action hook `wa_fronted_toolbar`

## 0.1.2
* Removed submodule link of plugin updater

## 0.1.1
* Added updating functionality through github, curtesy of [YahnisElsts](https://github.com/YahnisElsts/plugin-update-checker), as well as automatic background updates
* Added oEmbed support (automatic conversion of valid oEmbed)
* Updated Medium Editor to 5.5.1
* Save options to session, reducing loading/compiling

## 0.1
* First public release