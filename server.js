var express = require('express');
var https = require('https');
var fs = require('fs');
var app = express();
var port = process.env.PORT || 8080;
var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');

var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');

var configDB = require('./config/database.js');

mongoose.connect(configDB.url);

require('./config/passport')(passport);

app.use(morgan('dev'));
app.use(cookieParser());
app.use(bodyParser());

app.set('view engine', 'ejs');

app.use(session({ secret: 'correct horse battery staple' }));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

require('./app/routes.js')(app, passport, mongoose);

var credentials = {
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt')
};
var httpsServer = https.createServer(credentials, app);
httpsServer.listen(4433);
