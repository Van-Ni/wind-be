const GoogleStrategy = require('passport-google-oauth20').Strategy
const GithubStrategy = require("passport-github2").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;

const mongoose = require('mongoose')
const User = require('../models/user');


module.exports = function (passport) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/auth/google/callback',
        passReqToCallback: true
      },
      async function (request, accessToken, refreshToken, profile, done) {
        const newUser = {
          authId: profile.id,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          image: profile.photos[0].value,
          email: profile.emails[0].value,
          verified: profile.emails[0].verified,
        }
        try {
          let user = await User.findOne({ email: profile.emails[0].value })
          if (user) {
            user = await User.findOneAndUpdate({ email: profile.emails[0].value }, { authId: profile.id }, {
              new: true,
              validateModifiedOnly: true,
            });
            return done(null, user);
          } else {
            user = await User.create(newUser)
            return done(null, user);
          }
        } catch (err) {
          console.error(err)
        }
      }
    )
  )

  passport.use(
    new GithubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: '/auth/github/callback',
        passReqToCallback: true
      },
      async function (request, accessToken, refreshToken, profile, done) {
        const newUser = {
          authId: profile.id,
          firstName: profile._json.type,
          lastName: profile._json.name,
          image: profile._json.avatar_url,
          email: profile._json.email || "email@example.com",
          verified: profile.id ? true : false,
        }
        try {
          let user = await User.findOne({ email: profile._json.email })
          if (user) {
            user = await User.findOneAndUpdate({ email: profile.emails[0].value }, { authId: profile.id }, {
              new: true,
              validateModifiedOnly: true,
            });
            return done(null, user);
          } else {
            user = await User.create(newUser)
            return done(null, user);
          }
        } catch (err) {
          console.error(err)
        }
      }
    )
  )

  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        callbackURL: '/auth/facebook/callback',
        passReqToCallback: true
      },
      async function (request, accessToken, refreshToken, profile, done) {
        const newUser = {
          authId: profile.id,
          firstName: profile._json.type,
          lastName: profile._json.name,
          image: profile._json.avatar_url,
          email: profile._json.email || "email@example.com",
          verified: profile.id ? true : false,
        }
        try {
          let user = await User.findOne({ email: profile._json.email })
          if (user) {
            user = await User.findOneAndUpdate({ email: profile._json.email }, { authId: profile.id }, {
              new: true,
              validateModifiedOnly: true,
            });
            return done(null, user);
          } else {
            user = await User.create(newUser)
            return done(null, user);
          }
        } catch (err) {
          console.error(err)
        }
      }
    )
  )

  passport.serializeUser((user, done) => {
    done(null, user);
  })

  passport.deserializeUser((user, done) => {
    done(null, user);
  })
}
