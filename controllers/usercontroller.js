const session = require('express-session')
const userschema = require('../models/user')
const bcrypt = require('bcrypt')
const salt = 10
const nodemailer = require('nodemailer')
const { ConnectionStates } = require('mongoose')
const { render } = require('ejs')
const env = require('dotenv').config()
const productSchema = require('../models/productSchema')
const categories = require('../models/categorySchema')
const brandschema =require('../models/brandSchema')
const wishlistSchema = require('../models/wishlistSchema')
const walletSchema = require('../models/walletSchem')
const mongoose = require('mongoose')
const offerschema = require('../models/offerSchema')
const statusCode = require('../config/statusCode')
const loadverify = async(req,res)=>{
   return res.render('verify-otp')
}

// const getBestOfferForProduct = async (product) => {
//   // if (!product.category && !product.brand) return null;
//   if (!product || (!product.category && !product.brand)) return null;
//   const filterConditions = [];

//   if (product.category != null) {
//     filterConditions.push({ categoryId: new mongoose.Types.ObjectId(product.category) });
//   }
//   if (product.brand != null) {
//     filterConditions.push({ brandId: new mongoose.Types.ObjectId(product.brand) });
//   }
//   if (product._id != null) {
//     filterConditions.push({ productId: new mongoose.Types.ObjectId(product._id) });
//   }
//   console.log(filterConditions, 'filtercondition') 
//   const offers = await offerschema.find({
//     $or: filterConditions,
//     status: true,
//     startDate: { $lt: new Date().setHours(0, 0, 0, 0) }, 
//     expiredOn: { $gte: new Date().setHours(0, 0, 0, 0) }  
//   });
  
//   console.log(offers, 'offers')
//   if (!offers || offers.length === 0) return null; // No offers available

//   let bestOffer = null;
//   let maxDiscountValue = 0;

//   offers.forEach((offer) => {
//     let discountValue =
//       offer.discountType === "percentage"
//         ? (offer.discountValue / 100) * product.salePrice
//         : offer.discountValue;

//     if (offer.maxDiscount) {
//       discountValue = Math.min(discountValue, offer.maxDiscount);
//     }
//     console.log(discountValue,'discountValue')
//     if (discountValue > maxDiscountValue) {
//       if(discountValue < product.salePrice * 0.25 ){
//         maxDiscountValue = discountValue; 
//         bestOffer = offer;
//       }
//       bestOffer = offer
//     }
//      if (
//     bestOffer &&
//     ( discountValue >= product.salePrice * 0.25)
//   ) {
//     bestOffer.discountValue = product.salePrice * 0.25;
//     bestOffer.maxDiscount = product.salePrice * 0.25;
//   }
//   });

//   return bestOffer;  
// };

const getBestOfferForProduct = async (product) => {
    if (!product || (!product.category && !product.brand)) return null;
  
    const filterConditions = [];
  
    if (product.category) {
      filterConditions.push({ categoryId: new mongoose.Types.ObjectId(product.category) });
    }
    if (product.brand) {
      filterConditions.push({ brandId: new mongoose.Types.ObjectId(product.brand) });
    }
    if (product._id) {
      filterConditions.push({ productId: new mongoose.Types.ObjectId(product._id) });
    }
  
    // const today = new Date();
    // today.setHours(0, 0, 0, 0);
  
    // const offers = await offerschema.find({
    //   $or: filterConditions,
    //   status: true,
    //   startDate: { $lte: today },
    //   expiredOn: { $gte: today }
    // });
     const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
    
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
    
      const offers = await offerschema.find({
        $or: filterConditions,
        status: true,
        startDate: { $lte: endOfDay },
        expiredOn: { $gte: startOfDay },
      });
    
  
    if (!offers || offers.length === 0) return null;
  
    let bestOffer = null;
    let maxDiscountValue = 0;
    const maxAllowedDiscount = product.salePrice * 0.25;
  
    offers.forEach((offer) => {
      let discountValue = offer.discountType === "percentage"
        ? (offer.discountValue / 100) * product.salePrice
        : offer.discountValue;
  
      if (offer.maxDiscount) {
        discountValue = Math.min(discountValue, offer.maxDiscount);
      }
  
      // Cap discount at 25% of salePrice
      const cappedDiscount = Math.min(discountValue, maxAllowedDiscount);
  
      if (cappedDiscount > maxDiscountValue) {
        maxDiscountValue = cappedDiscount;
        bestOffer = { ...offer.toObject(), discountValue: cappedDiscount, maxDiscount: cappedDiscount };
      }
    });
  
    return bestOffer;
  };
  

