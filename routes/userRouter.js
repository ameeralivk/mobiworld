const express = require('express')
const router = express.Router()
const usercontroller = require('../controllers/usercontroller')


router.get('/register',usercontroller.loadregisterpage)
router.get('/verify-otp',usercontroller.loadverify)
router.post('/register',usercontroller.register)
router.get('/login',usercontroller.login)
router.post('/verify-otp',usercontroller.verifyOtp);
router.post('/resetOtp',usercontroller.resetOtp);
router.get('/resendOtp',usercontroller.resendOtp)
module.exports = router
