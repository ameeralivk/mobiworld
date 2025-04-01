const categoryschema = require('../models/categorySchema')
const brandSchema = require('../models/brandSchema')
const offerschema = require('../models/offerSchema')
const userschema = require('../models/user')
const productSchema = require('../models/productSchema')
const orderschema = require('../models/orderSchema')


const offersPage = async(req,res)=>{
    const categories = await categoryschema.find({})
    const brands = await brandSchema.find({})
    const users = await userschema.find({})
    const products = await productSchema.find({})
    try {
        const page = parseInt(req.query.page) || 1;  
        const limit = 6; 
        const skip = (page - 1) * limit;
        const totalProducts = await offerschema.countDocuments();
        const totalPages = Math.ceil(totalProducts / limit);
        const offers = await offerschema.find().skip(skip).limit(limit);
        if(req.session.message){
            const message = req.session.message 
            req.session.message = null
          return  res.render('offerPage',{categories,brands,users,products,message,offers,page,totalPages})
        }
        else if(req.session.error){
            const message = req.session.error
            req.session.error = null
          return  res.render('offerPage',{categories,brands,users,products,message:"",error:message,offers,page,totalPages}) 
        }
       return  res.render('offerPage',{categories,brands,users,products,message:'',error:'',offers,page,totalPages})
    } catch (error) {
        console.error('error from offercontroller',error)
    }
}
const addOffer = async(req,res)=>{
    try {
        const categories = await categoryschema.find({})
        const brands = await brandSchema.find({})
        const { name, description, offerType, categoryId, brandId, discountType, discountValue, maxDiscount, expiredOn,startDate } = req.body;
          if(offerType === "category"){
            const products = await productSchema.find({category:categoryId})
            if(products.length>0){
                const newOffer = new offerschema({
                    name,
                    description,
                    offerType,
                    categoryId: offerType === "category" ? categoryId : null,
                    brandId: offerType === "brand" ? brandId : null,
                    discountType,
                    discountValue,
                    maxDiscount: discountType === "percentage" ? maxDiscount : null,
                    expiredOn,
                    startDate,
                  });
                  newOffer.save()
                return res.redirect('/admin/offersPage')

            }
            else{
                req.session.error = "no category found"
                return   res.redirect('/admin/offersPage')
            }
           
          }  
          if(offerType === "brand"){
            const products = await productSchema.find({brand:brandId})
            if(products.length>0){
                const newOffer = new offerschema({
                    name,
                    description,
                    offerType,
                    categoryId: offerType === "category" ? categoryId : null,
                    brandId: offerType === "brand" ? brandId : null,
                    discountType,
                    discountValue,
                    maxDiscount: discountType === "percentage" ? maxDiscount : null,
                    expiredOn,
                    startDate,
                  });
                  newOffer.save()
                return res.redirect('/admin/offersPage')

            }
            else{
                req.session.error = "no category found"
                return   res.redirect('/admin/offersPage')
            }
           
          }   
    } catch (error) {
        console.log('error from offercontroller',error)
    }
}
const getCoupons = async(req,res)=>{
    const categories = await categoryschema.find({})
    const brands = await brandSchema.find({})
    console.log(brands,categories,'categores')
    try {
        res.render('offerPage',{categories:categories,brands:brands})
    } catch (error) {
        console.error('error from offercontroller',error)
    }
}

module.exports ={
    offersPage,
    addOffer,
    getCoupons,
}