const passresetpage = async (req,res)=>{
    if(req.session.message){
        const message = req.session.message
        return res.render('passresetpage',{message})
    }
    else{
        return res.render('passresetpage',{message:''})
    }
    
}
const pageNotFound = async (req,res)=>{
    try {
        res.render('page-404')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}
const passreset = async(req,res)=>{
    const {password,confirmpassword} = req.body
    const newHashedPassword = await bcrypt.hash(password, 10)
    const user = req.session.data
    const isexist = await userschema.findOne({email:user.email})
    isexist.password = newHashedPassword;
        await isexist.save();
    try {
        if(password != confirmpassword){
            req.session.message = "password not match"
            res.redirect('/passresetpage')
        }
        else{
           res.render('login',{message:"password changed successfully"})
        }
    } catch (error) {
        console.log(error)
    }
}
const forgetOtp = async(req,res)=>{
    try {
            const message = null
            if(req.session.message){
                const message = req.session.message
                req.session.message = null
                res.render('forgetpasswordOTP',{message}) 
            }
            else{
                return res.render('forgetpasswordOTP',{message:''})
            }
            
        
        
    } catch (error) {
        console.error("Error in forgetOtp:", error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).send({
            success: false,
            message: "An error occurred while processing your request. Please try again later.",
        });
    }
}

const resetpassOtp = async (req,res)=>{
    function generateotp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    } 
    const {email} = req.body
    const isexist = await userschema.findOne({email:email,isAdmin:false,isGoogleUser:false})
    req.session.data = isexist
    try {
        if(req.session.User){
              if(req.session.User.email == email){
                async function sendVerificationEmail(email,otp){
                    try {
                     const transporter = nodemailer.createTransport({
                         service:'gmail',
                         port:587,
                         secure:false, 
                         requireTLS:true,
                         auth:{
                            user:process.env.NODEMAILER_EMAIL,
                            pass:process.env.NODEMAILER_PASSWORD
                         }
                     })
                     const info = await transporter.sendMail({
                         from:process.env.NODEMAILER_EMAIL,
                         to:email,
                         subject:"verify your account",
                         text:`your otp is ${otp}`,
                         html:`<b>your otp ${otp} </b>`,
                     })
                     return info.accepted.length>0
                    } catch (error) {
                     console.error('error sending email',error);
                     return false;
                    }
                  }               
               
                  try {
                    const otp = generateotp() 
                    req.session.userOtp = otp 
                    console.log(req.session.userOtp)
                     const emailsent = await sendVerificationEmail(email,otp)
                     if(!emailsent){
                         return res.json("email error")
                     }   
                     res.redirect('/verify-otp')
                     console.log('OTP Sent',otp) 
                  


                  } catch (error) {
                    console.error('signu error',error)
                    res.redirect('/pageNotfound')
                  }

              }
              else{
                req.session.message = "username not match"
                res.redirect('/forgetOtp') 
              }
        }
        else{
        if(isexist){
        async function sendVerificationEmail(email,otp){
            try {
             const transporter = nodemailer.createTransport({
                 service:'gmail',
                 port:587,
                 secure:false, 
                 requireTLS:true,
                 auth:{
                    user:process.env.NODEMAILER_EMAIL,
                    pass:process.env.NODEMAILER_PASSWORD
                 }
             })
             const info = await transporter.sendMail({
                 from:process.env.NODEMAILER_EMAIL,
                 to:email,
                 subject:"verify your account",
                 text:`your otp is ${otp}`,
                 html:`<b>your otp ${otp} </b>`,
             })
             return info.accepted.length>0
            } catch (error) {
             console.error('error sending email',error);
             return false;
            }
          }
       try {
             const otp = generateotp() 
            req.session.userOtp = otp 
            console.log(req.session.userOtp)
             const emailsent = await sendVerificationEmail(email,otp)
             if(!emailsent){
                 return res.json("email error")
             }   
             res.redirect('/verify-otp')
             console.log('OTP Sent',otp) 
         }
       catch (error){
         console.error('signu error',error)
         res.redirect('/pageNotfound')
     }
    } 
    else{ 
        req.session.message = "user not  exist"
        res.redirect('/forgetOtp') 
    }
}
    } catch (error) {
        console.log("eroor",error)
    } 
}

