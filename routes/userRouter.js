const express = require('express')
const router = express.Router()
const usercontroller = require('../controllers/usercontroller')
const passport =  require('passport')
const userschema = require('../models/user')
router.get('/register',usercontroller.loadregisterpage)
router.get('/verify-otp',usercontroller.loadverify)
router.post('/register',usercontroller.register)
router.get('/login',usercontroller.Loadlogin)
router.post('/verify-otp',usercontroller.verifyOtp);
router.post('/resetOtp',usercontroller.resetOtp);
router.get('/resendOtp',usercontroller.resendOtp)
router.get('/pageNotFound',usercontroller.pageNotFound)
router.post('/login',usercontroller.login)
router.get('/',usercontroller.loadhome)
router.get('/logout',usercontroller.logout)
router.get('/forgetOtp',usercontroller.forgetOtp)
router.post('/resetpassOtp',usercontroller.resetpassOtp)
router.get('/passresetpage',usercontroller.passresetpage)
router.post('/passreset',usercontroller.passreset)
router.get('/shoppage',usercontroller.shoppage)
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/login'}),(req,res)=>{
      req.session.User = req.user
      res.redirect('/')
    });
module.exports = router;
