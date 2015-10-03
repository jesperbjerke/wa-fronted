WA Fronted WordPress Plugin
===========================

[![Join the chat at https://gitter.im/jesperbjerke/wa-fronted](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/jesperbjerke/wa-fronted?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
Discuss this project at Gitter

Frontend editor for WordPress, an experiment with a goal to enhance usability and convenience of editing exisiting content.

> This plugin is intended strictly for plugin and theme developers, it will **not** work "out of the box". Are you an end-user? [Look here!](https://edituswp.com/)

![](https://github.com/jesperbjerke/wa-fronted/blob/master/screenshots/screenshot-1.jpg)
![](https://github.com/jesperbjerke/wa-fronted/blob/master/screenshots/screenshot-2.jpg)
![](https://github.com/jesperbjerke/wa-fronted/blob/master/screenshots/screenshot-3.jpg)

**[See the Wiki for documentation.](https://github.com/jesperbjerke/wa-fronted/wiki)**

## Features

* [x] Automatic changing of image size to load when changing size of image in content
* [x] Gallery shortcode editing
* [x] Advanced Custom Fields support (see [supported ACF fields](https://github.com/jesperbjerke/wa-fronted/wiki/Supported-fields) for more details)
* [x] Automatic oEmbed conversion upon paste
* [x] Automatic url to link conversion
* [x] Automatic updates
* [x] Ability to edit featured image
* [x] Show unsaved changes warning if leaving page
* [x] Ability to edit other columns from the posts table (`post_name`, `post_date` and `post_status`)
* [x] Extend pluggability further and support for extensions (enable to hook onto and modify js editor)
* [x] Ability to set post as featured
* [x] Allow/Disable comments
* [x] WooCommerce support for simple product types (see [supported WooCommerce fields](https://github.com/jesperbjerke/wa-fronted/wiki/Supported-fields) for more details)
* [x] Live value validation
* [x] Image upload by dropping an image into the editable area
* [x] Basic RTL support
* [x] Native custom fields support
* [x] Choice-based fields with dropdown-select
* [x] Multiple `output_to` selectors and attrs
* [x] Shortcodes support (other than gallery)
* [x] Ability to edit fields saved in the wp_options table
* [x] Ability to set default options in posttype level of array
* [x] Edit and add taxonomies (and native tags and categories)
* [x] Post revisions (step through and see changes live)

## To do's
> Things that are planned to be implemented in the near future (in no particular order)

* [ ] Smarter outputting of value (like if it's an image field and has no output options, determine by itself)
* [ ] Validate on server-side before save
* [ ] How-to guide for integration and extensions
* [ ] Translations
* [ ] Drag image to move it within the editable area
* [ ] PHP version check before init

## Proposed features
> These features requires further discussion, not yet set to be implemented

* [ ] Autosave
* [ ] Enhance UX by visualizing which area you are editing
* [ ] Make it possible to create new posts from frontend
* [ ] Change common ajax functions to make use of WP Rest API instead (when implemented into core)
* [ ] Spellchecking and word suggestion, auto correction
* [ ] Ability to update widget contents
* [ ] Editing from archives/blog home
* [ ] Markdown parser
* [ ] Column-maker (made as an add-on?)
* [ ] Extended WooCommerce support
* [ ] More ACF fields support
* [ ] Mirror style of current WP admin theme
* [ ] Optimization for small screens
* [ ] Live SEO analyzis and tips, Yoast integration add-on?
* [ ] Ability to create child-categories

## Collaboration notes
* I'm using Sass for styling and [PrePros](https://prepros.io/) for compiling (there's a free version if you wanna check it out)
* JS files are minified and concatenated with [PrePros](https://prepros.io/), so without it you'll have to load the other js files individually (see prepros-prepend comments in the beginning of scripts.js)
* I'm using [Bower](http://bower.io/) for keeping the following libraries up to date:
  * [Medium Editor](https://github.com/yabwe/medium-editor)
  * [jQuery Timepicker Addon](https://github.com/trentrichardson/jQuery-Timepicker-Addon)
  * [tipso](https://github.com/object505/tipso)
  * [toastr](https://github.com/CodeSeven/toastr)
* Core features should be free and open source
* Comment your code

## License
See the [LICENSE](LICENSE.md) file for license rights (GPLv2)