const loadhome = async (req,res)=>{
    product = await productSchema.find({isDeleted:false})
    try {
      const user = req.session.User
      if(user){
        const userData = await userschema.findOne({_id:user._id})
        console.log(userData)
        res.render('home',{user:userData,product})
      }
      else{
        return res.render('home',{user:'',product})
      }
      
    } catch (error) {
      console.log("home page not loading",error);
      res.status(statusCode.INTERNAL_SERVER_ERROR).send('Server Error');
    }
  
  }



const loadregisterpage = async(req,res)=>{
    const referralCode = req.query.ref;

    if (referralCode) {
    const referrer = await userschema.findOne({ referalCode: referralCode });
    if (referrer) {
       
    req.session.referrerId = referrer._id; 
    }
    }
    try {
        let message = '';
        if(req.session.message){
            message = req.session.message
            req.session.message = null
        }

        return res.render('register',{ message })
        
    } catch (error) {
        console.log('home page not found')
        res.status(statusCode.INTERNAL_SERVER_ERROR).send('server error')
        
    }
}
const Loadlogin= async(req,res)=>{
    try {
        if(req.session.User && req.session.message == null){
          return res.redirect('/')
        }
        else{
            if(req.session.message){
                const message = req.session.message
                req.session.message = null
                return res.render('login',{message:message})
            }
            return res.render('login',{message:''})
        }
      
    } catch (error) {
       res.redirect('/pageNotFound')
        
    }
}
const login = async (req,res)=>{
    try {
        const {email,password} = req.body
        console.log(email,password)
        const findUser = await userschema.findOne({isAdmin:false,email:email})
        if(!findUser){
            
            return res.render("login",{message:"User not found" })
         }
        if(findUser.isGoogleUser){
            const message = "you signedup with gooogle please login with google signing in"
            res.render('login',{message})
        }
        if(findUser.isBlocked){ 
        
            return res.render('login',{ message:  "User is blocked by admin"})
        }
        if(findUser.password){
            const passwordMatch =await bcrypt.compare(password,findUser.password)
            if(!passwordMatch){
              return  res.render('login',{ message:"incorrect Password"})
            }
        }
        req.session.User = findUser
       return res.redirect('/')
    } catch (error) {
        console.error('login err',error);
        
       return res.render('login',{ message:""})
    }
}
const resendOtp = async (req,res)=>{
    function generateotp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    } 
    const email = req.session.email;
    console.log(email)
    const otp = generateotp()
    req.session.userOtp = otp
    console.log(otp)
    async function sendVerificationEmail(email,otp){
        try {
         const transporter = nodemailer.createTransport({
             service:'gmail',
             port:587,
             secure:false,
             requireTLS:true,
             auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
             }
         })
         const info = await transporter.sendMail({
             from:process.env.NODEMAILER_EMAIL,
             to:email,
             subject:"verify your account",
             text:`your otp is ${otp}`,
             html:`<b>your otp ${otp} </b>`,
         })
         return info.accepted.length>0
        } catch (error) {
         console.error('error sending email',error);
         return false;
        }
      }
      try {
       sendemail = sendVerificationEmail(email,otp)
       if(sendemail){
        res.status(statusCode.OK).json({
            success: true,
            message: "OTP resended successfully",
            redirectUrl: "verify-otp"  // Change this to the desired URL
        });
        // res.status(statusCode.OK).json({ success: true, message: "OTP resended successfully" });
       }
      } catch (error) {
        console.error("Error in resetOtp function:", error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: "An Error Occurred" });
      }
 
}
const resetOtp = async (req, res) => {
    function generateotp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    try {
        console.log('resetOtp function called');
        const newpass = generateotp();
        req.session.userOtp = newpass;
        console.log('New OTP:', newpass); 
        console.log('Session OTP:', req.session.userOtp); 
        res.status(statusCode.OK).json({ success: true, message: "OTP reset successfully" });

    } catch (error) {
        console.error("Error in resetOtp function:", error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: "An Error Occurred" });
    }
}
function generateReferralCode(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

const register = async(req,res)=>{
    const {name,email,password,phone} = req.body
    req.session.email = email;
    const isexist = await userschema.findOne({email})
     function generateotp(){
        return Math.floor(100000 + Math.random()*900000).toString()
     }
     async function sendVerificationEmail(email,otp){
       try {
        const transporter = nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
               user:process.env.NODEMAILER_EMAIL,
               pass:process.env.NODEMAILER_PASSWORD
            }
        })
        const info = await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"verify your account",
            text:`your otp is ${otp}`,
            html:`<b>your otp ${otp} </b>`,
        })
        return info.accepted.length>0
       } catch (error) {
        console.error('error sending email',error);
        return false;
       }
     }
  try {
    
    if(isexist){
        req.session.message = "user already exists"
        res.redirect('register')
    }
    else{
        const otp = generateotp()
        const emailsent = await sendVerificationEmail(email,otp)
        console.log(emailsent,'sent emails')
        if(!emailsent){
            return res.json("email error")
        }
        req.session.userOtp = otp;
        console.log(req.session.userOtp)
        req.session.userData = {name,phone,email,password};
        res.render('verify-otp')
        console.log('OTP Sent',otp)

    }
    
  } 
  catch (error){
    console.error('signu error',error)
    res.redirect('/pageNotfound')
}
}
const verifyOtp = async (req,res)=>{
     const {otp} = req.body;
    try {
        const user = req.session.userData 
        const referralCode = generateReferralCode();
        if(user){
            if(otp===req.session.userOtp){
                const hashedpass = await bcrypt.hash(user.password,salt)
                const newUser = new userschema({
                    name:user.name,
                    email:user.email,
                    phone:user.phone,
                    password:hashedpass,
                    referalCode: referralCode,
                })
               await newUser.save()
               console.log(req.session.referrerId,'idasfdsafa')
               if (req.session.referrerId) {
                const referrer = await userschema.findById(req.session.referrerId);
                if (referrer) {
                    const wallet = await walletSchema.findOne({userId:referrer._id})
                    if (wallet) {
                        wallet.transaction.push({
                            Total:500,
                            Type:"Credit",
                            description:"ReferalAmount"
                        })
                        wallet.calculateWalletTotal()
                        console.log(wallet.WalletTotal,'wallettotal')
                        await wallet.save();
                    }else {
                        const newReferrerWallet = new walletSchema({
                            userId: referrer._id,
                            transaction: [{
                                Total: 500,
                                Type: "Credit",
                                description: "Referral Amount"
                            }]
                        });
                        newReferrerWallet.calculateWalletTotal();
                        await newReferrerWallet.save();
                    }
                    const newWallet = new walletSchema({
                        userId: newUser._id,
                        transaction:[{
                            Total:250,
                            Type:"Credit",
                            description:"Referal CashPrize",
                        }]
                    });
                    newWallet.calculateWalletTotal()
                    await newWallet.save();
                    req.session.referrerId = null
                }
            }
               req.session.user = newUser._id;
               console.log(req.session.user)
               req.session.userOtp = null;
               req.session.userData = null;
               req.session.User = newUser
               res.json({success:true,redirectUrl:"/"})
               }else{
                   res.status(400).json({success:false,message:"invalid Otp please try again"})
               }
        }
        else{ 
             if(req.session.userOtp == otp){
                req.session.userOtp = null
                res.json({success:true,redirectUrl:"/passresetpage",message:"otp successfull"})
             }
             else{
                res.status(400).json({success:false,message:"invalid Otp please try again"})
             }
        }
    } catch (error) {  
        console.error("Error Verifying OTP",error)
        res.status(statusCode.INTERNAL_SERVER_ERROR).json({success:false,message:"An Error Occured"})
    }
}

