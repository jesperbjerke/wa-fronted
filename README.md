WA Fronted WordPress Plugin
===========================

[![Join the chat at https://gitter.im/jesperbjerke/wa-fronted](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/jesperbjerke/wa-fronted?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
Discuss this project at Gitter

Frontend editor for WordPress, an free and open source project with a goal to enhance usability and convenience of editing content.

> This plugin requires plugin and theme developers to include pre-configured options in their products, it will **not** work "out of the box". Are you an end-user? [Look here!](https://edituswp.com/)

![](https://github.com/jesperbjerke/wa-fronted/blob/master/screenshots/screenshot-1.jpg)
![](https://github.com/jesperbjerke/wa-fronted/blob/master/screenshots/screenshot-2.jpg)
![](https://github.com/jesperbjerke/wa-fronted/blob/master/screenshots/screenshot-3.jpg)

## Features

* [x] Support for extensions and integrations
* [x] Advanced Custom Fields support (see [supported ACF fields](https://github.com/jesperbjerke/wa-fronted/wiki/Supported-fields) for more details)
* [x] WooCommerce support for simple product types (see [supported WooCommerce fields](https://github.com/jesperbjerke/wa-fronted/wiki/Supported-fields) for more details)
* [x] Post revisions (step through and see changes live)
* [x] Native custom fields support
* [x] Live value validation
* [x] Automatic oEmbed conversion upon paste
* [x] Automatic url to link conversion
* [x] Image upload by dropping an image into the editable area
* [x] Drag image to move it within the editable area
* [x] Automatic changing of image size to load when changing size of image in content
* [x] Edit featured image
* [x] Gallery shortcode editing
* [x] Shortcodes support (other than gallery)
* [x] Automatic updates
* [x] Show unsaved changes warning if leaving page
* [x] Ability to edit other columns from the posts table
* [x] Ability to set post as featured
* [x] Ability to set post parent to hierarchical post types
* [x] Allow/Disable comments
* [x] Ability to edit fields saved in the wp_options table
* [x] Edit and add taxonomies (and native tags and categories)
* [x] Basic RTL support
* [x] Choice-based fields with dropdown-select
* [x] How-to guide for integration and extensions

## To do's
> Things that are planned to be implemented in the near future (in no particular order)

* [ ] Autosave
* [ ] Ability to edit custom excerpt
* [ ] Enable select-dropdown for other fields than meta_select
* [ ] Translation function for javascript

## Help needed
* [ ] Translating

## Proposed features
> These features requires further discussion, not yet set to be implemented

* [ ] Make it possible to create new posts from frontend
* [ ] Change common ajax functions to make use of WP Rest API instead (when implemented into core)
* [ ] Spellchecking and word suggestion, auto correction
* [ ] Ability to update widget contents
* [ ] Editing from archives/blog home
* [ ] Extended WooCommerce support
* [ ] More ACF fields support
* [ ] Mirror style of current WP admin theme
* [ ] Optimization for small screens
* [ ] Ability to create child-categories

## Proposed extensions
* [ ] Live SEO analyzis and tips with Yoast integration
* [ ] Column-maker (shortcake integration?)
* [ ] Markdown parser

## Requirements
* PHP version >= 5.4.3

## Documentation
**[See the Wiki for documentation.](https://github.com/jesperbjerke/wa-fronted/wiki)**

## Collaboration notes
* I'm using Sass for styling and [PrePros](https://prepros.io/) for compiling (there's a free version if you wanna check it out)
* JS files are minified and concatenated with [PrePros](https://prepros.io/), so without it you'll have to load the other js files individually (see prepros-prepend comments in the beginning of scripts.js)
* I'm using [Bower](http://bower.io/) for keeping the following libraries up to date:
  * [Medium Editor](https://github.com/yabwe/medium-editor)
  * [jQuery Timepicker Addon](https://github.com/trentrichardson/jQuery-Timepicker-Addon)
  * [Tipso](https://github.com/object505/tipso)
  * [Toastr](https://github.com/CodeSeven/toastr)
  * [Select2](https://select2.github.io/)
  * [Rangy](https://github.com/timdown/rangy)
* Core features should be free and open source
* Comment your code

## License
See the [LICENSE](LICENSE.md) file for license rights (GPLv2)