const categoryschema = require('../models/categorySchema')
const brandSchema = require('../models/brandSchema')
const offerschema = require('../models/offerSchema')
const userschema = require('../models/user')
const productSchema = require('../models/productSchema')
const orderschema = require('../models/orderSchema')
const mongoose = require('mongoose')

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
          return  res.render('offerPage',{categories,brands,users,products,message,offers,page,totalPages,error:''})
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
        const { name, description, offerType, categoryId, brandId, discountType, discountValue, maxDiscount, expiredOn,startDate,productId } = req.body;
        console.log(req.body,'req.body')
        const findOffer = await offerschema.findOne({name:name.trim()})
        if(findOffer){
            req.session.error = "Offer is already exist"
            return   res.redirect('/admin/offersPage')
        }
        console.log(productId,'productId')
          if(offerType === "category"){
            const products = await productSchema.find({category:categoryId})
            if(products.length> 0){
                let isDiscountTooHigh = false;

                for (let product of products) {
                    const price = product.salePrice;
        
                    if (discountType === "percentage") {
                        const calculatedDiscount = (price * discountValue) / 100;
                        const applicableDiscount = maxDiscount ? Math.min(calculatedDiscount, maxDiscount) : calculatedDiscount;
        
                        if (applicableDiscount > price / 2) {
                            isDiscountTooHigh = true;
                            break;
                        }
                    } else if (discountType === "fixed") {
                        if (discountValue > price / 2) {
                            isDiscountTooHigh = true;
                            break;
                        }
                    }
                }
        
                if (isDiscountTooHigh) {
                    req.session.error = "Discount exceeds half of the product price for one or more products.";
                    return res.redirect("/admin/offersPage");
                }
                const newOffer = new offerschema({
                    name,
                    description,
                    offerType,
                    categoryId: offerType === "category" ? categoryId : null,
                    brandId: offerType === "brand" ? brandId : null,
                    discountType,
                    discountValue,
                    maxDiscount: discountType === "percentage" ? maxDiscount : 0,
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
            console.log('ahdiasf')
            const products = await productSchema.find({brand:brandId})
            console.log(products,'product')
            if(products.length>0){
                let isDiscountTooHigh = false;

                for (let product of products) {
                    const price = product.salePrice;
        
                    if (discountType === "percentage") {
                        const calculatedDiscount = (price * discountValue) / 100;
                        const applicableDiscount = maxDiscount ? Math.min(calculatedDiscount, maxDiscount) : calculatedDiscount;
        
                        if (applicableDiscount > price / 2) {
                            isDiscountTooHigh = true;
                            break;
                        }
                    } else if (discountType === "fixed") {
                        if (discountValue > price / 2) {
                            isDiscountTooHigh = true;
                            break;
                        }
                    }
                }
        
                if (isDiscountTooHigh) {
                    req.session.error = "Discount exceeds half of the product price for one or more products.";
                    return res.redirect("/admin/offersPage");
                }
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
                req.session.error = "no brand found"
                return   res.redirect('/admin/offersPage')
            }
           
          }  
          if (offerType === "product") {
            let productObjectIds = [];
            console.log("Raw productId:", productId);
        
            if (typeof productId === "string") {
                const productArr = productId.split(",").map(id => id.trim());
                productObjectIds = productArr
                    .filter(id => mongoose.Types.ObjectId.isValid(id))
                    .map(id => new mongoose.Types.ObjectId(id));
            } else if (Array.isArray(productId)) {
                productObjectIds = productId
                    .map(id => id.trim?.() || id) 
                    .filter(id => mongoose.Types.ObjectId.isValid(id))
                    .map(id => new mongoose.Types.ObjectId(id));
            }
        
        
            const products = await productSchema.find({ _id: { $in: productObjectIds } });
            
            if (products.length > 0) {
                let isDiscountTooHigh = false;

                    for (let product of products) {
                        const price = product.salePrice;

                        if (discountType === "percentage") {
                            const calculatedDiscount = (price * discountValue) / 100;
                            const applicableDiscount = maxDiscount ? Math.min(calculatedDiscount, maxDiscount) : calculatedDiscount;
                            if (applicableDiscount > price / 2) {
                                isDiscountTooHigh = true;
                                break;
                            }
                        } else if (discountType === "fixed") {
                            if (discountValue > price / 2) {
                                isDiscountTooHigh = true;
                                break;
                            }
                        }
                    }

                    if (isDiscountTooHigh) {
                        req.session.error = "Discount exceeds half of the product price.";
                        return res.redirect("/admin/offersPage");
                    }
                const newOffer = new offerschema({
                    name,
                    description,
                    offerType,
                    categoryId: offerType === "category" ? categoryId : null,
                    brandId: offerType === "brand" ? brandId : null,
                    productId: productObjectIds,
                    discountType,
                    discountValue,
                    maxDiscount: discountType === "percentage" ? maxDiscount : null,
                    expiredOn,
                    startDate,
                });
        
                await newOffer.save();
                return res.redirect('/admin/offersPage');
            } else {
                req.session.error = "No valid products found";
                return res.redirect('/admin/offersPage');
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