const logout = async (req,res)=>{ 
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log('session destruction error')
                return res.redirect('/pageNotFound')
            }
            return res.redirect('/login')
        })
       
    } catch (error) {
        console.log("logout error")
        res.redirect('/pageNotFound')
    }
}

// const shoppage = async (req, res) => {
//     const user = req.session.User;
//     try {
//         const category = await brandschema.find({});
//         const product = await productSchema.find({ isDeleted: false, isBlocked: false });

//         let wishlistProductIds = [];

//         if (user) {
//             const wishlist = await wishlistSchema
//                 .findOne({ userId: user._id })
//                 .populate("Products.productId");

//             wishlistProductIds = wishlist
//                 ? wishlist.Products.map(item => item.productId._id.toString())
//                 : [];
//         }

//         return res.render('shoppage', {
//             product,
//             category,
//             count: product.length,
//             wishlistProductIds,
//             selectedSort: '',
//             selectedCategory: '',
//             selectedPriceFrom: '',
//             selectedPriceTo: '',
//         });

//     } catch (error) {
//         console.error('error from usercontroller', error);
//         res.status(statusCode.INTERNAL_SERVER_ERROR).send("Something went wrong");
//     }
// }
// const shoppage = async (req, res) => {
//     const user = req.session.User;
//     try {
//         const category = await brandschema.find({});

