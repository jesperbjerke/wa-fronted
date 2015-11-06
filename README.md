WA Fronted WordPress Plugin
===========================

[![Join the chat at https://gitter.im/jesperbjerke/wa-fronted](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/jesperbjerke/wa-fronted?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
Discuss this project at Gitter

WA Fronted (or just “Fronted“) is a frontend editor for WordPress. It’s a free and open source project with a goal to enhance usability and convenience of editing content.

> The core concept with Fronted is that theme and plugin developers incorporate their configuration filter and/or add-on in their plugin or theme. However since version 1.3.5, it will automatically configure itself to make `post_content`, `post_title` and `post_thumbnail` editable if no other options are set.

**[Live Demo](http://fronted.westart.se)**

**[Documentation](https://github.com/jesperbjerke/wa-fronted/wiki)**

![](https://github.com/jesperbjerke/wa-fronted/blob/master/screenshots/4GUJJnK01o.gif)

## Features

* [x] Support for extensions and integrations
* [x] Supports Custom Post Types
* [x] Supports Custom Fields (see [supported fields](https://github.com/jesperbjerke/wa-fronted/wiki/Supported-fields) for more details)
* [x] Advanced Custom Fields support (see [supported ACF fields](https://github.com/jesperbjerke/wa-fronted/wiki/Supported-fields) for more details)
* [x] WooCommerce support for simple product types (see [supported WooCommerce fields](https://github.com/jesperbjerke/wa-fronted/wiki/Supported-fields) for more details)
* [x] Supports [Shortcake](https://github.com/fusioneng/Shortcake)
* [x] Utilizes TinyMCE (thanks to [isuelde](https://github.com/iseulde/wp-front-end-editor))
* [x] Autosave
* [x] Post revisions (step through and see changes live)
* [x] Live value validation
* [x] Automatic oEmbed conversion upon paste
* [x] Automatic url to link conversion
* [x] Image upload by dropping an image into the editable area
* [x] Drag image to move it within the editable area
* [x] Automatic changing of image size to load when changing size of image in content
* [x] Edit featured image
* [x] Shortcode rendering & editing
* [x] Show unsaved changes warning if leaving page
* [x] Ability to edit other common columns from the posts table
* [x] Ability to set post as featured
* [x] Ability to set post parent to hierarchical post types
* [x] Ability to edit custom excerpt
* [x] Allow/Disable comments
* [x] Ability to edit fields saved in the wp_options table
* [x] Edit and add taxonomies (both custom and native)
* [x] Basic RTL support
* [x] Choice-based fields with dropdown-select
* [x] CTRL + click on link in editor to open in new tab/window
* [x] Automatic config of `post_content`, `post_title` and `post_thumbnail` if no settings are set __requires editable contents to be in a wrapping container with class `hentry` like `<article class="hentry"><h1 class="entry-title"></h1><div class="entry-content"></entry-content></article>`__, can be turned off by setting `auto_configure` to `false`
* [x] Check/Set post locks

## To do's
> Things that are planned to be implemented in the near future (in no particular order)

* [ ] Optimization for small screens and touch devices
* [ ] Make it possible to create new posts from frontend

## Proposed features/To do's
> These features requires further discussion, not yet set to be implemented

* [ ] Change common ajax functions to make use of WP Rest API instead (when implemented into core)
* [ ] Ability to update widget contents
* [ ] Extended WooCommerce support
* [ ] More ACF fields support
* [ ] Mirror style of current WP admin theme
* [ ] Ability to create child-categories
* [ ] Ability to create settings-modal for each editor
* [ ] Break out built-in extensions into separate plugins

## Proposed extensions
* [ ] Live SEO analyzis and tips with Yoast integration
* [ ] Markdown parser

## Requirements
* PHP version >= 5.4.3

## Documentation
**[See the Wiki for documentation.](https://github.com/jesperbjerke/wa-fronted/wiki)**

## Collaboration notes
* I'm using Sass for styling and [PrePros](https://prepros.io/) for compiling (there's a free version if you wanna check it out, but any SASS and JS compiler should work)
* JS files are minified and concatenated with [PrePros](https://prepros.io/), so without it you'll have to load the other js files individually (see `@prepros` comments in the beginning of scripts.js)
* I'm using [Bower](http://bower.io/) for keeping the following libraries up to date:
  * [jQuery Timepicker Addon](https://github.com/trentrichardson/jQuery-Timepicker-Addon)
  * [Tipso](https://github.com/object505/tipso)
  * [Toastr](https://github.com/CodeSeven/toastr)
  * [Select2](https://select2.github.io/)
  * [Rangy](https://github.com/timdown/rangy)
* Core features should be free and open source
* Comment your code

## License
See the [LICENSE](LICENSE.md) file for license rights (GPLv2)