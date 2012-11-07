exports.filterJS = function( req, res ) {

// TODO don't test url.
  return ( 
       /\.js/.test(req.url) 
    && req.accepts('json') == 'json' 
    && res.statusCode == 200
    ) ;
}

exports.filterHTML = function( req, res ) { 
  return (
    req.accepts('html') == 'html'
    && res.statusCode == 200
  ) ;
} 

exports.beautify = function( body, p1, p2, p3 ) {
  if( p3 ) body = p2;
  try { 
    var U = require("uglify-js2");
    var ostream  = U.OutputStream({beautify: true, source_map: null} );
    var toplevel = U.parse(body);
    toplevel.print(ostream);
    if( p3 ) 
      return p1 + "\n" + ostream.toString() + "\n" + p3 ; 
    else 
      return ostream.toString();
  } catch (e) {
    console.log(body); 
    console.log(e) 
  } 
  return body;
}

exports.strictening = function( body, p1, p2, p3 ) { 
  if( p3 )
    return p1 + "\n" + '"use strict";' + "\n" + p2 + "\n" + p3 ;
  else
    return '"use strict";' + "\n" + body;
}

exports.beautifier = function(options) {

  var options = options || {} ;

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



    res.on('header', function( ) {
      if( isJS || isHTML ) { 
        console.log('Url is ' + req.url );
        console.log('Content Length is ' + res.get('Content-Length'));
        console.log('Content Type is '   + res.get('Content-Type'));

        res.removeHeader('Content-Length');
        res.removeHeader('last-modified');
      }
      if( res.get('Content-Type') ) { 
        isJS = isJS && /javascript|json/.test(res.get('Content-Type'));
      }
    });

    // From https://github.com/nateps/connect/blob/4025c2fbd2f53d4a8fe5608055514eee0d696ca1/lib/patch.js 
    // Until connect has taken the patch, we could only patch it here.
    res.writeHead = function(statusCode){
      var reasonPhrase, headers, headerIndex;
      if (typeof arguments[1] == 'string') {
        reasonPhrase = arguments[1];
        headerIndex = 2;
      } else {
        headerIndex = 1;
      }
      headers = arguments[headerIndex];
      if (headers) {
        for (var name in headers) {
          this.setHeader(name, headers[name]);
        }
      }
      if (!this._emittedHeader) this.emit('header');
      this._emittedHeader = true;
      return writeHead.call(this, statusCode, reasonPhrase);
    };

    res.write = function( chunk, encoding ) {
      if( isJS || isHTML ) { 
        body += chunk; }
      else { 
        write.apply(res,arguments); 
      }
    }

    res.end = function(chunk,encoding) { 
      if( isJS ) { 
        if (chunk) body += chunk;
        console.log('beautifying ' + url);
        var ubody = exports.beautify( body ) ;
        write.call(res,ubody,encoding);
        end.call(res);
      } else if ( isHTML ) { 
        if (chunk) body += chunk;
        console.log('beautifying ' + url);
        body = body.replace(/(<script[^>]*>)((?:.|\s)*?)(<\/script>)/mig, exports.beautify ) ;
        write.call(res,body,encoding);
        end.call(res);

      } else {
        end.apply(res,arguments)
      }
    } 

    next();

  };
}

exports.stricten = function(options) {

  var options = options || {} ;

  return function (req, res, next) {

    var
      called = false
      , write  = res.write
      , writeHead = res.writeHead
      , body   = ''
      , end    = res.end
      , url    = req.originalUrl 
      , isJS   = exports.filterJS( req, res) 
      , isHTML = exports.filterHTML( req, res) 
      ;

    // Normal case
    res.on('header', function( ) {
      if( isJS ) { 
        res.removeHeader('Content-Length');
        res.removeHeader('last-modified'); // do not cache modification on-the-fly
      }
      if( res.get('Content-Type') ) {
        isJS = isJS && /javascript|json/.test(res.get('Content-Type'));
      }
    });

    // From https://github.com/nateps/connect/blob/4025c2fbd2f53d4a8fe5608055514eee0d696ca1/lib/patch.js 
    // Until connect has taken the patch, we could only patch it here.
    res.writeHead = function(statusCode){
      var reasonPhrase, headers, headerIndex;
      if (typeof arguments[1] == 'string') {
        reasonPhrase = arguments[1];
        headerIndex = 2;
      } else {
        headerIndex = 1;
      }
      headers = arguments[headerIndex];
      if (headers) {
        for (var name in headers) {
          this.setHeader(name, headers[name]);
        }
      }
      if (!this._emittedHeader) this.emit('header');
      this._emittedHeader = true;
      return writeHead.call(this, statusCode, reasonPhrase);
    };

    res.write = function( chunk, encoding ) {

      if( isJS ) { 
        called = true;
        console.log('strictening ' + url);
        write.call(res, exports.strictening(chunk), encoding);
      } else if ( isHTML ) {
        if (chunk) body += chunk;
      } else {
        write.apply(res,arguments);
      }
    }


    res.end = function(chunk,encoding) {
      if ( isHTML ) {
        if (chunk) body += chunk;
        console.log('strictening ' + url);
        body = body.replace(/(<script[^>]*>)((?:.|\s)*?)(<\/script>)/mig, exports.strictening ) ;
        write.call(res,body,encoding);
        end.call(res);
      } else {
        end.apply(res,arguments)
      }
    }

    next();

  };
}
