//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-Parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
//const encrypt = require("mongoose-encryption");
//const md5 = require("md5");
//const bcrypt = require("bcrypt");
//const saltRounds = 10;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();
//console.log(process.env.API_KEY);

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({
  extended:true
  }));

  app.use(session({
    secret: "Our little secret",
    resave:false,
    saveUninitialized: false
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  mongoose.connect("mongodb://localhost:27017/userDB",{useUnifiedTopology: true,useNewUrlParser:true})
  mongoose.set("useCreateIndex",true);

const userSchema = new mongoose.Schema({
  email: String,
  password:String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


//userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});

const User = new mongoose.model("User",userSchema);

passport.use(User.createStrategy());





passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});






passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, done) {
       User.findOrCreate({ googleId: profile.id }, function (err, user) {
         return done(err, user);
       });
  }
));


app.get("/",function(req,res){
  res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google',{scope: ["profile"]})
);



  app.get("/login",function(req,res){
    res.render("login");
  });

  app.get("/register",function(req,res){
    res.render("register");
  });



  app.get("/secrets",function(req,res){
    User.find({"secret": {$ne: null}}, function(err, foundUser){
      if(err)
      {
        console.log(err);
      }
      else{
        if(foundUser){
          res.render("secrets", {usersWithSecrets: foundUser});
        }
      }
    });
  });





  app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
  });


  app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
      res.redirect('/secrets');
    });


    app.get("/submit",function(req,res){
      if(req.isAuthenticated())
      {
        res.render("submit");

      }
      else
      {
        res.redirect("/login");
      }
    });

app.post("/register",function(req,res){

  User.register({username: req.body.username},req.body.password,function(err,user){
    if(err)
    {
      console.log(err);
      res.redirect("/register");
    }
    else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/secrets");
      });
    }
  });


});


app.post("/submit",function(req,res){

const submittedSecret = req.body.secret;
User.findById(req.user.id, function(err,foundUser){
  if(err)
  {
    console.log(err);;
  }
  else{
    if(foundUser)
    {
      foundUser.secret = submittedSecret;
      foundUser.save(function(){
        res.redirect("/secrets");
      });
    }
  }
});

});

app.post("/login",function(req,res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});














app.listen(3000,function(){
  console.log("server started");
});
