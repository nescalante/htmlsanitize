# HTML Sanitize

HTML sanitizer for the browser originally extracted from Angular [`ngSanitize`](https://github.com/angular/angular.js/blob/master/src/ngSanitize/sanitize.js) function

## Install

```
npm install htmlsanitize
```

## Usage

```javascript
const sanitize = require('htmlsanitize');

sanitize('<div>Hello world!</div><script>alert("booh!")</script>') // <div>Hello world!</div>
```

## License

MIT
