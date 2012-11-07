var express = require('express');
var connect = require('connect');

var url = require('url');

// for development, use npm link to create symlink based installation.
var strict = require('connect-strictenjs');

app = express();

// app.use(express.logger());
app.use(connect.responseTime());
app.use(strict.stricten() );
app.use(strict.beautifier());

app.use(express.static(__dirname + '/html'));

app.listen(8081);
