const express = require('express')
const router = express.Router()
const usercontroller = require('../controllers/usercontroller')


router.get('/register',usercontroller.loadregisterpage)
router.post('/register',usercontroller.register)
router.get('/login',usercontroller.login)
router.post('/verify-otp',usercontroller.verifyOtp);
module.exports = router
