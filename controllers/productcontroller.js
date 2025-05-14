const product = require('../models/productSchema')
const multer = require('multer')
const mongoose = require('mongoose')
const path = require('path')
const category = require('../models/categorySchema')
const Product = require('../models/productSchema')
const { triggerAsyncId } = require('async_hooks')
const { findByIdAndUpdate } = require('../models/user')
const brandschema = require('../models/brandSchema')
const Category = require('../models/categorySchema')
const cartSchema = require('../models/cartSchema')

const addproductpage = async(req,res)=>{
       const Category = await category.find({isDeleted:false})
       const brand = await brandschema.find({isDeleted:false})
  try {
     
     res.render('addproduct',{msg:'',Category,brand})
  } catch (error) {
    
  }
}

const productpage = async(req,res)=>{
   const page = parseInt(req.query.page) || 1;
   const limit = parseInt(req.query.limit) || 5;
   const paginatedData = await getPaginatedData(page, limit);
   if(req.session.msg){
      const msg = req.session.msg
      req.session.msg = null
      return res.render('product',{product:paginatedData.data,
         msg:msg,
         data:paginatedData.data,
         currentPage:paginatedData.currentPage,
          totalPages:paginatedData.totalPages,
          limit, })
   }
     try {
         return res.render('product',{product:paginatedData.data,
                                      msg:'',
                                      data:paginatedData.data,
                                      currentPage:paginatedData.currentPage,
                                       totalPages:paginatedData.totalPages,
                                       limit, })
        }
      catch (error) {
        console.log(error)
     }
}

const addproduct = async (req,res)=>{
   const prod = await Product.find({})
   const brand = await brandschema.find({})
   const Category = await category.find({})
   try {
      firstupload(req, res, async (err) => {
         console.log(req.body)
         if (err) {
          console.log(err)
         } else {
           if (req.files.length == 0) {
             res.render('addproduct', { product:prod,brand,Category,
                                     msg: 'No file selected!' });
           } else {
            const imagePaths = req.files.map(file=>`/cardimages/${file.filename}`)
            const categ = await category.findOne({name:req.body.category})
            const brand = await brandschema.findOne({brandName:req.body.brand})
            // const findProduct = await product.findOne({productName:req.body.productName.trim()})
            const findProduct = await product.findOne({
               productName: { $regex: new RegExp(req.body.productName.trim(), "i") }
           });
                 
            if(findProduct){
               const prod = await Product.find({})
               const brand = await brandschema.find({})
               const Category = await category.find({})
               res.render('addproduct', { product:prod,brand,Category,
                  msg: 'No Duplicate Product is Allowed!' });
            }
            else{
               const newProduct = new product({
                  productName: req.body.productName,
                  description: req.body.productDescription,
                  productImage:imagePaths,
                  brand:brand._id,
                  salePrice:req.body.price,
                  quantity:req.body.count,
                  Tax:parseInt(req.body.tax),
                  category:categ._id,
                });
                newProduct.save()
                req.session.msg = "product added successfully"
                res.redirect('product')
            }
           }
         }
       });   
   } catch (error) {
      console.log('productcontroler errorr',error)
   }
}


const editproduct = async(req,res)=>{
   const {productId} = req.params
   const prod = await Product.findById(productId)
   const fullproduct = await Product.find({})
   console.log(productId,'id')
   try {

     upload(req, res,async(err) => {
      console.log(req.body,'req.body')
      const brand = await brandschema.findOne({brandName:req.body.brand})
      const category = await Category.findOne({name:req.body.category}) 
         if (err) {
          console.log(err) 
         } else {
            if(req.files){
               let imagePaths = prod.productImage;
             
            if (req.files.productImage1) {
               imagePaths[0] = `/cardimages/${req.files.productImage1[0].filename}`;
             }
             if (req.files.productImage2) {
               imagePaths[1] = `/cardimages/${req.files.productImage2[0].filename}`;
             }
             if (req.files.productImage3) {
               imagePaths[2] = `/cardimages/${req.files.productImage3[0].filename}`;
             }

              console.log(imagePaths)

             await Product.findByIdAndUpdate(prod,{
               productName: req.body.productName,
               description: req.body.productDescription,
               productImage:imagePaths,
               brand:brand._id,
               category:category._id,
               salePrice:req.body.price,
               quantity:req.body.count,
               Tax:parseInt(req.body.tax)

             })

            const carts = await cartSchema.find({ 'items.productId': prod._id });

            for(let cart of carts){
               cart.items.forEach((item)=>{
                  if(item.productId.toString() === prod._id.toString()){
                     item.price = req.body.price
                     item.totalPrice = item.quantity * req.body.price
                  }
               })
               cart.calculateTotalPrice()
               await cart.save()
            }

             req.session.msg = 'product updated successfull'
             res.redirect('/admin/product')
            }
            else{
               res.redirect('/admin/product')
            }
           }
         }
       );   
   } catch (error) {
      console.log('productcontroler errorr',error)
   }
}

// const editproduct = async (req, res) => {
//   const { productId } = req.params;
//   const prod = await Product.findById(productId);

//   try {
//     upload(req, res, async (err) => {
//       console.log(req.body, 'req.body');

//       const brand = await brandschema.findOne({ brandName: req.body.brand });
//       const category = await Category.findOne({ name: req.body.category });

//       if (err) {
//         console.log(err);
//         return res.redirect('/admin/product');
//       }

//       if (req.files) {
//         let imagePaths = prod.productImage;

//         if (req.files.productImage1) {
//           imagePaths[0] = `/cardimages/${req.files.productImage1[0].filename}`;
//         }
//         if (req.files.productImage2) {
//           imagePaths[1] = `/cardimages/${req.files.productImage2[0].filename}`;
//         }
//         if (req.files.productImage3) {
//           imagePaths[2] = `/cardimages/${req.files.productImage3[0].filename}`;
//         }

