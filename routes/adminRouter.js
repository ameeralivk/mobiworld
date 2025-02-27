const express = require('express')
const router = express.Router()
const admincontroller = require('../controllers/admincontroller')

router.get('/login',admincontroller.loadlogin)

module.exports = router;