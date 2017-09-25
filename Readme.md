# HTML Sanitize

HTML sanitizer for the browser originally extracted from Angular `ngSanitize` function

## Install

```
npm install htmlsanitize
```

## Usage

```javascript
const sanitize = require('htmlsanitize');

sanitize('<div onclick="alert(\'Hi!\')">I am bad!</div>') // <div>I am bad!</div>
```

## License

MIT
