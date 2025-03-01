const express = require('express')
const router = express.Router()
const admincontroller = require('../controllers/admincontroller')

router.get('/login',admincontroller.loadlogin)
router.post('/login',admincontroller.loginverification)
router.get('/dashboard',admincontroller.dashboard)
router.get('/users',admincontroller.loadusers)
router.post('/blockUnblock/:id',admincontroller.blockUnblock)

module.exports = router;