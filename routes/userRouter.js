const express = require('express')
const router = express.Router()
const usercontroller = require('../controllers/usercontroller')
const passport =  require('passport')
const userschema = require('../models/user')
const {userAuth,login} = require('../middlewares/auth')
const homecontroller = require('../controllers/homecontroller')
const { rotate } = require('pdfkit')
const  {fetchAuth} = require('../middlewares/auth')
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

//home routes
router.get('/productmainpage/:id',homecontroller.getproductmainpage)
router.get('/getfilterpage',homecontroller.getfilterpage)
router.post('/add-to-cart',homecontroller.addtocart)
router.get('/getcart',userAuth,homecontroller.getcart)
router.post('/updatequantity',homecontroller.updatequantity)
router.get('/checkoutpage',homecontroller.checkoutpage)
router.delete('/cartdelete/:id',homecontroller.deletecartbutton)
router.get('/searchmain/search',homecontroller.searchmain)
router.post('/paymentpage',homecontroller.paymentpage)
router.get('/getpaymentpage',userAuth,homecontroller.getpaymentpage)
router.post('/orderplacedpage',homecontroller.orderplacedpage)
router.get('/paymentsuccesspage',userAuth,homecontroller.getpaymentsuccesspage)
router.get('/download-invoice/:id',userAuth,homecontroller.pdfdownload)
router.post('/returnOrder',userAuth,homecontroller.returnorder)
router.post('/getwishlist/:id',homecontroller.getwishlistpage)
router.get('/getwishlist',userAuth,homecontroller.getwishlist)
router.post('/create-razorpay-order',homecontroller.createRazorpayOrder)
router.post('/verify-payment',homecontroller.verifypayment)
router.get('/paymentfailedpage',userAuth,homecontroller.paymentfailedpage)


//order
router.get('/order',userAuth,homecontroller.orderpage)
router.get('/pagination/:id',homecontroller.pagination)

//profile routes
router.get('/profile',userAuth,homecontroller.getprofilepage)
router.get('/editprofile',homecontroller.geteditpage)
router.post('/editprofile',homecontroller.editprofile)
router.post('/otpcheck',homecontroller.checkotp)
router.get('/addresspage',userAuth,homecontroller.addresspage)
router.get('/addaddress',userAuth,homecontroller.addaddress)
router.post('/registeraddress',homecontroller.registeraddress)
router.get('/editaddress/:id',userAuth,homecontroller.editaddress)
router.post('/editaddress/:id',homecontroller.editaddresspost)
router.get('/deleteaddress/:id',userAuth,homecontroller.deleteaddress)

//wallet routes
router.get('/getwallet',userAuth,homecontroller.getwallet)
router.get('/wallet/filter',homecontroller.walletfilter)


//add offer
router.post('/addoffer',userAuth,homecontroller.addOffer)

router.post('/toggle-wishlist',fetchAuth,homecontroller.toggleWishlist)
router.delete('/remove-from-wishlist', userAuth, homecontroller.removeFromWishlist);

router.get('/aboutus',homecontroller.aboutUs)