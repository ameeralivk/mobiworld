const Product = require('../models/productSchema')

const getproductmainpage = async(req,res)=>{
  console.log(req.params)
    const {id} = req.params
    const product = await Product.findById(id)
    const priceless = product.salePrice -15000
    const pricemore = product.salePrice + 15000
    const recomended = await Product.find({salePrice:{$gte:priceless , $lte:pricemore},_id: { $ne: product._id }})
  try {
    console.log('hi')
    res.render('productmainpage',{product:product,recomended:recomended})
  } catch (error) {
    
  }
}
const getfilterpage = async(req,res)=>{ 
    try {
        const { category, priceFrom, priceTo } = req.query;
        let filter = {}
        if(category){
            filter.brand = category;
        }
        if (priceFrom || priceTo) {
            filter.salePrice = {};
            if (priceFrom) filter.salePrice.$gte = parseInt(priceFrom);
            if (priceTo) filter.salePrice.$lte = parseInt(priceTo);
          }
          const products = await Product.find(filter);
          res.render('shoppage', { product: products });
    } catch (error) {
        
    }
}
const getprofilepage = async(req,res)=>{
  try {
    res.render('profilepage')
  } catch (error) {
    console.error('error from home controller',error)
  }
}


const geteditpage = async(req,res)=>{
  try {
      res.render('editprofilepage')
  } catch (error) {
    console.error('error from homecontroller geteditpage',error)
  }
}



module.exports= {
    getproductmainpage,
    getfilterpage,
    getprofilepage,
    geteditpage,
}