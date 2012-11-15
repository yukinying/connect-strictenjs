/*jslint nomen: true, regexp: true, white: true, node: true, indent: 2, maxerr: 1000 */
/*jshint indent: 2 */

"use strict";

exports.filterJS = function (req, res) {
    return ((req.accepts('json') === 'json' || /\.js/.test(req.url)) && res.statusCode === 200);
  };

exports.filterHTML = function (req, res) {
    return ((req.accepts('html') === 'html' || /\.html/.test(req.url)) && res.statusCode === 200);
  };

exports.beautify = function (body, p1, p2, p3) {
  if(p3) {
    if(/<script>/.test(p1) || /text.javascript/.test(p1)) {
      body = p2;
    } 
    return p1 + p2 + p3;
  }
  try {
    var U = require("uglify-js2")
      , ostream  = U.OutputStream({beautify: true, source_map: null})
      , toplevel = U.parse(body)
      ;
    toplevel.print(ostream);
    if(p3) {
      return p1 + "\n" + ostream.toString() + "\n" + p3 ;
    }
    return ostream.toString();
  } catch (e) {
    console.log(body);
    console.log(e);
  }
  if(p3) { return p1 + p2 + p3; }
  return body;
};

exports.strictening = function (body, p1, p2, p3) {
  if(p3) {
    if(/<script>/.test(p1) || /text.javascript/.test(p1)) {
      return p1 + "\n" + '"use strict";' + "\n" + p2 + "\n" + p3 ;
    } 
    return p1+p2+p3; /* type is not javascript */
  } 
  return '"use strict";' + "\n" + body;
};

exports.beautifier = function (opt) {

  var options = opt || {} ;

  return function (req, res, next) {

    var
        write  = res.write
      , writeHead = res.writeHead
      , end    = res.end
      , url    = req.originalUrl
      , body   = ''
      , isJS   = exports.filterJS(req,res)
      , isHTML = exports.filterHTML(req,res)
      ;

    res.on('header', function () {
      if(isJS || isHTML) {
        res.removeHeader('Content-Length');
        res.removeHeader('last-modified');
      }
      if(res.get && res.get('Content-Type')) {
        isJS = isJS && /javascript|json/i.test(res.get('Content-Type'));
        isHTML = isHTML && /html/i.test(res.get('Content-Type'));
      }
    });

    // From https://github.com/nateps/connect/blob/4025c2fbd2f53d4a8fe5608055514eee0d696ca1/lib/patch.js
    // Until connect has taken the patch, we could only patch it here.
    res.writeHead = function (statusCode, oreason){
      var reasonPhrase, headers, headerIndex,
          name;
      if (typeof oreason === 'string') {
        reasonPhrase = oreason;
        headerIndex = 2;
      } else {
        headerIndex = 1;
      }
      headers = arguments[headerIndex];
      if (headers) {
        for (name in headers) {
          if (headers.hasOwnProperty(name)) {
            this.setHeader(name, headers[name]);
          }
        }
      }
      if (!this._emittedHeader) { this.emit('header'); } 
      this._emittedHeader = true;
      return writeHead.call(this, statusCode, reasonPhrase);
    };

    res.write = function (chunk, encoding) {
      if(isJS || isHTML) {
        body += chunk;
        // console.log('appending chunk for beautifier');
      } else {
        write.apply(res,arguments);
      }
    };

    res.end = function (chunk,encoding) {
      if(isJS && !isHTML) {
        if (chunk) { body += chunk; }
        console.log('beautifying (js) ' + url);
        var ubody = exports.beautify(body) ;
        write.call(res,ubody,encoding);
        end.call(res);
      } else if (isHTML) {
        if (chunk) { body += chunk; }
        console.log('beautifying (html) ' + url);
        body = body.replace(/(<script[^>]*>)((?:.|\s)*?)(<\/script>)/mig, exports.beautify) ;
        write.call(res,body,encoding);
        end.call(res);
      } else {
        end.apply(res,arguments);
      }
    };

    next();

  };
};

exports.stricten = function (opt) {

  var options = opt || {} ;

  return function (req, res, next) {

    var
        called = false
      , write  = res.write
      , writeHead = res.writeHead
      , body   = ''
      , end    = res.end
      , url    = req.originalUrl
      , isJS   = exports.filterJS(req, res)
      , isHTML = exports.filterHTML(req, res)
      ;

    // Normal case
    res.on('header', function () {
      if(isJS || isHTML) {
        res.removeHeader('Content-Length');
        res.removeHeader('last-modified'); // do not cache modification on-the-fly
      }
      if(res.get && res.get('Content-Type')) {
        isJS = isJS && /javascript|json/i.test(res.get('Content-Type'));
        isHTML = isHTML && /html/i.test(res.get('Content-Type'));
      }
    });

    // From https://github.com/nateps/connect/blob/4025c2fbd2f53d4a8fe5608055514eee0d696ca1/lib/patch.js
    // Until connect has taken the patch, we could only patch it here.
    res.writeHead = function (statusCode, oreason){
      var reasonPhrase, headers, headerIndex,
          name;
      if (typeof oreason === 'string') {
        reasonPhrase = oreason;
        headerIndex = 2;
      } else {
        headerIndex = 1;
      }
      headers = arguments[headerIndex];
      if (headers) {
        for (name in headers) {
          if (headers.hasOwnProperty(name)) {
            this.setHeader(name, headers[name]);
          }
        }
      }
      if (!this._emittedHeader) { this.emit('header'); }
      this._emittedHeader = true;
      return writeHead.call(this, statusCode, reasonPhrase);
    };

    res.write = function (chunk, encoding) {

      if(!called && isJS && !isHTML) {
        called = true;
        console.log('strictening (js) ' + url);
        write.call(res, exports.strictening(chunk), encoding);
      } else if (isHTML) {
        // console.log('appending chunk for stricten (html) ');
        if (chunk) { body += chunk; }
      } else {
        write.apply(res,arguments);
      }
    };

    res.end = function (chunk,encoding) {
      if(!called && isJS && !isHTML) {
        console.log('strictening (js) ' + url);
        write.call(res, exports.strictening(chunk), encoding);
        end.call(res);
      } else if (isHTML) {
        if (chunk) { body += chunk; }
        console.log('strictening (html) ' + url);
        // TODO relax this so we don't need to capture the body.
        body = body.replace(/(<script[^>]*>)((?:.|\s)*?)(<\/script>)/mig, exports.strictening) ;
        write.call(res,body,encoding);
        end.call(res);
      } else {
        end.apply(res,arguments);
      }
    };

    next();

  };
};