//         // Update product
//         await Product.findByIdAndUpdate(prod._id, {
//           productName: req.body.productName,
//           description: req.body.productDescription,
//           productImage: imagePaths,
//           brand: brand._id,
//           category: category._id,
//           salePrice: req.body.price,
//           quantity: req.body.count,
//           Tax: parseInt(req.body.tax),
//         });

//         // ✅ Update carts that contain this product
//         const carts = await cartSchema.find({ 'items.productId': prod._id });

//         for(let cart of carts){
//          cart.items.forEach((item)=>{
//             if(item.productId.toString() === prod._id.toString()){
//                item.price = req.body.price
//                item.totalPrice = item.quantity * req.body.price
//             }
//          })
//          cart.calculateTotalPrice()
//          await cart.save()
//         }

//         req.session.msg = 'Product updated successfully';
//         return res.redirect('/admin/product');
//       } else {
//         return res.redirect('/admin/product');
//       }
//     });
//   } catch (error) {
//     console.log('Product controller error', error);
//     res.redirect('/admin/product');
//   }
// };


function checkFileType(file, cb) {
   const filetypes = /jpeg|jpg|png|gif|webp/;
   const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
   const mimetype = filetypes.test(file.mimetype);

   if (mimetype && extname) {
       return cb(null, true);
   } else {
       cb('Error: Images Only!');
   }
}



const storage = multer.diskStorage({
   destination:'./public/cardimages/',
   filename: (req, file, cb) => {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
})

const upload = multer({
   storage: storage,
   limits: { fileSize: 1000000 }, 
   fileFilter: (req, file, cb) => {
     checkFileType(file, cb);
   }
 }).fields([
   { name: 'productImage1', maxCount: 1 },
   { name: 'productImage2', maxCount: 1 },
   { name: 'productImage3', maxCount: 1 }
 ]);

 const firstupload = multer({
   storage: storage,
   limits: { fileSize: 1000000 }, 
   fileFilter: (req, file, cb) => {
     checkFileType(file, cb);
   }
 }).array('productImage', 3);

const deleteProduct = async(req,res)=>{
     const productId = req.params.productId
     const prod = await product.findById(productId)
try {
   if(prod.isDeleted == false){
      await product.findByIdAndUpdate(productId,{isDeleted:true})
      return res.redirect('/admin/product')
   }
   else{
      await product.findByIdAndUpdate(productId,{isDeleted:false})
      return res.redirect('/admin/product')
   }
   
} catch (error) {
   console.error('error in deleting product ',error)
}
}


const searchproduct = async(req,res)=>{
   const page = parseInt(req.query.page) || 1;
   const limit = parseInt(req.query.limit) || 5;

   // const paginatedData = await getPaginatedData(page, limit);
   const Searchval = req.query.Searchval||''
   // const product = await Product.find({$and :[{productName: { $regex: Searchval, $options: 'i' }},{isDeleted:false}]}).sort({createdAt:-1});
   const searchfilter = {productName:{$regex:Searchval,$options:'i'},isDeleted:false}
   const products  = await Product.find(searchfilter).skip((page - 1)*limit).limit(limit).sort({createdAt:-1});
   const totalCount = await Product.countDocuments(searchfilter);
   const currentPage = page
   const totalPages = Math.ceil(totalCount / limit);
   try {
      return  res.render('product',{ product:products,
           msg:'',
           data:products,
           totalPages:totalPages,
           currentPage:currentPage,
           limit,
           clearInput:false,})
   } catch (error) {
       console.log("category contorller error",error)
   }
}

const productclear =async(req,res)=>{
         const page = parseInt(req.query.page) || 1;
           const limit = parseInt(req.query.limit) || 5;
       
           const paginatedData = await getPaginatedData(page, limit);
           const product = await Product.find({isDeleted:false}).sort({createdAt:-1})
           try { 
               // res.render('product',{product:paginatedData.data ,
               //                      msg:'',
               //                     clearInput:true,
               //                     data:paginatedData.data,
               //                     totalPages:paginatedData.totalPages,
               //                     currentPage:paginatedData.currentPage,
               //                     limit,
               //                 })
               res.redirect('/admin/product')
           } catch (error) { 
               console.log(error)         
           }
}


 const editproductpage = async(req,res)=>{
   const productId =  req.params.productId
   const product = await Product.findById(productId).populate('category').populate('brand')
   console.log(product,'product')
   const fullproduct = await brandschema.find({})
   const fullcategory = await category.find({})
   console.log(fullproduct,'fullproduct')
   try { 
      console.log(product)   
      res.render('editproduct',{msg:'',product,fullproduct,fullcategory})
   } catch (error) {    
      console.log(error)  
   }
 }

 async function getPaginatedData(page, limit) {
   try {
       const skip = (page - 1) * limit;
       const data = await Product.find({isDeleted:false}).sort({createdAt:-1}).skip(skip).limit(limit).populate('brand').exec();
       const totalDocuments = await Product.countDocuments({isDeleted:false});

       return {
           data,
           totalPages: Math.ceil(totalDocuments / limit),
           currentPage: page,
       };
   } catch  {
       console.error('Error fetching paginated data:', error);
       return {
           data: [],
           totalPages: 0,
           currentPage: page,
           totalDocuments: 0,
       };
   }
       
}

async () => {
   
}

module.exports = {
    addproductpage,
    productpage,
    addproduct,
    deleteProduct,
    editproductpage,
    searchproduct,
    editproduct,
    productclear,
}