//         const page = parseInt(req.query.page) || 1;
//         const limit = 9;
//         const skip = (page - 1) * limit;
//         let products = await productSchema.find({ isDeleted: false, isBlocked: false })
//             .populate('brand')
//             .populate('category')
//             .sort({ createdAt: -1 });
//         products = products.filter(product => {
//             return product.brand && !product.brand.isDeleted &&
//                    product.category && !product.category.isDeleted;
//         });

//         const totalProducts = products.length;

       
//         const paginatedProducts = products.slice(skip, skip + limit);

//         let wishlistProductIds = [];

//         if (user) {
//             const wishlist = await wishlistSchema
//                 .findOne({ userId: user._id })
//                 .populate("Products.productId");

//             wishlistProductIds = wishlist
//                 ? wishlist.Products.map(item => item.productId._id.toString())
//                 : [];
//         }

//         const totalPages = Math.ceil(totalProducts / limit);

//         return res.render('shoppage', {
//             product: paginatedProducts,
//             category,
//             count: totalProducts,
//             wishlistProductIds,
//             selectedSort: '',
//             selectedCategory: '',
//             selectedPriceFrom: '',
//             selectedPriceTo: '',
//             currentPage: page,
//             totalPages
//         });

//     } catch (error) {
//         console.error('error from usercontroller', error);
//         res.status(statusCode.INTERNAL_SERVER_ERROR).send("Something went wrong");
//     }
// }

const shoppage = async (req, res) => {
    const user = req.session.User;
    try {
        const category = await brandschema.find({});
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;

        let products = await productSchema.find({ isDeleted: false, isBlocked: false })
            .populate('brand')
            .populate('category')
            .sort({ createdAt: -1 });

        products = products.filter(p => p.brand && !p.brand.isDeleted && p.category && !p.category.isDeleted);

        const totalProducts = products.length;
        const paginated = products.slice(skip, skip + limit);

        // Enhance products with offers
        const enhancedProducts = await Promise.all(
            paginated.map(async (p) => {
                const offer = await getBestOfferForProduct(p);
                let discount = 0;
                console.log(offer,'offer1')
                if (offer) {
                    discount = offer.discountType === "percentage"
                        ? (offer.discountValue / 100) * p.salePrice
                        : offer.discountValue;

                    if (offer.maxDiscount) discount = Math.min(discount, offer.maxDiscount);
                }
                console.log(offer,'offere amerear')
                return {
                    ...p.toObject(),
                    bestOffer: offer,
                    finalPrice: p.salePrice - discount
                };
            })
        );

        // Wishlist
        let wishlistProductIds = [];
        if (user) {
            const wishlist = await wishlistSchema.findOne({ userId: user._id }).populate("Products.productId");
            wishlistProductIds = wishlist ? wishlist.Products.map(item => item.productId._id.toString()) : [];
        }
       const  isSearch = true;
        res.render("shoppage", {
            product: enhancedProducts,
            category,
            count: totalProducts,
            wishlistProductIds,
            selectedSort: '',
            selectedCategory: '',
            selectedPriceFrom: '',
            selectedPriceTo: '',
            currentPage: page,
            totalPages: Math.ceil(totalProducts / limit),
            isSearch,
        });

    } catch (error) {
        console.error("error from usercontroller", error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).send("Something went wrong");
    }
};

const profilePitcherUpload = async(req,res)=>{
    const user = req.session.User
    try {
        
        console.log(req.file,'file')
        const finduser = await userschema.findOne({_id:user._id})
        if(!finduser){
           return  res.status(statusCode.NOT_FOUND).json({success:false,message:"user not found"})
        }
        finduser.profilePic = req.file.path.replace('public', '');
       const saved = await finduser.save()
        if(saved){
            return res.status(statusCode.OK).json({success:true,message:"profile Pitcher Added"})
        }
    } catch (error) {
        console.log(error,'error from profilecontroller')
        res.status(500).json({success:false,message:"error occured"})
    }
}


module.exports = { 
    loadregisterpage,
    Loadlogin,
    register,
    verifyOtp,
    resetOtp,
    resendOtp,
    loadverify,
    pageNotFound,
    login,
    loadhome,
    logout,
    forgetOtp,
    resetpassOtp,
    passresetpage,
    passreset,
    shoppage,
    profilePitcherUpload,
}