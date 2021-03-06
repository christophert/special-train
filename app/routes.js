// app/routes.js
const u2f = require('u2f');
const APP_ID = 'https://u2f-demo.chtr.us';
var User = require('../app/models/user');
module.exports = function(app, passport, mongoose) {

    // =====================================
    // HOME PAGE (with login links) ========
    // =====================================
    app.get('/', function(req, res) {
        res.render('index.ejs'); // load the index.ejs file
    });

    // =====================================
    // LOGIN ===============================
    // =====================================
    // show the login form
    app.get('/login', function(req, res) {

        // render the page and pass in any flash data if it exists
        res.render('login.ejs', { message: req.flash('loginMessage') }); 
    });

    // process the login form
    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/profile', // redirect to the secure profile section
        failureRedirect : '/login', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

    // =====================================
    // SIGNUP ==============================
    // =====================================
    // show the signup form
    app.get('/signup', function(req, res) {

        // render the page and pass in any flash data if it exists
        res.render('signup.ejs', { message: req.flash('signupMessage') });
    });

    // process the signup form
    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect : '/profile', // redirect to the secure profile section
        failureRedirect : '/signup', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

    // =====================================
    // U2F SECTION =========================
    // =====================================

    app.get('/u2f/register', isLoggedIn, function(req, res, next) {
        res.render('u2f-register.ejs', {
            user: req.user
        });
    });

    app.get('/u2f/authenticate', isLoggedInNo2FA, function(req, res, next) {
        res.render('u2f-authenticate.ejs', {
            user: req.user
        });
    });

    app.get('/u2f/register/request', function(req, res, next) {
        const registrationRequest = u2f.request(APP_ID);
        req.session.registrationRequest = registrationRequest;
        return res.send(registrationRequest);
    });

    app.post('/u2f/register/challenge', function(req, res, next) {
        const result = u2f.checkRegistration(req.session.registrationRequest, req.body);
        console.log(result)
        if(result.successful) {
            //add result.publicKey and result.keyHandle to model
            console.log(req.user);
            console.log(req.user._id);
            User.update({ "local.email": req.user.local.email }, {
                "u2f": {
                    u2fPubKey: result.publicKey,
                    u2fKeyHdl: result.keyHandle
                }
            }, {new: true}, function(err, model) {
                if(err) {
                    return res.send({err});
                }
            });
            return res.sendStatus(200);
        }
        
        return res.send({result});
    });

    app.get('/u2f/auth/request', function(req, res, next) {
        const keyHandle = req.user.u2f.u2fKeyHdl;
        const authRequest = u2f.request(APP_ID, keyHandle);
        req.session.authRequest = authRequest;
        
        return res.send(authRequest);
    });

    app.post('/u2f/auth/challenge', function(req, res, next) {
        const publicKey = req.user.u2f.u2fPubKey;
        const result = u2f.checkSignature(req.session.authRequest, req.body, publicKey);
        
        if(result.successful) {
            req.session.u2fAuthenticated = true;
            return res.sendStatus(200) 
        }
        return res.send({result});
    });


    // =====================================
    // PROFILE SECTION =====================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
    app.get('/profile', isLoggedIn, function(req, res) {
        res.render('profile.ejs', {
            user : req.user // get the user out of session and pass to template
        });
    });

    // =====================================
    // LOGOUT ==============================
    // =====================================
    app.get('/logout', function(req, res) {
        req.logout();
        req.session.destroy();
        res.redirect('/');
    });
};

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated()) {
        if(req.user.u2f.u2fKeyHdl != null && req.session.u2fAuthenticated != true) {
            return res.redirect('/u2f/authenticate');
        } else {
            return next();
        }
    }

    // if they aren't redirect them to the home page
    res.redirect('/');
}

function isLoggedInNo2FA(req, res, next) {

    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated()) {
        return next();
    }

    // if they aren't redirect them to the home page
    res.redirect('/');
}

