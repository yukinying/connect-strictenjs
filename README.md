connect-strictenjs
==================

overview
--------

This is a connect middelware that adds ECMAScript 5 (ES5) strict mode by prepending "use strict" to all javascript blocks. 
As developers do not need to modify the html or JS code that the server is serving, one could quickly test if their
code are compatible with the ES5 strict mode. 

The package also comes with a code beautifier (based on UglifyJS2), which allows easier troubleshooting when syntax errors
are reported on minified code.

recommended usage
-----------------

Use it with the javascript testing framework that use connect. To enable the middleware, one should simply patch the 
code with 

```javascript
var strict = require('connect-strictenjs');

app = express();

app.use(strict.stricten() );
app.use(strict.beautifier());

// ... other logics that render the pages
```

Then install the package via 

```shell
npm link 
```

Sample code could be found in the example directory.

