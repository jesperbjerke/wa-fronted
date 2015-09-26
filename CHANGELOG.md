CHANGELOG
=========
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