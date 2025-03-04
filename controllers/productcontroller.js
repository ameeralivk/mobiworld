const product = require('../models/productSchema')
const multer = require('multer')
const mongoose = require('mongoose')
const path = require('path')
const Product = require('../models/productSchema')


const addproductpage = async(req,res)=>{
  try {
     res.render('addproduct',{msg:''})
  } catch (error) {
    
  }
}

const productpage = async(req,res)=>{
   const product = await Product.find({})
     try {
        res.render('product',{product,msg:''})
     } catch (error) {
        
     }
}

const addproduct = async (req,res)=>{
   const prod = await Product.find({})
   try {
      upload(req, res, (err) => {
         if (err) {
          console.log(err)
         } else {
           if (req.files == undefined) {
             res.render('addproduct', { product:prod,
                                     msg: 'No file selected!' });
           } else {
            const imagePaths = req.files.map(file=>`/cardimages/${file.filename}`)
            const newProduct = new product({
               productName: req.body.productName,
               description: req.body.productDescription,
               productImage:imagePaths ,
               brand:req.body.brand,
               salePrice:req.body.price,
               color:req.body.color,
               quantity:req.body.count,
             });
             newProduct.save()
             res.redirect('product')
           }
         }
       });   
   } catch (error) {
      console.log('productcontroler errorr',error)
   }
}

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
 }).array('productImage', 3);


module.exports = {
    addproductpage,
    productpage,
    addproduct,
}