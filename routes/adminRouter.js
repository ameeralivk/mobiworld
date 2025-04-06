const express = require('express')
const router = express.Router()
const admincontroller = require('../controllers/admincontroller')
const {adminAuth,userAuth,login} = require('../middlewares/auth')
const categorycontroller = require('../controllers/categorycontroller')
const productcontroller = require('../controllers/productcontroller')
const orderscontroller = require('../controllers/ordercontroller')
const brandcontroller = require('../controllers/brandcontroller')
const offerController = require('../controllers/offercontroller')


//admin controller and user controller
router.get('/login',adminAuth,admincontroller.loadlogin)
router.post('/login',admincontroller.loginverification)
router.get('/dashboard',adminAuth,admincontroller.dashboard)
router.get('/users',adminAuth,admincontroller.loadusers)
router.post('/blockUnblock/:id',admincontroller.blockUnblock)
router.get('/user/Search',adminAuth,admincontroller.searchuser)
router.post('/user/clear',admincontroller.clear)
router.get('/logout',admincontroller.logout)




//category roates
router.get('/category/search',categorycontroller.categorySearch)
router.get('/addcategory',adminAuth,categorycontroller.addcategorypage)
router.get('/Category',adminAuth,categorycontroller.categoryInfo)
router.post('/category/clear',categorycontroller.categoryclear)
router.post('/addcategory',categorycontroller.addcategory)
router.delete('/Category/categories/:id',categorycontroller.deleteCategory)
router.get('/deleteCategory',adminAuth,categorycontroller.loadDeleteCategory)
router.get('/editCategorypage/:id',adminAuth,categorycontroller.editcategorypage)
router.post('/editcategory',adminAuth,categorycontroller.editcategory)





//product roates
router.get('/addproduct',adminAuth,productcontroller.addproductpage)
router.get('/product',adminAuth,productcontroller.productpage)
router.delete('/deleteproduct/:id',productcontroller.deleteProduct)
router.post('/upload',productcontroller.addproduct)
router.get('/editproductpage/:id',productcontroller.editproductpage)
router.get('/product/search',productcontroller.searchproduct)
router.post('/editproduct/:id',productcontroller.editproduct)
router.post('/product/clear',productcontroller.productclear)


//orders routes 
router.get('/orders',adminAuth,orderscontroller.getorders) 
router.post('/updatestatus',orderscontroller.updatestatus)
router.get('/orderdetails/:id',orderscontroller.orderdetails) 
router.post('/searchorder',orderscontroller.searchorder)
router.post('/statusfilter',orderscontroller.statusfilter)
router.post('/Datefilter',orderscontroller.Datefilter)
router.post('/cancelorder',orderscontroller.cancelorder)
module.exports = router;  


//brand routes 
router.get('/brands',adminAuth,brandcontroller.getbrands) 
router.get('/addbrand',adminAuth,brandcontroller.addbrand)
router.post('/addbrand',brandcontroller.registerbrand)
router.get('/editbrandpage/:id',brandcontroller.editbrandpage)
router.post('/editbrand',brandcontroller.editbrand)
router.delete('/brands/:id',brandcontroller.deletebrand)
router.get('/deletebrand',adminAuth,brandcontroller.loadDeletebrand)
router.get('/brand/search',brandcontroller.brandSearch)
router.post('/brand/clear',brandcontroller.brandclear)


//admin offers
router.get('/offersPage',adminAuth,offerController.offersPage)
router.post('/addOffer',offerController.addOffer)
router.get('/addCoupon',adminAuth,offerController.getCoupons)
router.get('/getOffer/:id',admincontroller.getOffer) 
router.post('/editOffer',admincontroller.editOffer)
router.delete('/deleteOffer/:id',admincontroller.deleteOffer)

//salesReport 
router.get('/SalesReport',adminAuth,admincontroller.SalesReport)
router.post('/filterSalesReport',admincontroller.filterSalesReport)
router.get('/downloadSalesReport',admincontroller.downloadSalesReport)
router.get('/download-excel',admincontroller.downloadExcelReport);
router.post('/sales-report-filter',admincontroller.salesReportFilter)


//coupon page
router.get('/couponPage',adminAuth,admincontroller.couponPage)
router.post('/addCoupon',admincontroller.addCoupon)
router.get('/getCoupon/:id',admincontroller.couponEditDetails)
router.post('/editCoupon/:id',admincontroller.editCoupon)
router.delete('/deleteCoupon/:id',admincontroller.deleteCoupon)