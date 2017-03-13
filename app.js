
/**
 * Module dependencies.
 */
var express = require('express');
var routes = require('./routes');
var http = require('http');
var https = require('https');
var path = require('path');
var fs = require('fs');

var app = express();
var bodyParser     = require('body-parser');
var methodOverride = require('method-override');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var favicon = require('static-favicon');
var errorHandler = require('errorhandler');
var multipart = require('connect-multiparty');

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(favicon());
//app.use(express.logger('dev'));
app.use(methodOverride());
app.use(cookieParser('secret-cookie'));
app.use(session());
app.use(express.static(path.join(__dirname, 'static')));
app.use(bodyParser());
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
app.use(multipart({ uploadDir: '/tmp' }));
// development only
if ('development' == app.get('env')) {
  app.use(errorHandler());
}
routes(app);



/*
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
*/

var options = {
	key : fs.readFileSync('privatekey.pem'),
	cert : fs.readFileSync('certificate.pem')
};
https.createServer(options, app).listen(3311, function () {
	console.log('Https server listening on port 3311');
});

