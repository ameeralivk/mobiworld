// const passport = require('passport')
// const GoogleStrategy = require('passport-google-oauth20')
// const User = require('../models/user')
// const env = require('dotenv');


// passport.use(new GoogleStrategy({
//     clientID:process.env.GOOGLE_CLIENT_ID,
//     clientSecret:process.env.GOOGLE_CLIENT_SECRET,
//     callbackURL:'http://localhost:4000/user/auth/google/callback'
// },
// async (accessToken,refreshToken,profile,done)=>{
//     try {
//         console.log('Google profile:', profile); // Log the profile object to inspect its structure
//         const googleId = profile.id.toString();
//         let user = await User.findOne({googleId:profile})
//         if(user){
//             return done(null,user);
//         }
//         else{
//             user = new User({
//                 name:profile.display,
//                 email:profile.emails[0].value,
//                 googleId:profile.id,

//             });
//             await user.save()
//             return done(null,user)
//         }
//     } catch (err) {
//         return done(err,null)
//     }
// }
// ));
// passport.serializeUser = ((user,done)=>{
//     done(null,user.id)
// });
// passport.deserializeUser((id,done)=>{
//     User.findById(id)
//     .then(user=>{
//         done(null,user)
//     })
//     .catch(err=>{
//         done(err,null)
//     })
// })
// module.exports = passport;

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');
const dotenv = require('dotenv');
dotenv.config();

function generateReferralCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://moobiworld.shop/user/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const googleId = profile.id.toString(); // Ensure googleId is explicitly cast to a string
    console.log('Google ID:', googleId); // Log the googleId to confirm its value
    let user = await User.findOne({ googleId: googleId });
    if (user) {
      if(user.isBlocked){
        return done(null, false ,{message:"user is blocked"})
      }
      return done(null, user);
    } else {
      const referralCode = generateReferralCode();
      user = new User({
        name: profile.displayName,
        email: profile.emails[0].value,
        googleId: googleId,
        isGoogleUser:true,
        referalCode:referralCode,
      });
      await user.save();
      return done(null, user);
    }
  } catch (err) {
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id)
    .then(user => {
      done(null, user);
    })
    .catch(err => {
      done(err, null);
    });
});

module.exports = passport;
