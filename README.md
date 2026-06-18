# Welcome to layouter.dev!

I built this wireframe layout designer for my web design students. You can drag HTML elements onto a canvas and then export an HTML template that you can fill in.

There are lots of similar tools out there that are geared towards professionals. The goal of this is to be very simple and intuitive. The target audience is students who are just learning web design. Some of the most common element properties are available - for everything else you can export and manually tweak the HTML.

## Features

### HTML Elements

The building blocks of web pages are HTML elements. On the left sidebar, there is a bank of HTML elements that you can drag and drop onto the canvas. You can also rearrange in the canvas. You can also drag and drop elements on top of each other to nest them.

### Patterns
Web designers often think in terms of design patterns, which are built from basic HTML elements. To help students learn and incorporate these patterns, I've included a few. They are just prebuilt collections of standard HTML elements, and you can tweak them after adding.

### Starter templates
By default, we start with a blank slate. If you want to
see some pre-built pages, check out the "starter templates" dropdown at the top.

### Properties panel
Click any element to edit its properties. Depending on the element type, you'll see selectors for grid/flex layouts, alignment, size, box model properties, etc.

### DOM tree view
The browser parses HTML into the DOM. To help students learn how the visual page matches to the browser's concept of the DOM tree, there's a text representation of the tree to the left of the preview. You can select elements from either view.

### Export HTML/CSS
Generates clean, class-based HTML and CSS from your layout — ready to paste into a real project.

The export dialog includes an **Include HTML validator** checkbox (on by default). When checked, it embeds a button in the footer
that will send your code to the [W3C Validation Service](https://validator.w3.org/) and shows the feedback in the page. For more about this, see [GHC HTML validator](https://github.com/gracehoppercenter/validate/tree/main).

### Shareable links
The entire design is hashed and encoded in the URL, so copying the link to share your design. This also means that you can use the browser's back/forward buttons for undo/redo.

## License

[GNU General Public License v3.0](LICENSE) — ❤️ Copying is an act of love. Please contribute, copy and share. Feel free to suggest ideas or make PRs at [the GitHub repo](https://github.com/cj0ne5/layouter.dev)

## Credits

Built using [rough.js](https://github.com/rough-stuff/rough), just like my other favorite tool for this kind of work, [Excalidraw](https://excalidraw.com/).