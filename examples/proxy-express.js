var express = require('express');
var connect = require('connect');

var httpProxy = require('http-proxy')
var url = require('url');

// for development, use npm link to create symlink based installation.
var strict = require('connect-strictenjs');

var proxy = new httpProxy.RoutingProxy();

app = express();

var proxyware = function( req, res ) { 
  var uri = url.parse(req.url);
  req.headers["Accept-Encoding"] = '';
  proxy.proxyRequest(req, res, {
    host: uri.hostname,
    port: (uri.port || 80),
  });
};

app.use(express.logger());
app.use(connect.responseTime());
app.use(strict.stricten() );
app.use(strict.beautifier());
app.all('/*',proxyware);

app.listen(8080);

