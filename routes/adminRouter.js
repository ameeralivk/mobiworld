const express = require('express')
const router = express.Router()
const admincontroller = require('../controllers/admincontroller')
const {adminAuth,userAuth,login} = require('../middlewares/auth')
const categorycontroller = require('../controllers/categorycontroller')
const productcontroller = require('../controllers/productcontroller')



//admin controller and user controller
router.get('/login',admincontroller.loadlogin)
router.post('/login',admincontroller.loginverification)
router.get('/dashboard',admincontroller.dashboard)
router.get('/users',admincontroller.loadusers)
router.post('/blockUnblock/:id',admincontroller.blockUnblock)
router.get('/user/Search',admincontroller.searchuser)
router.post('/user/clear',admincontroller.clear)
router.get('/logout',admincontroller.logout)




//category roates
router.get('/category/search',categorycontroller.categorySearch)
router.get('/addcategory',categorycontroller.addcategorypage)
router.get('/Category',categorycontroller.categoryInfo)
router.post('/category/clear',categorycontroller.categoryclear)
router.post('/addcategory',categorycontroller.addcategory)
router.delete('/Category/categories/:id',categorycontroller.deleteCategory)
router.get('/deleteCategory',categorycontroller.loadDeleteCategory)





//product roates
router.get('/addproduct',productcontroller.addproductpage)
router.get('/product',productcontroller.productpage)
router.delete('/deleteproduct/:id',productcontroller.deleteProduct)
router.post('/upload',productcontroller.addproduct)
router.get('/editproductpage/:id',productcontroller.editproductpage)
router.get('/product/search',productcontroller.searchproduct)
router.post('/editproduct/:id',productcontroller.editproduct)

module.exports = router;  