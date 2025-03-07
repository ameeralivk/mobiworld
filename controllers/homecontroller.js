const Product = require('../models/productSchema')

const getproductmainpage = async(req,res)=>{
    const {id} = req.params
    const product = await Product.findById(id)
  try {
    console.log('hi')
    res.render('productmainpage',{product:product})
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


module.exports= {
    getproductmainpage,
    getfilterpage,
}