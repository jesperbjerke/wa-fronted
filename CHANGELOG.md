CHANGELOG
=========
## 0.4
* Updated Medium Editor to 5.6.0
* Refactored `wa-fronted.php` and `scripts.js`, separating ACF functions into a core extension
* Added extendability to the javascript object, curtesy of ACF, (mimics wp hooks in PHP like `add_action` and `add_filter`)
* Added editor option `native`
* Changed how acf_form() would save since it stopped submitting through Ajax
* Fixed issue where editor toolbar would not respect options since Medium Editor changed disableToolbar
* Fixed issue where specific output_to would not search within the container element

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