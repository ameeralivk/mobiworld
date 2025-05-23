const nodemailer = require('nodemailer')
const Product = require('../models/productSchema')
const userschema = require('../models/user')
const addressSchema = require('../models/addressSchema')
const { render, name } = require('ejs')
const { compareSync } = require('bcrypt')
const cartSchema = require('../models/cartSchema')
const Cart = require('../models/cartSchema')
const categories = require('../models/categorySchema')
const { connect } = require('mongoose')
const orderSchema = require('../models/orderSchema')
const brandschema = require('../models/brandSchema')
const Category = require('../models/categorySchema')
const PDFDocument = require('pdfkit')
const path = require('path')
const ejs = require('ejs');
const Razorpay = require("razorpay");
const wishlistSchema = require('../models/wishlistSchema')
const crypto = require("crypto");
const offerschema = require('../models/offerSchema')
const mongoose = require('mongoose')
const walletSchema = require('../models/walletSchem')
const couponSchema = require('../models/couponSchema')
const { ObjectId } = require('mongoose').Types;
const statusCode = require('../config/statusCode')

const getproductmainpage = async (req, res) => {
  console.log(req.params)
  const { productId } = req.params
  req.session.code = productId
  const product = await Product.findOne({ _id: productId, isDeleted: false });
  const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
  const allOffers = await offerschema.find({
    // $or: [
    //   { categoryId: product.category ? new mongoose.Types.ObjectId(product.category) : null },
    //   { brandId: product.brand ? new mongoose.Types.ObjectId(product.brand) : null },
    //   { productId: { $in: [new mongoose.Types.ObjectId(product._id)] } }
    // ],
    $or: [
  {
    categoryId: product?.category
      ? new mongoose.Types.ObjectId(product.category)
      : null
  },
  {
    brandId: product?.brand
      ? new mongoose.Types.ObjectId(product.brand)
      : null
  },
  {
    productId: product?._id
      ? { $in: [new mongoose.Types.ObjectId(product._id)] }
      : null
  }
],
    status: true,
    // startDate: { $lte: new Date().setHours(0, 0, 0, 0) },
    // expiredOn: { $gte: new Date().setHours(0, 0, 0, 0) },
    startDate: { $lte: endOfDay },
    expiredOn: { $gte: startOfDay },
  })
  const bestOffer = await getBestOfferForProduct(product)
  let isWishlisted = false;
  if (req.session.User) {
    const userId = req.session.User._id;
    const wishlist = await Wishlist.findOne({ userId });

    if (wishlist) {
      isWishlisted = wishlist.Products.some(
        (item) => item.productId.toString() === product._id.toString()
      );
    }
  }
  try {
    
    if (req.session.message) {
      const message = req.session.message
      req.session.message = null
      const recomended = await Product.find({ salePrice: { $gte: priceless, $lte: pricemore }, _id: { $ne: product._id } })
      return res.render('productmainpage', { product: product, recomended: recomended, message: message, bestOffer, allOffers,isWishlisted })
    }
    if (product) {
      const priceless = product.salePrice - 15000
      const pricemore = product.salePrice + 15000
      const recomended = await Product.find({ salePrice: { $gte: priceless, $lte: pricemore }, _id: { $ne: product._id },isDeleted:false }).limit(4)
      console.log(bestOffer, 'bestOffer')
      return res.render('productmainpage', { product: product, recomended: recomended, bestOffer, allOffers,isWishlisted })
    }
    else {
      console.log('pos')
      return res.redirect('/user/shoppage')
    }
  } catch (error) {
    console.error('errror from homecontroller', error)
  }
}
// const getTotalOffers = async (product) => {
//   console.log("Fetching offers...");
//   console.log(product, "Product details");

//   if (!product.category && !product.brand) return 0; // Ensure product has a category or brand

//   const filterConditions = [];

//   if (product.category) {
//     filterConditions.push({ categoryId: new mongoose.Types.ObjectId(product.category) });
//   }
//   if (product.brand) {
//     filterConditions.push({ brandId: new mongoose.Types.ObjectId(product.brand) });
//   }
//   if (product._id != null) {
//     filterConditions.push({ productId: new mongoose.Types.ObjectId(product._id) });
//   }

//   const offerList = await offerschema.find({
//     $or: filterConditions,
//     status: true,
//     startDate: { $lte: new Date().setHours(0, 0, 0, 0) },
//     expiredOn: { $gte: new Date().setHours(0, 0, 0, 0) },
//   });
//  console.log(offerList,'list')
//   if (!offerList || offerList.length === 0) return 0; // No offers available

//   let bestOffer = null;
//   let maxDiscountValue = 0;

//   offerList.forEach((offer) => {
//     let discountValue =
//       offer.discountType === "percentage"
//         ? (offer.discountValue / 100) * product.salePrice
//         : offer.discountValue;

//     if (offer.maxDiscount) {
//       discountValue = Math.min(discountValue, offer.maxDiscount);
//     }

//     if (discountValue > maxDiscountValue) {
//       if(discountValue < product.salePrice * 0.25 ){
//         maxDiscountValue = discountValue;
//         bestOffer = offer;
//       }
//       bestOffer = offer
//     }
//     if (
//       bestOffer &&
//       ( discountValue >= product.salePrice * 0.25)
//     ) {
//       bestOffer.discountValue = product.salePrice * 0.25;
//       bestOffer.maxDiscount = product.salePrice * 0.25;
//     }
//   });

//   if (!bestOffer) return 0;
//   console.log(bestOffer, "Selected Offer");
//   console.log(maxDiscountValue, "Final Discount Value");
//    console.log(maxDiscountValue,'adithyan')
//   return maxDiscountValue;
// };


const getTotalOffers = async (product) => {
  if (!product || (!product.category && !product.brand)) return 0;

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

  if (!offers || offers.length === 0) return 0;

  let maxDiscountValue = 0;
  const maxAllowedDiscount = product.salePrice * 0.25;

  offers.forEach((offer) => {
    let discountValue = offer.discountType === "percentage"
      ? (offer.discountValue / 100) * product.salePrice
      : offer.discountValue;

    if (offer.maxDiscount) {
      discountValue = Math.min(discountValue, offer.maxDiscount);
    }

    const cappedDiscount = Math.min(discountValue, maxAllowedDiscount);

    if (cappedDiscount > maxDiscountValue) {
      maxDiscountValue = cappedDiscount;
    }
  });
  return maxDiscountValue;
};



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
//       console.log(maxDiscountValue,'hithis is t')
//     }
//     console.log(discountValue,'discountValue')
//     if (discountValue > maxDiscountValue) {
//       if(discountValue < product.salePrice * 0.25){
//         maxDiscountValue = discountValue; 
//         bestOffer = offer;
//       }
//       bestOffer = offer
//     }
//     console.log(discountValue,'value')
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




// const getfilterpage = async (req, res) => {
//   const cat = await brandschema.find({})
//   const user = req.session.User
//   try {
//     console.log('hi')
//     const { sort, category, priceFrom, priceTo } = req.query;
//     const cat = await brandschema.find({ brandName: category })
//     const categories = await brandschema.find({})
//     let filter = {}
//     console.log('hello')
//     if (cat && cat.length > 0) {
//       filter.brand = cat[0]._id
//     }
//     if (priceFrom || priceTo) {
//       filter.salePrice = {};
//       if (priceFrom) filter.salePrice.$gte = parseInt(priceFrom);
//       if (priceTo) filter.salePrice.$lte = parseInt(priceTo);
//     }
//     if (sort === 'A to Z') {
//       const wishlist = await wishlistSchema.findOne({ userId: user._id }).populate("Products.productId");
//       const wishlistProductIds = wishlist ? wishlist.Products.map(item => item.productId._id.toString()) : [];
//       const products = await Product.find(filter).sort({ productName: 1 });
//       return res.render('shoppage', { product: products, category: categories, wishlistProductIds });
//     }
//     if (sort === 'Z to A') {
//       const wishlist = await wishlistSchema.findOne({ userId: user._id }).populate("Products.productId");
//       const wishlistProductIds = wishlist ? wishlist.Products.map(item => item.productId._id.toString()) : [];
//       const products = await Product.find(filter).sort({ productName: -1 });
//       return res.render('shoppage', { product: products, category: categories, wishlistProductIds });
//     }
//     if (sort === 'Low To High') {
//       const wishlist = await wishlistSchema.findOne({ userId: user._id }).populate("Products.productId");
//       const wishlistProductIds = wishlist ? wishlist.Products.map(item => item.productId._id.toString()) : [];
//       const products = await Product.find(filter).sort({ salePrice: 1 });
//       return res.render('shoppage', { product: products, category: categories, wishlistProductIds });
//     }
//     if (sort === 'High To Low') {
//       const wishlist = await wishlistSchema.findOne({ userId: user._id }).populate("Products.productId");
//       const wishlistProductIds = wishlist ? wishlist.Products.map(item => item.productId._id.toString()) : [];
//       const products = await Product.find(filter).sort({ salePrice: -1 });
//       return res.render('shoppage', { product: products, category: categories, wishlistProductIds });
//     }
//     console.log(filter, 'filter')
//     const wishlist = await wishlistSchema.findOne({ userId: user._id }).populate("Products.productId");
//     const wishlistProductIds = wishlist ? wishlist.Products.map(item => item.productId._id.toString()) : [];
//     const products = await Product.find(filter);
//     console.log(products)
//     return res.render('shoppage', { product: products, category: categories, wishlistProductIds });

//   }
//   catch (error) {
//     console.log('error from homecontroller', error)
//   }
// }

// const getfilterpage = async (req, res) => {
//   const user = req.session.User;
//   let search=''

//   try {
//     if (!user) {
//       req.session.message = "Please Login";
//       return res.redirect('/login');
//     }

//     const { sort, category, priceFrom, priceTo, page = 1, limit = 6,search } = req.query; // Default page=1, limit=6

//     const categories = await brandschema.find({});
//     let filter = {};

//     if (search) {
//       filter.productName = { $regex: search, $options: "i" }; // case-insensitive match
//     }
//     // Brand filter
//     if (category) {
//       const cat = await brandschema.findOne({ brandName: category });
//       if (cat) {
//         filter.brand = cat._id;
//       }
//     }

//     // Price filter
//     if (priceFrom || priceTo) {
//       filter.salePrice = {};
//       if (priceFrom) filter.salePrice.$gte = parseInt(priceFrom);
//       if (priceTo) filter.salePrice.$lte = parseInt(priceTo);
//     }

//     // Wishlist
//     const wishlist = await wishlistSchema.findOne({ userId: user._id }).populate("Products.productId");
//     const wishlistProductIds = wishlist ? wishlist.Products.map(item => item.productId._id.toString()) : [];

//     // Sorting
//     let sortOption = {};
//     if (sort === 'A to Z') sortOption = { productName: 1 };
//     else if (sort === 'Z to A') sortOption = { productName: -1 };
//     else if (sort === 'Low To High') sortOption = { salePrice: 1 };
//     else if (sort === 'High To Low') sortOption = { salePrice: -1 };

//     const skip = (parseInt(page) - 1) * parseInt(limit);
//     const totalProducts = await Product.countDocuments(filter);
//     const totalPages = Math.ceil(totalProducts / limit);

//     // const products = await Product.find(filter)
//     //   .sort(sortOption)
//     //   .skip(skip)
//     //   .limit(parseInt(limit));
//     const products = await Product.find({
//       ...filter,
//       isDeleted: false,
//       isBlocked: false,
//     })
//       .sort(sortOption)
//       .skip(skip)
//       .limit(parseInt(limit));
//     const isSearch = true;
//     return res.render('shoppage', {
//       product: products,
//       category: categories,
//       wishlistProductIds,
//       selectedSort: sort || '',
//       selectedCategory: category || '',
//       selectedPriceFrom: priceFrom || '',
//       selectedPriceTo: priceTo || '',
//       currentPage: parseInt(page),
//       totalPages,
//       search,
//       isSearch,
//     });

//   } catch (error) {
//     console.error('Error from homecontroller getfilterpage:', error);
//     return res.status(statusCode.INTERNAL_SERVER_ERROR).send('Server Error');
//   }
// };


const getfilterpage = async (req, res) => {
  const user = req.session.User;
  let search = '';

  try {
    if (!user) {
      req.session.message = "Please Login";
      return res.redirect('/login');
    }

    const { sort, category, priceFrom, priceTo, page = 1, limit = 6, search: searchQuery } = req.query;
    search = searchQuery;

    const categories = await brandschema.find({});
    let filter = { isDeleted: false, isBlocked: false };

    if (search) {
      filter.productName = { $regex: search, $options: "i" };
    }

    if (category) {
      const cat = await brandschema.findOne({ brandName: category });
      if (cat) filter.brand = cat._id;
    }

    if (priceFrom || priceTo) {
      filter.salePrice = {};
      if (priceFrom) filter.salePrice.$gte = parseInt(priceFrom);
      if (priceTo) filter.salePrice.$lte = parseInt(priceTo);
    }

    const wishlist = await wishlistSchema.findOne({ userId: user._id }).populate("Products.productId");
    const wishlistProductIds = wishlist ? wishlist.Products.map(item => item.productId._id.toString()) : [];

    let sortOption = {};
    if (sort === 'A to Z') sortOption = { productName: 1 };
    else if (sort === 'Z to A') sortOption = { productName: -1 };
    else if (sort === 'Low To High') sortOption = { salePrice: 1 };
    else if (sort === 'High To Low') sortOption = { salePrice: -1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    let products = await Product.find(filter)
      .populate("brand")
      .populate("category")
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    // Filter out products with deleted brands/categories
    products = products.filter(p => p.brand && !p.brand.isDeleted && p.category && !p.category.isDeleted);

    // Enhance with offer and final price
    const enhancedProducts = await Promise.all(
      products.map(async (p) => {
        const offer = await getBestOfferForProduct(p);
        let discount = 0;

        if (offer) {
          discount = offer.discountType === "percentage"
            ? (offer.discountValue / 100) * p.salePrice
            : offer.discountValue;

          if (offer.maxDiscount) discount = Math.min(discount, offer.maxDiscount);
        }

        return {
          ...p.toObject(),
          bestOffer: offer,
          finalPrice: p.salePrice - discount,
        };
      })
    );

    const isSearch = true;
    return res.render('shoppage', {
      product: enhancedProducts,
      category: categories,
      wishlistProductIds,
      selectedSort: sort || '',
      selectedCategory: category || '',
      selectedPriceFrom: priceFrom || '',
      selectedPriceTo: priceTo || '',
      currentPage: parseInt(page),
      totalPages,
      search,
      isSearch,
    });

  } catch (error) {
    console.error('Error from homecontroller getfilterpage:', error);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).send('Server Error');
  }
};





const getprofilepage = async (req, res) => {
  const user = req.session.User
  const finduser = await userschema.findById(user._id)
  try {
    if (req.session.message) {
      const message = req.session.message
      req.session.message = null
      return res.render('profilepage', { user: finduser, message: message })
    }
    return res.render('profilepage', { user: finduser, msg: '' })
  } catch (error) {
    console.error('error from home controller', error)
  }
}


const geteditpage = async (req, res) => {
  const user = req.session.User
  const finduser = await userschema.findById(user._id)
  try {
    res.render('editprofilepage', { user: finduser })
  } catch (error) {
    console.error('error from homecontroller geteditpage', error)
  }
}

const editprofile = async (req, res) => {
  const user = req.session.User
  const data = req.body
  const email = data.username
  req.session.email = email
  console.log(req.session.email)
  function generateotp() {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }


  async function sendVerificationEmail(email, otp) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: process.env.NODEMAILER_EMAIL,
          pass: process.env.NODEMAILER_PASSWORD
        }
      })
      const info = await transporter.sendMail({
        from: process.env.NODEMAILER_EMAIL,
        to: email,
        subject: "verify your account",
        text: `your otp is ${otp}`,
        html: `<b>your otp ${otp} </b>`,
      })
      return info.accepted.length > 0
    } catch (error) {
      console.error('error sending email', error);
      return false;
    }
  }


  try {
    if (email != user.email) {
      const otp = generateotp()
      const emailsent = await sendVerificationEmail(email, otp)
      if (!emailsent) {
        return res.json('email error')
      }
      console.log('hellow')
      req.session.userOtp = otp;
      console.log(req.session.userOtp)
      console.log('OTP Sent', otp)
      res.render('otp-checking')
    }
    else {
      try {
        const newuser = await userschema.findByIdAndUpdate(user._id, { name: data.name, email: data.email, phone: data.phone })
        await newuser.save()
        req.session.message = 'user edited successfully'
        res.redirect('/user/profile')
      } catch (error) {
        console.error('error from homecontroller', error)
      }


    }




  } catch (error) {
    console.error('error from home controller', error)
  }


}


const checkotp = async (req, res) => {
  const { otp } = req.body
  const user = req.session.User
  const newusername = req.session.email
  console.log(newusername)
  try {

    if (req.session.userOtp == otp) {
      const newuser = await userschema.findByIdAndUpdate(user._id, { email: newusername })
      await newuser.save()
      req.session.userOtp = null
      req.session.message = 'username edited successfully'
      res.json({ success: true, redirectUrl: "/profile", message: "otp successfull" })
    }
    else {
      res.status(400).json({ success: false, message: "invalid Otp please try again" })
    }



  } catch (error) {
    console.error("Error Verifying OTP", error)
    res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: "An Error Occured" })
  }


}


const addresspage = async (req, res) => {
  const user = req.session.User
  const addresses = await addressSchema.Address.find({ userId: user._id })
  console.log(addresses)
  try {
    if (req.session.message) {
      const message = req.session.message
      req.session.message = null
      return res.render('addresspage', { message, addresses })
    }
    return res.render('addresspage', { message: '', addresses })
  } catch (error) {
    console.error('error from usernameedit', error)
  }
}

const addaddress = async (req, res) => {
  try {
    if (req.session.message) {
      const message = req.session.message
      req.session.message = null
      return res.render('addaddress', { message })
    }
    return res.render('addaddress')
  } catch (error) {

  }
}

const registeraddress = async (req, res) => {
  const user = req.session.User
  const data = req.body
  console.log(user)
  try {
    const exitsaddress = await addressSchema.Address.findOne({
      userId: user._id,
      'address.addressType': data.address,
      'address.pincode': data.pincode,
      'address.City': data.city,
      'address.phone': data.phone,
      'address.altPhone': data.altphone,
      'address.state': data.state,
    })
    console.log(exitsaddress, 'exitst ad')
    // const address = await addressSchema.Address.find({userId:user._id})
    // console.log(address,'address')
    // if (address && address.length == 3) {
    //   req.session.message = 'You can only have up to 3 addresses.';
    //   return res.redirect('/user/addresspage');
    // }
    if (exitsaddress) {
      console.log('already exite')
      req.session.message = 'address already exist'
      return res.redirect('/user/addaddress')
    }
    if (user) {
      const adduser = new addressSchema.Address({
        userId: user._id,
        address: [{
          addressType: data.address,
          name: data.name,
          city: data.City,
          pincode: data.pincode,
          phone: data.phone,
          altPhone: data.altphone,
          state: data.state,
        }]
      })
      const save = await adduser.save()
      if (save) {
        req.session.message = 'address created succesfully'
        res.redirect('/user/addresspage')
      }
      else {
        req.session.message = 'addresss created failed'
        res.redirect('/user/addresspage')
      }
    }
    else {
      req.session.message = 'user not found'
      res.redirect('/user/addresspage')
    }

  } catch (error) {
    console.error('error from homecontroller regesteraddress', error)
  }
}

const editaddress = async (req, res) => {

  const user = req.session.User
  const { addressId } = req.params
  console.log(addressId)
  try {
  const userAddress = await addressSchema.Address.find({userId:user._id})
   const address = await addressSchema.Address.findOne({ _id: addressId })
  console.log(userAddress,'addresfdafa ready')
  const addressess = userAddress.map((add)=>add)
  console.log(address,"add")
  const find = addressess.some(item => item._id.toString() === address._id.toString());
  console.log(find,'find')
  console.log(addressess,'ready')
  if(find){
      res.render('editaddress', { address: address.address[0] })
  }else{
    req.session.message = "You are not authorized to use this address"
    res.redirect('/addresspage')
  }
  } catch (error) {
    console.log('error from homecontroller', error)
  }
}
const editaddresspost = async (req, res) => {
  const { addressId } = req.params
  console.log(addressId)
  const { name, state, address, City, pincode, phone, altphone } = req.body
  try {
    const result = await addressSchema.Address.updateOne(
      { "address._id": addressId }, // Match the document with the specific address ID
      {
        $set: {
          "address.$.name": name,
          "address.$.state": state,
          "address.$.addressType": address,
          "address.$.City": City,
          "address.$.pincode": pincode,
          "address.$.phone": phone,
          "address.$.altPhone": altphone
        }
      }
    );
    if (result) {
      req.session.message = 'address edited successfully'
      res.redirect('/user/addresspage')
    }
    else {
      req.session.message = 'address edited failed'
      res.redirect('/user/addresspage')
    }
  } catch (error) {
    console.log('error from homecontroller editaddresspost', error)
  }
}

const deleteaddress = async (req, res) => {
  const { addressId } = req.params
  try {
    const isdeleted = await addressSchema.Address.findByIdAndDelete(addressId)
    if (isdeleted) {
      req.session.message = 'Address deleted successfully'
      res.redirect('/user/addresspage')
    }
    else {
      req.session.message = 'Address deletion failed'
      res.redirect('/user/addresspage')
    }
  } catch (error) {
    console.error('error from home controller', error)
  }
}

// const addtocart = async(req,res)=>{
//   const { productId, quantity } = req.body;
//   console.log(productId,quantity)
//   const user = req.session.User
//   if(user){
//       const product = await Product.findOne({_id:productId})
//       const user = req.session.User
//       const isexist = await cartSchema.find({userId:user._id})
//       console.log(isexist,'isexitdsafdsafsdklfjdsaf')
//    try {
//        if(isexist.length == 0){
//          console.log('ready')
//           const newcartschema = new cartSchema({
//            userId:user._id,
//            items:[{
//              productId:product._id,
//              quantity:quantity,
//              price:product.salePrice,
//              totalPrice:product.salePrice * quantity,
//            }]
//           })
//           newcartschema.calculateTotalPrice();
//          const saved = await newcartschema.save()
//          if(saved){
//            const item =newcartschema.items.map(item=>item.productId)
//            const products = await Product.find({ _id: { $in: item } });
//            const combineddata = products.map((product,index)=>({
//              ...product._doc,
//             quantity:quantity[index]
//           }))
//               return res.json({message: 'Cart updated successfully'})
//          }

//        }else{
//          const isexist = await cartSchema.find({userId:user._id})
//              console.log(isexist,'isexist 1')
//              const item =isexist[0].items.map(item=>item.productId)
//              const product = await Product.findOne({_id:productId})
//          const includes = item.some(id=>id.toString() === product._id.toString())
//          console.log(includes)
//            if(includes != true){
//             console.log('hi')
//              isexist[0].items.push({
//                productId:product._id,
//                quantity:quantity,
//                price:product.salePrice,
//                totalPrice:product.salePrice * quantity,
//              })
//              isexist[0].calculateTotalPrice();
//            const saved = await isexist[0].save()

//            if(saved){
//              const isexist = await cartSchema.findOne({userId:user._id})
//              const item =isexist.items.map(item=>item.productId)
//              const product = await Product.findOne({_id:req.params.id})
//              const quantity = isexist.items.map(item=>item.quantity)
//              const products = await Product.find({ _id: { $in: item } });
//              const combineddata = products.map((product,index)=>({
//                ...product._doc,
//               quantity:quantity[index]
//             }))
//             return res.json({message: 'Cart updated successfully'})
//            }
//            }
//            else{
//              const user = req.session.User
//                const cart = await cartSchema.findOne({userId:user._id})
//                const product = await Product.findOne({_id:productId})
//                const item = cart.items.find(item => item.productId == productId )
//                const total = item.quantity+ parseInt(quantity)
//                item.quantity = total
//                const update = item.totalPrice = item.quantity * product.salePrice
//                cart.calculateTotalPrice()
//                await cart.save()
//                if(update){
//                  const isexist = await cartSchema.findOne({userId:user._id})
//                  const item =isexist.items.map(item=>item.productId)
//                  const quantity = isexist.items.map(item=>item.quantity)
//                  const products = await Product.find({ _id: { $in: item } });
//                  const combineddata = products.map((product,index)=>({
//                    ...product._doc,
//                   quantity:quantity[index]
//                 }))
//                 return res.json({message: 'Cart updated successfully'})
//                }
//            }

//        }

//    } catch (error) {
//      console.error('error from the homecontroller',error)
//    }

//   }
//   req.session.message = 'user not found'
//   return res.status(statusCode.OK).json({redirectUrl:'/user/login'})
// }



    const addtocart = async (req, res) => {
          const { productId, quantity } = req.body;
          const parsedQuantity = parseInt(quantity);

          if (parsedQuantity > 5) {
            return res.status(statusCode.NOT_FOUND).json({ errormessage: 'Only 5 product is allowed at a time' });
          }

          const user = req.session.User;
          if (!user) {
            req.session.message = 'User not found';
            return res.status(statusCode.OK).json({ redirectUrl: '/user/login' });
          }

          try {
            const product = await Product.findOne({ _id: productId });
            if (!product) {
              return res.status(statusCode.NOT_FOUND).json({ message: 'Product not found' });
            }

            let cart = await cartSchema.findOne({ userId: user._id });
            let wishlist = await wishlistSchema.findOne({ userId: user._id });

            if (!cart) {
              if (parsedQuantity > product.quantity) {
                return res.status(400).json({ errormessage: 'Out of Stock' });
              }
              const bestOffer = await getBestOfferForProducts(product);
              cart = new cartSchema({
                userId: user._id,
                items: [{
                  productId: product._id,
                  quantity: parsedQuantity, 
                  price: product.salePrice,
                  gstPercentage: product.Tax,
                  totalPriceWithGST: (product.salePrice * parsedQuantity) + (product.salePrice * parsedQuantity * product.Tax / 100),
                  totalPrice: product.salePrice * parsedQuantity,
                  bestOffer:bestOffer,
                }]
              });
            } else {
              const existingItem = cart.items.find(item => item.productId.toString() === productId.toString());

              if (existingItem) {
                const newTotalQuantity = existingItem.quantity + parsedQuantity;

                if (newTotalQuantity > 5) {
                  return res.status(statusCode.NOT_FOUND).json({ errormessage: 'Only 5 product is allowed at a time' });
                }

                if (newTotalQuantity > product.quantity) {
                  return res.status(400).json({ errormessage: 'Cart already reached the available stock' });
                }

                existingItem.quantity = newTotalQuantity;
                existingItem.totalPrice = newTotalQuantity * product.salePrice;
                existingItem.totalPriceWithGST = existingItem.totalPrice + (existingItem.totalPrice * product.Tax / 100);
              } else {
                if (parsedQuantity > product.quantity) {
                  return res.status(400).json({ errormessage: 'Out of Stock' });
                }
                const bestOffer = await getBestOfferForProducts(product);
                cart.items.push({
                  productId: product._id,
                  quantity: parsedQuantity,
                  price: product.salePrice,
                  gstPercentage: product.Tax,
                  totalPrice: product.salePrice * parsedQuantity,
                  totalPriceWithGST: (product.salePrice * parsedQuantity) + (product.salePrice * parsedQuantity * product.Tax / 100),
                  bestOffer:bestOffer,
                });
              }
            }

            cart.calculateGST();
            await cart.save();

            if (wishlist) {
              wishlist.Products = wishlist.Products.filter(item => !item.productId.equals(product._id));
              await wishlist.save();
            }

            return res.json({ message: 'Cart updated successfully' });

          } catch (error) {
            console.error('Error in addtocart:', error);
            return res.status(statusCode.INTERNAL_SERVER_ERROR).json({ message: 'An error occurred' });
          }
        };





// const getcart = async (req, res) => {
//   const user = req.session.User
//   try {
//     if (!user) {
//       req.session.message = 'Please login'
//       res.redirect('/user/login')
//     }
//     if (req.session.appliedCoupon && req.session.appliedCoupon.couponDiscount > 0) {
//       const isexist = await cartSchema.findOne({ userId: user._id })
//       if (isexist == null) {
//         const message = req.session.message
//         req.session.message = null
//         return res.render('addtocart', { combineddata: [], quantity: '', totalPrice: 0, totalGST: '', message, offerPrice: '', coupon })
//       }
//       const message = req.session.message;
//       req.session.message = null
//       const item = isexist.items.map(item => item.productId)
//       const quantity = isexist.items.map(item => item.quantity)
//       const products = await Product.find({ _id: { $in: item } });
//       const coupon = req.session.appliedCoupon
//       const populatedCart = await cartSchema.findOne({ userId: user._id }).populate('items.productId');
//       const offerPrices = async (products) => {
//         const discounts = await Promise.all(products.map(getTotalOffers));
//         return discounts.reduce((acc, discount) => acc + discount, 0);
//       };
//       const offerPrice = await offerPrices(products);
//       console.log(offerPrice, 'ameer offerprice')
//       req.session.offerprice = offerPrice
//       const combineddata = products.map((product, index) => ({
//         ...product._doc,
//         quantity: quantity[index]
//       }))
//       return res.render('addtocart', { combineddata: populatedCart.items, quantity, totalPrice: isexist?.totalPrice, totalGST: isexist?.totalGST, message: message, offerPrice, coupon })
//     }
//     if (req.session.message) {
//       const coupon = req.session.appliedCoupon
//       const isexist = await cartSchema.findOne({ userId: user._id })
//       if (isexist == null) {
//         const message = req.session.message
//         req.session.message = null
//         return res.render('addtocart', { combineddata: [], quantity: '', totalPrice: 0, totalGST: '', message, offerPrice: '', coupon: '' })
//       }
//       const message = req.session.message;
//       req.session.message = null
//       const item = isexist.items.map(item => item.productId)
//       const quantity = isexist.items.map(item => item.quantity)
//       const products = await Product.find({ _id: { $in: item } });
//       const populatedCart = await cartSchema.findOne({ userId: user._id }).populate('items.productId');
//       const offerPrices = async (products) => {
//         const discounts = await Promise.all(products.map(getTotalOffers));
//         return discounts.reduce((acc, discount) => acc + discount, 0);
//       };
//       const offerPrice = await offerPrices(products);
//       console.log(offerPrice, 'ameer offerprice')
//       req.session.offerprice = offerPrice
//       const combineddata = products.map((product, index) => ({
//         ...product._doc,
//         quantity: quantity[index]
//       }))
//       return res.render('addtocart', { combineddata: populatedCart.items, quantity, totalPrice: isexist?.totalPrice, totalGST: isexist?.totalGST, message: message, offerPrice, coupon: coupon || '' })
//     }

//     else {
//       const coupon = req.session.appliedCoupon?req.session.appliedCoupon:0
//       const isexist = await cartSchema.findOne({ userId: user._id })
//       if (isexist == null) {
//         return res.render('addtocart', { combineddata: [], quantity: '', totalGST: '', totalPrice: 0, offerPrice: 0, coupon: coupon || '' })
//       }
//       const item = isexist.items.map(item => item.productId)
//       const quantity = isexist.items.map(item => item.quantity)
//       console.log(quantity, 'quantity')
//       const products = await Product.find({ _id: { $in: item } });
//       console.log(products, 'products')
//       const populatedCart = await cartSchema.findOne({ userId: user._id }).populate('items.productId');
//       const offerPrices = async (products) => {
//         const discounts = await Promise.all(products.map(getTotalOffers));
//         return discounts.reduce((acc, discount, index) => acc + discount * quantity[index], 0);
//       };
//       const offerPrice = await offerPrices(products);
//       req.session.offerprice = offerPrice
//       console.log(offerPrice, "ameer ali ")
//       const combineddata = products.map((product, index) => ({
//         ...product._doc,
//         quantity: quantity[index]
//       }))
//       return res.render('addtocart', { combineddata: populatedCart.items, quantity, totalPrice: isexist?.totalPrice, totalGST: isexist?.totalGST, message: '', offerPrice, coupon: coupon || '' })
//     }



//   } catch (error) {
//     console.error('error from homecontroller', error)
//   }
// }


// const getcart = async (req, res) => {
//   const user = req.session.User;

//   try {
//     if (!user) {
//       req.session.message = 'Please login';
//       return res.redirect('/user/login');
//     }
//     if (req.session.couponUsed) {
//       req.session.appliedCoupon = null;
//       req.session.couponUsed = null;
//     }

//     const coupon = req.session.appliedCoupon || '';
//     const message = req.session.message || '';
//     req.session.message = null;

//     if (req.session.appliedCoupon) {
//       req.session.couponUsed = true;
//     }

//     const isexist = await cartSchema.findOne({ userId: user._id });
//     const coupons = await couponSchema.find({})
//     console.log(coupons,'coupons')
//     if (!isexist) {
//       return res.render('addtocart', {
//         combineddata: [],
//         quantity: '',
//         totalPrice: 0,
//         totalGST: '',
//         message,
//         offerPrice: 0,
//         coupon,
//         coupons,
//       });
//     }

//     const items = isexist.items.map(item => item.productId);
//     const quantity = isexist.items.map(item => item.quantity);
//     const products = await Product.find({ _id: { $in: items } });

//     const populatedCart = await cartSchema.findOne({ userId: user._id }).populate('items.productId');

//     const offerPrices = async (products) => {
//       const discounts = await Promise.all(products.map(getTotalOffers));
//       return discounts.reduce((acc, discount, index) => acc + discount * quantity[index], 0);
//     };

//     const offerPrice = await offerPrices(products);
//     req.session.offerprice = offerPrice;

//     return res.render('addtocart', {
//       combineddata: populatedCart.items,
//       quantity,
//       totalPrice: isexist?.totalPrice,
//       totalGST: isexist?.totalGST,
//       message,
//       offerPrice,
//       coupon,
//       coupons,
//     });

//   } catch (error) {
//     console.error('error from homecontroller', error);
//   }
// };

// const getcart = async (req, res) => {
//   const user = req.session.User;

//   try {
//     if (!user) {
//       req.session.message = 'Please login';
//       return res.redirect('/user/login');
//     }
//     if (req.session.couponUsed) {
//       req.session.appliedCoupon = null;
//       req.session.couponUsed = null;
//     }

//     const coupon = req.session.appliedCoupon || '';
//     const message = req.session.message || '';
//     req.session.message = null;

//     if (req.session.appliedCoupon) {
//       req.session.couponUsed = true;
//     }

//     const isexist = await cartSchema.findOne({ userId: user._id });

//     if (!isexist) {
//       return res.render('addtocart', {
//         combineddata: [],
//         quantity: '',
//         totalPrice: 0,
//         totalGST: '',
//         message,
//         offerPrice: 0,
//         coupon,
//         coupons: [],
//       });
//     }

//     const items = isexist.items.map(item => item.productId);
//     const quantity = isexist.items.map(item => item.quantity);

//     const products = await Product.find({ _id: { $in: items } });
//     const populatedCart = await cartSchema.findOne({ userId: user._id }).populate('items.productId');
//     // const offerPrices = async (products) => {
//     //   const discounts = await Promise.all(products.map(getTotalOffers)); // Assume you have getTotalOffers()
//     //   return discounts.reduce((acc, discount, index) => acc + discount * quantity[index], 0);
//     // };
    
//     const offerPrices = async (products, productQuantityMap) => {
//       const discounts = await Promise.all(products.map(getTotalOffers));
    
//       return discounts.reduce((acc, discount, index) => {
//         const productId = products[index]._id.toString();
//         const quantity = productQuantityMap.get(productId) || 0;
//         return acc + discount * quantity;
//       }, 0);
//     };
    
//     console.log(offerPrices,'offerprice ameer ali vk')
//     const offerPrice = await offerPrices(products);
//     req.session.offerprice = offerPrice;

//     const now = new Date();
//     const categoryIds = products.map(p => p.category?.toString());
//     const brandIds = products.map(p => p.brand?.toString());
//     const productIds = products.map(p => p._id.toString());

//     const matchingCoupons = await couponSchema.find({
//       status: true,
//       expiredOn: { $gte: now },
//       userId: { $ne: user._id },
//       $or: [
//         { appliesTo: "all" },
//         { appliesTo: "category", categoryId: { $in: categoryIds } },
//         { appliesTo: "brand", brandId: { $in: brandIds } },
//         { appliesTo: "product", productId: { $in: productIds } }
//       ]
//     });
//     const validCoupons = matchingCoupons.filter(coupon => {
//       return isexist.totalPrice >= coupon.minimumPrice;
//     });

//     return res.render('addtocart', {
//       combineddata: populatedCart.items,
//       quantity,
//       totalPrice: isexist.totalPrice,
//       totalGST: isexist.totalGST,
//       message,
//       offerPrice,
//       coupon,
//       coupons: validCoupons,
//     });

//   } catch (error) {
//     console.error('Error in getcart controller:', error);
//     res.status(statusCode.INTERNAL_SERVER_ERROR).send("Server error");
//   }
// };
const getcart = async (req, res) => {
  const user = req.session.User;

  try {
    if (!user) {
      req.session.message = 'Please login';
      return res.redirect('/user/login');
    }

    // if (req.session.couponUsed) {
    //   req.session.appliedCoupon = null;
    //   req.session.couponUsed = null;
    // }

    // let coupon = req.session.appliedCoupon || '';
    const message = req.session.message || '';
    req.session.message = null;
    if (req.session.appliedCoupon) {
      req.session.couponUsed = true;
    }

    let coupon=''
    console.log("first",coupon)
    if(req.session.appliedCoupon){
      coupon=req.session.appliedCoupon
    }
    const isexist = await cartSchema.findOne({ userId: user._id });

    if (!isexist) {
      return res.render('addtocart', {
        combineddata: [],
        quantity: '',
        totalPrice: 0,
        totalGST: '',
        message,
        offerPrice: 0,
        coupon,
        coupons: [],
      });
    }

    const items = isexist.items.map(item => item.productId);
    const quantity = isexist.items.map(item => item.quantity);

    const products = await Product.find({ _id: { $in: items } });
    const populatedCart = await cartSchema.findOne({ userId: user._id }).populate('items.productId');
    const productQuantityMap = new Map();
    isexist.items.forEach(item => {
      productQuantityMap.set(item.productId.toString(), item.quantity);
    });
    const offerPrices = async (products, productQuantityMap) => {
      const discounts = await Promise.all(products.map(getTotalOffers));

      return discounts.reduce((acc, discount, index) => {
        const productId = products[index]._id.toString();
        const quantity = productQuantityMap.get(productId) || 0;
        return acc + discount * quantity;
      }, 0);
    };

    const offerPrice = await offerPrices(products, productQuantityMap);
    req.session.offerprice = offerPrice;

    // 🎟 Coupon logic
    const now = new Date();
    const categoryIds = products.map(p => p.category?.toString());
    const brandIds = products.map(p => p.brand?.toString());
    const productIds = products.map(p => p._id.toString());

    const matchingCoupons = await couponSchema.find({
      status: true,
      expiredOn: { $gte: now },
      userId: { $ne: user._id },
      $or: [
        { appliesTo: "all" },
        { appliesTo: "category", categoryId: { $in: categoryIds } },
        { appliesTo: "brand", brandId: { $in: brandIds } },
        { appliesTo: "product", productId: { $in: productIds } }
      ]
    });

    const validCoupons = matchingCoupons.filter(coupon => {
      return isexist.totalPrice >= coupon.minimumPrice;
    });
     const updatedItems = await Promise.all(
      populatedCart.items.map(async (item) => {
        const product = await Product.findById(item.productId);
        const offer = await getBestOfferForProduct(product);
        console.log(offer,'offer,a,,')
        item.bestOffer = offer.discountValue
        return item;
      })
    );
     populatedCart.items = updatedItems;
    // 🛒 Render cart page
    console.log(offerPrice,'offerpordsaofiasdjf')
    return res.render('addtocart', {
      combineddata: populatedCart.items,
      quantity,
      totalPrice: isexist.totalPrice,
      totalGST: isexist.totalGST,
      message,
      offerPrice,
      coupon,
      coupons: validCoupons,
    });

  } catch (error) {
    console.error('Error in getcart controller:', error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send("Server error");
  }
};


const updatequantity = async (req, res) => {
  const quantity = parseInt(req.body.quantity);
  console.log(quantity,'quantity')
  const id = req.body.productId;
  const user = req.session.User;

  try {
    
    let cart = await cartSchema.findOne({ userId: user._id });

    if (!cart) {
      return res.status(statusCode.NOT_FOUND).json({ success: false, message: "Cart not found" });
    }

    const item = cart.items.find(item => item._id == id);
     
    if (!item) {
      return res.status(statusCode.NOT_FOUND).json({ success: false, message: "Item not found in cart" });
    }
    item.quantity = quantity;
    item.totalPrice = item.quantity * item.price;

    cart.calculateGST();
    await cart.save();

    cart = await cartSchema.findOne({ userId: user._id });

    const productQuantityMap = new Map(cart.items.map(item => [item.productId.toString(), item.quantity]));

    const products = await Product.find({ _id: { $in: [...productQuantityMap.keys()] } });

    const total = cart.calculateTotalPrice();
    const totalGST = cart.calculateGST();
    const offerPrices = async () => {
      const discounts = await Promise.all(products.map(async (product) => {
        const discount = await getTotalOffers(product);
        const productQuantity = productQuantityMap.get(product._id.toString()) || 0;
        return discount * productQuantity;
      }));

      return discounts.reduce((acc, discount) => acc + discount, 0);
    };
    const offerprice = await offerPrices();
    req.session.offerprice = offerprice
    const coupon = req.session.appliedCoupon || '';
    console.log(coupon,'here the coupond')
    res.status(statusCode.OK).json({ success: true, total, totalGST, offerprice, coupon:coupon.couponDiscount});
  } catch (error) {
    console.error("Error from updatequantity:", error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal Server Error" });
  }
};


const getUserCartOfferPrice = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) return 0;

  const cart = await Cart.findOne({ userId }).populate('items.productId');
  if (!cart || cart.items.length === 0) return 0;

  const products = cart.items.map(item => item.productId);
  const productQuantityMap = new Map(
    cart.items.map(item => [item.productId._id.toString(), item.quantity])
  );

  const discounts = await Promise.all(products.map(getTotalOffers));
  const totalOffer = discounts.reduce((acc, discount, index) => {
    const productId = products[index]._id.toString();
    const quantity = productQuantityMap.get(productId) || 0;
    return acc + discount * quantity;
  }, 0);
  return totalOffer;
};


const checkoutpage = async (req, res) => {
  const userid = req.session.User;
  if (!userid) {
    req.session.message = 'Please login';
    return res.redirect('/user/login');
  }
  const cart = await cartSchema.findOne({ userId: userid._id })
  try {
    const orderDate = new Date()
    const estimatedDelivery = new Date(orderDate);
    estimatedDelivery.setDate(orderDate.getDate() + 7);
    if(!cart){
      req.session.message = "order Placed No more orderes Remaining"
      return res.redirect('/user/getcart')
    }
    const total = cart.calculateTotalPrice();
    let coupon = 0;
    if (req.session.appliedCoupon) {
      console.log(req.session.appliedCoupon,'applied coupon')
      const couponId = req.session.appliedCoupon.couponId
      const couponfind = await couponSchema.findOne({ _id: new mongoose.Types.ObjectId(couponId)});
      if(!couponfind){
        req.session.appliedCoupon = null
        req.session.message = "NO Coupon Found"
        return res.redirect('/user/getcart')
      }
      else if(total < couponfind?.minimumPrice){
        req.session.appliedCoupon = null
        req.session.message = "The coupon was removed as minimum price is not met."
        return res.redirect('/user/getcart')
      }
      const appliedCoupon = req.session.appliedCoupon;
      const effectiveTotal = total;
      if (effectiveTotal >= appliedCoupon.minimumPrice) {
        coupon = appliedCoupon.couponDiscount;
      } else {
        req.session.appliedCoupon = null
        coupon = 0;
        req.session.message = "The coupon was removed as minimum price is not met."
        return res.redirect('/user/getcart')
      }
    }
    if (cart) {
      const user = await userschema.find({ _id: userid._id, isBlocked: false });
      if (user.length === 0) {
        req.session.message = 'User is blocked';
        return res.redirect('/user/login');
      }

      // Fetch the user's populated cart
      const populatedCart = await cartSchema
        .findOne({ userId: userid._id })
        .populate('items.productId');
      if (populatedCart.items.length == 0) {
        req.session.message = 'Cart is empty';
        return res.redirect('/user/getcart');
      }

      // Check each product in the cart
      for (const item of populatedCart.items) {
        const product = item.productId;
        if (product.isBlocked) {
          req.session.message = `${item.productId.productName} is blocked by admin`;
          return res.redirect('/user/getcart');
        }

        if (product.quantity === 0) {
          req.session.message = `${item.productId.productName} is currently out of stock. Please remove it from your cart to proceed.`;
          return res.redirect('/user/getcart');
        }
        if (item.quantity > product.quantity) {
          req.session.message = `please decrease the quantity of the ${product.productName}`
          return res.redirect('/user/getcart')

        }
        if (product.isDeleted) {
          req.session.message = `${item.productId.productName} is deleted by admin`;
          return res.redirect('/user/getcart');
        }
      }
      if (req.session.message) {
        const message = req.session.message
        req.session.message = null
        const cart = await cartSchema.findOne({ userId: userid._id }).populate('items.productId')
        const product = cart.items.map(item => item.productId)
        const total = cart.totalPrice
        const totalGST = cart.totalGST
        const address = await addressSchema.Address.find({ userId: userid._id })
        const addresses = address.map(address => address.address)
        // const offerPrice = req.session.offerprice
        const offerPrice = await getUserCartOfferPrice(userid._id)
        console.log(offerPrice, 'offerameer')
        return res.render('checkoutpage', { product, total, totalGST, address: addresses, message, offerPrice, coupon ,estimatedDelivery });
      }
      const cart = await cartSchema.findOne({ userId: userid._id }).populate('items.productId')
      const product = cart.items.map(item => item)
      const total = cart.totalPrice
      const totalGST = cart.totalGST
      const address = await addressSchema.Address.find({ userId: userid._id })
      const addresses = address.map(address => address.address)
      // const offerPrice = req.session.offerprice
      const offerPrice = await  getUserCartOfferPrice(userid._id)
      console.log(offerPrice, 'offerameer')
      return res.render('checkoutpage', { product, total, totalGST, address: addresses, offerPrice, coupon , estimatedDelivery });


    }
    else {
      console.log('yes reay')
      req.session.message = 'cart is empty'
      return res.redirect('/user/getcart')
    }

  } catch (error) {
    console.error('Error in checkout page:', error);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).send('An error occurred.');
  }
};

const deletecartbutton = async (req, res) => {
  const productId = req.params.productId;
  const user = req.session.User;

  try {
    let cart = await cartSchema.findOne({ userId: user._id });
    
    if (!cart) {
      return res.status(statusCode.NOT_FOUND).json({ success: false, message: "Cart not found" });
    }
    cart.items = cart.items.filter(item => item.productId.toString() !== productId);

    cart.calculateGST();
    await cart.save();
    cart = await cartSchema.findOne({ userId: user._id });
    if (cart.items.length === 0) {
      req.session.appliedCoupon = null
      return res.json({
        success: true,
        cartTotal: 0,
        carttotalGST: 0,
        offerPrice: 0,
        message: "Cart is now empty",
      });
    }
    const productQuantityMap = new Map(cart.items.map(item => [item.productId.toString(), item.quantity]));

    const products = await Product.find({ _id: { $in: [...productQuantityMap.keys()] } });

    const cartTotal = cart.calculateTotalPrice();
    const cartGST = cart.calculateGST();
    const offerPrices = async () => {
      const discounts = await Promise.all(products.map(async (product) => {
        const discount = await getTotalOffers(product);
        const productQuantity = productQuantityMap.get(product._id.toString()) || 0;
        return discount * productQuantity;
      }));

      return discounts.reduce((acc, discount) => acc + discount, 0);
    };

    const offerPrice = await offerPrices();
    req.session.offerprice = offerPrice
    let coupon = 0;
    if (req.session.appliedCoupon) {
      const appliedCoupon = req.session.appliedCoupon;

      // Collect remaining brand and category IDs from products
      const remainingBrandIds = products.map(p => p.brand.toString());
      const remainingCategoryIds = products.map(p => p.category.toString());

      const isValid =
        (!appliedCoupon.brand || remainingBrandIds.includes(appliedCoupon.brand)) &&
        (!appliedCoupon.category || remainingCategoryIds.includes(appliedCoupon.category));

      if (!isValid) {
        coupon = 0;
      } else {
        console.log('hed dasfmdaflaf dfiasf')
        coupon = appliedCoupon.couponDiscount;
      }
    }
    res.json({
      success: true,
      cartTotal,
      carttotalGST: cartGST,
      offerPrice,
      coupon,
    });

  } catch (error) {
    console.error("Error from deletecartbutton:", error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal Server Error" });
  }
};


const searchmain = async (req, res) => {
  try {
    const searchval = req.query.query
    const results = await Product.find({
      productName: { $regex: searchval, $options: 'i' }
    });
    if (results) {
      res.json({ success: true, products: results });
    }
    else {
      res.json({ success: true, products: [] });
    }


  } catch (error) {

  }
}
const paymentpage = async (req, res) => {
  const user = req.session.User
  const data = req.body
  console.log(data, 'this is what i wnd')
  const User = await userschema.findOne({ _id: user._id, isBlocked: false })
  console.log(User, 'User')
  try {
    if (!User) {
      req.session.message = 'Please Login'
      return res.redirect('/user/login')
    }
    if (user && req.body.useNewAddress === 'true') {
      const exitsaddress = await addressSchema.Address.findOne({
        userId: user._id,
        'address.addressType': data.address,
        'address.pincode': data.pincode,
        'address.city': data.city,
        'address.phone': data.phone,
        'address.altPhone': data.altphone,
        'address.state': data.state,
      })
      if (exitsaddress) {
        req.session.message = 'address already exist'
        return res.redirect('/user/checkoutpage')
      }
      else {
        const adduser = new addressSchema.Address({
          userId: user._id,
          address: [{
            addressType: data.address,
            name: data.name,
            city: data.city,
            pincode: data.pincode,
            phone: data.phone,
            altPhone: data.altphone,
            state: data.state,
          }]
        })
        console.log(adduser, 'useradd')
        const save = await adduser.save()
        req.session.newaddress = save.address[0]._id
        console.log(req.session.newaddress,'new address ======')
        if (save) {
         return res.redirect('/user/getpaymentpage')
        }
        else {
          req.session.message = 'addresss created failed'
         return res.redirect('/user/addresspage')
        }
      }

    }
    if (user) {
      req.session.address = data.selectedAddress
      console.log(data.selectedAddress,'selected address')
      res.redirect('/user/getpaymentpage')
    }
    else {
      req.session.message = 'user not found'
      res.redirect('/user/addresspage')
    }
  } catch (error) {
    console.log(error)
  }
}

const getpaymentpage = async (req, res) => {
  const user = req.session.User
  try {
    console.log('hi al')
    const wallet = await walletSchema.findOne({userId:user._id})
    const walletbalance = wallet?.WalletTotal
    const cart = await cartSchema.findOne({userId:user._id})
    let coupons = 0;
    if (req.session.appliedCoupon) {
      const appliedCoupon = req.session.appliedCoupon;
      const effectiveTotal = cart.totalPrice;

      if (effectiveTotal >= appliedCoupon.minimumPrice) {
        coupons = appliedCoupon.couponDiscount;
      } else {
        coupons = 0;
        req.session.message = "The coupon was removed as minimum price is not met."
        return res.redirect('/user/getcart')
      }
    }
    const offerPrice = await getUserCartOfferPrice(user._id);
    const subtotal = cart.totalPrice
    if(!cart){
      req.session.message = "There is no cart to Proceed"
      return res.redirect('/user/getcart')
    }
    if (req.session.message) {
      const message = req.session.message
      req.session.message = null
      return res.render('paymentpage', { message,offerPrice,subtotal,coupon:coupons ,walletbalance : walletbalance || 0 })
    }
    return res.render('paymentpage',{offerPrice,subtotal,coupon:coupons ,walletbalance : walletbalance || 0})
  } catch (error) {
     console.log('error from getpayment page',error)
  }
}
const orderplacedpage = async (req, res) => {
  console.log('orderpalced page')
  const user = req.session.User
  const payment = req.body.paymentMethod
  const isexit = await userschema.find({ _id: user._id, isBlocked: false })
  const items = await cartSchema.findOne({ userId: user._id }).populate('items.productId')
  const offerPrice = await getUserCartOfferPrice(user._id);
  try {
    if (payment === 'cash') {
      console.log('caghtdasdafdsaf',req.session.appliedCoupon)
      if (isexit.length > 0) {
        console.log('ready')
        if(items?.totalPrice >= 1000){
          req.session.message = "Above 1000 is not allowed for the Cash ON Delivery"
          return res.redirect('/user/getpaymentpage')
        }
        if (req.session.address) {
          console.log('hi')
          const coupon = req.session.appliedCoupon 
          if(coupon && coupon.couponId){
            const id = coupon?.couponId
            const find = await couponSchema.findOne({_id:id})
            if(!find){
              req.session.appliedCoupon = null;
            req.session.message = "Coupon Not Found"
            return res.redirect('/user/getpaymentpage')
            
            }
          }
          if (req.session.appliedCoupon && req.session.appliedCoupon?.couponId) {
            try {
              const couponfind = await couponSchema.findById(req.session.appliedCoupon?.couponId);
              console.log(couponfind, 'coupon ameer');
        
              if (couponfind) {
              
                const orderededuser = await cartSchema.findOne({ userId: user._id }).populate('items.productId')
                console.log(orderededuser,'useramm')
                const invalidItems = orderededuser.items.filter(item =>
                  item.productId?.isDeleted === true || item.productId?.quantity < item.quantity
                );
                console.log(invalidItems,'invalid items1')
                if (invalidItems.length > 0) {
                  console.log('hi')
                  req.session.message = "Some products are out of stock or unavailable";
                   return res.redirect('/user/getcart')
                }
                const totalPrice = orderededuser.totalPrice
                const totalGST = orderededuser.totalGST
                const addressId = new mongoose.Types.ObjectId(req.session.address);
                const address = await addressSchema.Address.findOne({'address._id':addressId });
                console.log(address.address,'addresdaf +++++')
                req.session.address = null
                // const orderedItems = orderededuser.items.map(item => ({
                //   product: item.productId,
                //   quantity: item.quantity,
                //   price: item.price,
                // }))
                const orderedItems = await Promise.all(
                  orderededuser.items.map(async (item) => {
                    const productDoc = await Product.findById(item.productId || item.product);
                    const bestOffer = await getBestOfferForProducts(productDoc);
                    return {
                      product: productDoc._id,
                      quantity: item.quantity,
                      price: item.price,
                      bestOffer: bestOffer || 0,
                    };
                  })
                );
                const newOrder = new orderSchema({
                  userId: user._id,
                  paymentMethod: 'Cash ON Delivery',
                  totalGST: totalGST,
                  orderedItems: orderedItems,
                  totalPrice: totalPrice,
                  finalAmount: totalPrice,
                  address: address.address[0],
                  status: "Pending", // Default status is 'Pending' if not provided
                  invoiceDate: new Date(),
                  couponApplied:!!req.session.appliedCoupon ,
                  couponId:req.session.appliedCoupon?.couponId,
                  discount: offerPrice ,
                  couponDiscount: req.session.appliedCoupon?.couponDiscount || 0|| 0,
                });
                updateQuantities(orderededuser.items)
                const saved = await newOrder.save();
                couponfind.userId.push(user._id);
                await couponfind.save();
                await cartSchema.deleteOne({ userId: user._id });
                req.session.order = saved.orderId
                return res.redirect('/user/paymentsuccesspage')
              }
            } catch (err) {
              console.error('Error fetching or saving coupon:', err);
            }
          }
          else{
            const orderededuser = await cartSchema.findOne({ userId: user._id }).populate('items.productId')
            const invalidItems = orderededuser.items.filter(item =>
              item.productId?.isDeleted === true || item.productId?.quantity < item.quantity
            );
            console.log(invalidItems,'invalid items2')
            if (invalidItems.length > 0) {
              console.log('hi')
              req.session.message = "Some products are out of stock or unavailable";
               return res.redirect('/user/getcart')
            }
            const totalPrice = orderededuser.totalPrice
            const totalGST = orderededuser.totalGST
            const addressId = new mongoose.Types.ObjectId(req.session.address);
            const address = await addressSchema.Address.findOne({'address._id':addressId });
            console.log(address.address,'addresdaf +++++')
            req.session.address = null
            // const orderedItems = orderededuser.items.map(item => ({
            //   product: item.productId,
            //   quantity: item.quantity,
            //   price: item.price,
            // }))
            const orderedItems = await Promise.all(
              orderededuser.items.map(async (item) => {
                const productDoc = await Product.findById(item.productId || item.product);
                const bestOffer = await getBestOfferForProducts(productDoc);
                return {
                  product: productDoc._id,
                  quantity: item.quantity,
                  price: item.price,
                  bestOffer: bestOffer || 0,
                };
              })
            );
            
            const newOrder = new orderSchema({
              userId: user._id,
              paymentMethod: 'Cash ON Delivery',
              totalGST: totalGST,
              orderedItems: orderedItems,
              totalPrice: totalPrice,
              finalAmount: totalPrice,
              address: address.address[0],
              status: "Pending", // Default status is 'Pending' if not provided
              invoiceDate: new Date(),
              couponApplied:!!req.session.appliedCoupon ,
              couponId:req.session.appliedCoupon?.couponId,
              discount: offerPrice,
              couponDiscount: req.session.appliedCoupon?.couponDiscount || 0|| 0,
            });
            updateQuantities(orderededuser.items)
            const saved = await newOrder.save();
            if (saved) {
              req.session.offerprice = null
              // const couponfind = await couponSchema.findById(req.session.appliedCoupon.couponId)
              // console.log(couponfind, 'coupon ameer')
              // couponfind.userId.push(user._id)
              // await couponfind.save()
              if (items) {
                req.session.order = saved.orderId
                const remove = await cartSchema.deleteOne({ userId: user._id })
                return res.redirect('/user/paymentsuccesspage')
              }
              else {
                return res.redirect('/user/getcart')
              }
  
            }
          }

        }
        else {
          const orderededuser = await cartSchema.findOne({ userId: user._id }).populate('items.productId')
          const invalidItems = orderededuser.items.filter(item =>
            item.productId?.isDeleted === true || item.productId?.quantity < item.quantity
          );
          console.log(invalidItems,'invalid items3')
          if (invalidItems.length > 0) {
            console.log('hi')
            req.session.message = "Some products are out of stock or unavailable";
             return res.redirect('/user/getcart')
          }
          if (orderededuser) {
            const totalPrice = orderededuser.totalPrice
          }
          else {
            return res.redirect('/user/getcart')
          }
          const address = await addressSchema.Address.findOne({'address._id':req.session.newaddress})
          // req.session.newaddress = null
          const totalPrice = orderededuser.totalPrice
          const totalGST = orderededuser.totalGST
          const couponfind = await couponSchema.findById(req.session.appliedCoupon?.couponId)
          const coupon = req.session.appliedCoupon 
          if(coupon && coupon.couponId){
            const id = coupon?.couponId
            const find = await couponSchema.findOne({_id:id})
            if(!find){
              req.session.appliedCoupon = null;
            req.session.message = "Coupon Not Found"
            return res.redirect('/user/getpaymentpage')
            
            }
          }
          // const orderedItems = orderededuser.items.map(item => ({
          //   product: item.productId,
          //   quantity: item.quantity,
          //   price: item.price,
          // }))
          const orderedItems = await Promise.all(
            orderededuser.items.map(async (item) => {
              const productDoc = await Product.findById(item.productId || item.product);
              const bestOffer = await getBestOfferForProducts(productDoc);
              return {
                product: productDoc._id,
                quantity: item.quantity,
                price: item.price,
                bestOffer: bestOffer || 0,
              };
            })
          );
          
          const newOrder = new orderSchema({
            userId: user._id,
            orderedItems: orderedItems,
            totalGST: totalGST,
            totalPrice: totalPrice,
            finalAmount: totalPrice,
            address: address.address[0],
            status: "Pending",
            invoiceDate: new Date(),
            couponApplied:!!req.session.appliedCoupon,
            couponId:req.session.appliedCoupon?.couponId,
            discount: offerPrice,
            couponDiscount:req.session.appliedCoupon?.couponDiscount || 0,
          });
          await newOrder.save();
          updateQuantities(orderededuser.items)
          req.session.offerprice = null
          await cartSchema.deleteOne({ userId: user._id });
          return res.redirect('/user/paymentsuccesspage')
          if(couponfind){
            console.log(couponfind, 'coupon ameer')
            couponfind.userId.push(user._id)
            await couponfind.save()
            return res.redirect('/user/paymentsuccesspage')
          }
        }
      }
      else {
        req.session.message = 'user Not found'
        return res.redirect('/user/login')
      }

    }
    else if (payment === 'wallet') {
      if (isexit.length > 0) {
        if (req.session.address) {
          console.log('121')
          const orderededuser = await cartSchema.findOne({ userId: user._id }).populate('items.productId')
          const invalidItems = orderededuser.items.filter(item =>
            item.productId?.isDeleted === true || item.productId?.quantity < item.quantity
          );
          console.log(invalidItems,'invalid items4')
          if (invalidItems.length > 0) {
            console.log('hi')
            req.session.message = "Some products are out of stock or unavailable";
             return res.redirect('/user/getcart')
          }
          const totalPrice = orderededuser.totalPrice
          const totalGST = orderededuser.totalGST
          // const orderedItems = orderededuser.items.map(item => ({
          //   product: item.productId,
          //   quantity: item.quantity,
          //   price: item.price,
          // }))
          const orderedItems = await Promise.all(
            orderededuser.items.map(async (item) => {
              const productDoc = await Product.findById(item.productId || item.product);
              const bestOffer = await getBestOfferForProducts(productDoc);
              return {
                product: productDoc._id,
                quantity: item.quantity,
                price: item.price,
                bestOffer: bestOffer || 0,
              };
            })
          );
          
          const totalAmount = (totalPrice) - (req.session.offerprice ? req.session.offerprice : 0) -(req.session.Coupon?req.session.Coupon:req.session.appliedCoupon?.couponDiscount||0)
          const findwallet = await walletSchema.findOne({ userId: user._id })
          console.log(req.session.address,'address sdfa')
          const addressId = new mongoose.Types.ObjectId(req.session.address);
          const address = await addressSchema.Address.findOne({'address._id':addressId });
          console.log(address.address,'addresdaf +++++')

          req.session.address = null
          if (findwallet && findwallet.WalletTotal >= totalAmount) {
            const newOrder = new orderSchema({
              userId: user._id,
              paymentMethod: 'Wallet Transfer',
              totalGST: totalGST,
              orderedItems: orderedItems,
              totalPrice: totalPrice,
              finalAmount: totalPrice,
              address: address.address[0],
              status: "Pending", // Default status is 'Pending' if not provided
              invoiceDate: new Date(),
              couponApplied:!!req.session.appliedCoupon,
              couponId:req.session.appliedCoupon?.couponId,
              discount: offerPrice,
              couponDiscount:req.session.appliedCoupon?.couponDiscount || 0,
            });
            const saved = await newOrder.save()
            const orderededuser = await cartSchema.findOne({ userId: user._id }).populate('items.productId')
            const invalidItems = orderededuser.items.filter(item =>
              item.productId?.isDeleted === true || item.productId?.quantity < item.quantity
            );
            console.log(invalidItems,'invalid items5')
            if (invalidItems.length > 0) {
              console.log('hi')
              req.session.message = "Some products are out of stock or unavailable";
               return res.redirect('/user/getcart')
            }
            updateQuantities(orderededuser.items)
            findwallet.transaction.push({
              Total: totalAmount,
              Type: 'Debit',
              description: 'amount debited from wallet',
              orderId:saved._id,
            })
            req.session.order = saved.orderId
            if(req.session.appliedCoupon){
              const couponfind = await couponSchema.findById(req.session.appliedCoupon?.couponId)
              console.log(couponfind, 'coupon ameer')
              couponfind.userId.push(user._id)
              await couponfind.save()
            }
            await cartSchema.findOneAndDelete({userId:user._id})
            res.redirect('/user/paymentsuccesspage')
            await findwallet.calculateWalletTotal()
            await findwallet.save()
            
          }
          else {
            req.session.message = "wallet is empty or Insufficient Amount"
            return res.redirect('/user/getcart')
          }

        }
        else  {
          console.log('12,33')
          const orderededuser = await cartSchema.findOne({ userId: user._id }).populate('items.productId')
          const invalidItems = orderededuser.items.filter(item =>
            item.productId?.isDeleted === true || item.productId?.quantity < item.quantity
          );
          console.log(invalidItems,'invalid items6')
          if (invalidItems.length > 0) {
            console.log('hi')
            req.session.message = "Some products are out of stock or unavailable";
             return res.redirect('/user/getcart')
          }
          if (orderededuser) {
            const totalPrice = orderededuser.totalPrice
          }
          else {
            return res.redirect('/user/getcart')
          }
          const address = await addressSchema.Address.findOne({'address._id':req.session.newaddress})
          const couponfind = await couponSchema.findById(req.session.appliedCoupon?.couponId)
          const coupon = req.session.appliedCoupon 
          if(coupon && coupon.couponId){
            const id = coupon?.couponId
            const find = await couponSchema.findOne({_id:id})
            if(!find){
              req.session.appliedCoupon = null;
            req.session.message = "Coupon Not Found"
            return res.redirect('/user/getpaymentpage')
            
            }
          }
          
          // req.session.newaddress = null
          const totalPrice = orderededuser.totalPrice
          const totalGST = orderededuser.totalGST
          // const orderedItems = orderededuser.items.map(item => ({
          //   product: item.productId,
          //   quantity: item.quantity,
          //   price: item.price,
          // }))
          const orderedItems = await Promise.all(
            orderededuser.items.map(async (item) => {
              const productDoc = await Product.findById(item.productId || item.product);
              const bestOffer = await getBestOfferForProducts(productDoc);
              return {
                product: productDoc._id,
                quantity: item.quantity,
                price: item.price,
                bestOffer: bestOffer || 0,
              };
            })
          );
          
          // const totalAmount = (totalPrice) - (req.session.offerprice ? req.session.offerprice : 0)
          const totalAmount = (totalPrice) - (req.session.offerprice ? req.session.offerprice : 0) -(req.session.Coupon?req.session.Coupon:req.session.appliedCoupon?.couponDiscount||0)
          const findwallet = await walletSchema.findOne({ userId: user._id })
          if (findwallet && findwallet.WalletTotal >= totalAmount) {
          const newOrder = new orderSchema({
            userId: user._id,
            paymentMethod: 'wallet Transfer',
            orderedItems: orderedItems,
            totalGST: totalGST,
            totalPrice: totalPrice,
            finalAmount: totalPrice,
            address: address.address[0],
            status: "Pending",
            invoiceDate: new Date(),
            couponApplied: false,
            discount: offerPrice,
          });
         const saved = await newOrder.save();
          updateQuantities(orderededuser.items)
          findwallet.transaction.push({
            Total: totalAmount,
            Type: 'Debit',
            description: 'amount debited from wallet',
            orderId:saved._id,
          })
          await findwallet.calculateWalletTotal()
          await findwallet.save()
          req.session.offerprice = null
          if(req.session.appliedCoupon){
            const couponfind = await couponSchema.findById(req.session.appliedCoupon?.couponId)
            console.log(couponfind, 'coupon ameer')
            couponfind.userId.push(user._id)
            await couponfind.save()
          }
          await cartSchema.findOneAndDelete({userId:user._id})
          req.session.order = saved.orderId
          res.redirect('/user/paymentsuccesspage')
        }
        else {
          req.session.message = "wallet is empty or Insufficient Amount"
          return res.redirect('/user/getcart')
        }
        }
      }
      else {
        req.session.message = 'user Not found'
        return res.redirect('/user/login')
      }
    
    }

  } catch (error) {
    console.error('error from homecontroller', error)
  }
}

async function updateQuantities(items) {
  for (const item of items) {
    const productId = item.productId;
    const decrementQuantity = item.quantity;

    try {
      await Product.findByIdAndUpdate(
        productId,
        { $inc: { quantity: -decrementQuantity } },
        { new: true }
      );
      console.log(`Updated product ${productId}: reduced quantity by ${decrementQuantity}`);
    } catch (err) {
      console.error(`Failed to update product ${productId}:`, err);
    }
  }
}
const getpaymentsuccesspage = async (req, res) => {
  console.log('1 hi')
  const user = req.session.User
  const orderid = req.session.order
  console.log(orderid, 'orderid1')
  console.log(req.session.appliedCoupon,req.session.Coupon,'coupon')
  let coupon = req.session.appliedCoupon?.couponDiscount || req.session.Coupon || 0

  try {
    if (orderid) {
      console.log(orderid,'orderid')
      console.log('2 hi')
      req.session.orderId = null
      const orderdetails = await orderSchema.findOne({ orderId: orderid})
      coupon = orderdetails?.couponDiscount
      console.log(orderdetails,'orderdetals')
      const offer = orderdetails.discount
      console.log(offer,"offer",coupon,"coupon")
      req.session.newaddress = null
      req.session.appliedCoupon = null
      req.session.Coupon = null
      res.render('paymentsuccesspage', { orderdetails, offer, coupon  })
    }
    else {
      console.log('3 hi')
      const razorpayid = req.session.razorpayid
      const orderdetails = await orderSchema.findOne({ razorpayOrderId: razorpayid })
      console.log(orderdetails,'detals')
      const offer = orderdetails.discount
      console.log(orderdetails, 'orderdetails')
      coupon = orderdetails?.couponDiscount
      console.log(offer,"offer",coupon,"coupon")
      req.session.newaddress = null
      req.session.appliedCoupon = null
      req.session.Coupon = null
      res.render('paymentsuccesspage', { orderdetails, offer,coupon })
    }
  } catch (error) {
    console.error('error from getpaymentsuccesspage', error)
  }
}

// const getpaymentsuccesspage = async (req, res) => {
//   try {
//     console.log('🟢 Entered getpaymentsuccesspage');

//     const user = req.session.User;
//     const orderId = req.session.order;
//     const razorpayId = req.session.razorpayid;
//     const couponDiscount = req.session.appliedCoupon?.couponDiscount || 0;

//     let orderdetails;

//     if (orderId) {
//       console.log('🟡 Fetching order by orderId:', orderId);
//       orderdetails = await orderSchema.findById(orderId);
//       req.session.order = null;
//     } else if (razorpayId) {
//       console.log('🟡 Fetching order by razorpayOrderId:', razorpayId);
//       orderdetails = await orderSchema.findOne({ razorpayOrderId: razorpayId });
//     }

//     if (!orderdetails) {
//       console.warn('⚠️ No order details found');
//       req.session.appliedCoupon = null;
//       return res.redirect('/user/getcart'); // Fallback if no order found
//     }

//     const offer = orderdetails.discount || 0;

//     console.log('✅ Rendering success page with:', {
//       offer,
//       couponDiscount,
//       orderId: orderdetails._id
//     });

//     // Clear applied coupon after rendering

//     res.render('paymentsuccesspage', {
//       orderdetails,
//       offer,
//       coupon: couponDiscount
//     });
//     req.session.appliedCoupon = null;
//   } catch (error) {
//     console.error('❌ Error in getpaymentsuccesspage:', error);
//     req.session.appliedCoupon = null;
//     res.redirect('/user/getcart');
//   }
// };


//order

const orderpage = async (req, res) => {
  const user = req.session.User
  try {
    if (user) {
      if(req.session.message){
        const orders = await orderSchema.find({ userId: user._id }).populate('orderedItems.product').sort({ createdOn: -1 })
        const message = req.session.message 
        req.session.message = null
        return res.render('orderpage',{orders,message})
      }
      else{
        const orders = await orderSchema.find({ userId: user._id }).populate('orderedItems.product').sort({ createdOn: -1 })
        console.log(orders, 'hidasfdsa')
        console.log(orders.orderedItems,'lenght')
        return res.render('orderpage', { orders,message:'' })
      }
     
    }
    else {
      req.session.message = 'user not found'
      res.redirect('/user/login')
    }

  } catch (error) {
    console.log('error from order controller', error)
  }
}

const pagination = async (req, res) => {
  const user = req.session.User
  const items = await orderSchema.find({ userId: user._id }).populate('orderedItems.product').sort({ createdOn: -1 })
  const product = items.map(item => item.orderedItems)
  console.log(product.flat(1), 'product')
  const count = product.flat(1)
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const currentItems = items.slice(startIndex, endIndex);
    console.log(currentItems.orderedItems, 'currentitems')
    const totalPages = Math.ceil(count.length / limit);
    res.json({
      data: currentItems,
      totalPages: totalPages,
      page: page
    });

  } catch (error) {

  }
}




// const pdfdownload = async(req,res)=>{
//   const { id } = req.params; 
//   try {

//     const doc = new PDFDocument();


//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', 'attachment; filename=invoice.pdf');


//     doc.pipe(res);


//     doc.fontSize(20).text('Invoice', { align: 'center' });
//     doc.moveDown();


//     doc.text('Cart ID: ' + id);
//     doc.text('gdfsgfsd');

//     doc.end(); 
//   } catch (error) {
//     console.error('Error generating the PDF:', error);
//     res.status(statusCode.INTERNAL_SERVER_ERROR).send('An error occurred while generating the PDF');
//   }
// };

// Add this to save the PDF
const puppeteer = require('puppeteer');
const Wishlist = require('../models/wishlistSchema')
const { isNull } = require('util')
const { filterAsync } = require('puppeteer')
const user = require('../models/user')




const pdfdownload = async (req, res) => {
  console.log('Generating PDF...');
  const { id } = req.params;

  try {

    const cart = await orderSchema.findOne({ _id: id }).populate('userId').populate('orderedItems.product');
    console.log(cart, 'cart')
    if (!cart) {
      return res.status(statusCode.NOT_FOUND).json({ message: 'Cart not found' });
    }

    const totalPriceWithGST = cart.totalPrice
    const invoiceData = {
      items: cart.orderedItems,
      cartId: cart._id,
      date: new Date().toLocaleDateString(),
      customerName: cart.userId.name,
      totalPrice: cart.totalPrice,
      totalGST: cart.totalGST,
      totalPriceWithGST: totalPriceWithGST,
      offer: cart.discount ? cart.discount : 0,
      couponDiscount:cart.couponDiscount,
    };

    console.log(invoiceData, 'invoice data')
    const templatePath = path.join(__dirname, '../views', 'invoice-template.ejs');
    console.log(`Rendering template from: ${templatePath}`);

    ejs.renderFile(templatePath, invoiceData, async (err, htmlContent) => {
      if (err) {
        console.error('Error rendering EJS:', err);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json({ message: 'Error rendering template' });
      }

      console.log('EJS rendering successful, launching Puppeteer...');


      // const browser = await puppeteer.launch({ headless: 'new' });
       const browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox'], // REQUIRED for production
        });
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });


      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
      });

      await browser.close();
      console.log('PDF generated successfully!');


      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=invoice-${id}.pdf`);
      res.setHeader('Content-Length', pdfBuffer.length);

      res.end(pdfBuffer);

    });

  } catch (error) {
    console.error('Error generating the PDF:', error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send('An error occurred while generating the PDF');
  }
};

const getwishlistpage = async (req, res) => {
  const { id } = req.params;
  const user = req.session.User;

  if (!user) {
    return res.json({ success: false, message: 'Please login' });
  }

  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.json({ success: false, message: 'Product not found' });
    }

    if (product.quantity === 0) {
      return res.json({ success: false, message: 'Product is out of stock and cannot be added to wishlist' });
    }
    let wishlist = await wishlistSchema.findOne({ userId: user._id });
    console.log(wishlist, 'wishlist')
    if (!wishlist) {
      wishlist = new wishlistSchema({
        userId: user._id,
        Products: [{ productId: id }]
      });
      await wishlist.save();
      return res.json({ success: true, added: true });
    }
    else {
      const exist = wishlist.Products.find(item => item.productId.equals(id));
      console.log(exist)
      if (exist) {
        wishlist.Products = wishlist.Products.filter(item => !item.productId.equals(id));
        await wishlist.save();
        return res.json({ success: true, added: false });
      }
      wishlist.Products.push({ productId: id })
      await wishlist.save();
      return res.json({ success: true, added: true });
    }


  } catch (error) {
    console.error('Error toggling wishlist:', error);
    res.json({ success: false, message: 'Server error' });
  }
};

const getwishlist = async (req, res) => {
  const theProducts = await wishlistSchema.find({}).populate('Products.productId')
  try {
     const products = theProducts.map(product=>product.Products)
     console.log(products,'products')
    if(products.every(arr => arr.length === 0)){
      return res.render('wishlist', { theProducts,message:"wishlist is empty" })
    }
   return res.render('wishlist', { theProducts,message:'' })
  } catch (error) {
    console.error('error from homecontroller', error)
  }
}
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAYX_KEY_ID,
  key_secret: process.env.RAZORPAYX_KEY_SECRET,
});

const createRazorpayOrder = async (req, res) => {
  try {
    const coupon = req.session.appliedCoupon ? req.session.appliedCoupon : 0
    req.session.Coupon = req.session.appliedCoupon?.couponDiscount
    const user = req.session.User;
    if (!user) {
      req.session.message = 'please login'
      res.redirect('/user/login')
    }
    else {
      const cart = await cartSchema.findOne({ userId: user._id }).populate("items.productId");

      if (!cart) {
        return res.status(400).json({ message: "Cart is empty" });
      }
      console.log(cart,'cart')
      const invalidItems = cart.items.filter(item =>
        item.productId?.isDeleted === true || item.productId?.quantity < item.quantity
      );
      console.log(invalidItems,'invalid items7')
      if (invalidItems.length > 0) {
        console.log('hi')
        req.session.message = "Some products are out of stock or unavailable";
        return res.json({ redirect: '/user/getcart' });
      }
      // const offer = req.session.offerprice || 0;
      const offerPrice = await getUserCartOfferPrice(user._id);
      if (offerPrice === 0 && req.session.noOffersShown !== true) {
        req.session.noOffers = true;        
        req.session.noOffersShown = true;
        req.session.message = "Offers Are not Found"
        return res.json({ redirect: '/user/getpaymentpage' });      
      } else if (offerPrice > 0) {
        req.session.noOffersShown = false;
        req.session.noOffers = false;
      }
      
      const coupon = req.session.appliedCoupon || { couponDiscount: 0 };
      if(coupon && coupon.couponId){
        const id = coupon?.couponId
        const find = await couponSchema.findOne({_id:id})
        if(!find){
          req.session.appliedCoupon = null;
        req.session.message = "Coupon Not Found"
        return res.json({ redirect: '/user/getpaymentpage' });
        }
      }
      const totalAmount = ((cart.totalPrice  - offerPrice - coupon.couponDiscount) * 100);

      const options = {
        amount: totalAmount,
        currency: "INR",
        receipt: `order_${Date.now()}`,
        payment_capture: 1,
      };
      console.log("Creating Razorpay Order with options:", options);
      const razorpayOrder = await razorpay.orders.create(options);
      console.log(razorpayOrder,'order')
      req.session.orderdetails = {
        orderId: razorpayOrder.id,
        amount: cart.totalPrice,
        userId: user._id,
        orderedItems: cart.items.map(item => ({
          product: item.productId,
          quantity: item.quantity,
          price: item.price
        })),
        totalGST: cart.totalGST,
      };
      res.json({ razorpayOrder, secretekey: process.env.RAZORPAYX_KEY_ID, name: user.name, email: user.email, phone: user.phone });
    }
  }
  catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).json({ message: "Error processing payment" });
  }

};

const getBestOfferForProducts = async (product) => {
  console.log("hakeem brototype")
  if (!product || (!product.category && !product.brand)) return null;

  const filterConditions = [];

  if (product.category != null) {
    filterConditions.push({ categoryId: new mongoose.Types.ObjectId(product.category) });
  }
  if (product.brand != null) {
    filterConditions.push({ brandId: new mongoose.Types.ObjectId(product.brand) });
  }
  if (product._id != null) {
    filterConditions.push({ productId: new mongoose.Types.ObjectId(product._id) });
  }

  console.log('Filter conditions:', filterConditions);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const offers = await offerschema.find({
    $or: filterConditions,
    status: true,
    // startDate: { $lte: new Date().setHours(0, 0, 0, 0) },
    // expiredOn: { $gte: new Date().setHours(0, 0, 0, 0) },
    startDate: { $lte: endOfDay },
    expiredOn: { $gte: startOfDay },
  });

  console.log('Fetched offers:', offers);

  if (!offers || offers.length === 0) return null;

  let bestOffer = null;
  let maxDiscountValue = 0;
  const price = product.salePrice || product.price || 0;
  console.log('Product price:', price);

  offers.forEach((offer) => {
    let discountValue =
      offer.discountType === "percentage"
        ? (offer.discountValue / 100) * price
        : offer.discountValue;

    console.log('Offer discount value:', discountValue);

    if (offer.maxDiscount) {
      discountValue = Math.min(discountValue, offer.maxDiscount);
    }

    console.log('Discount after max discount:', discountValue);

    if (discountValue > maxDiscountValue) {
        maxDiscountValue = discountValue;
        bestOffer = discountValue;
    }
  });
  if (bestOffer && bestOffer > product.salePrice * 0.25) {
    bestOffer = product.salePrice * 0.25; 
    bestOffer = product.salePrice * 0.25; 
  }
  console.log(bestOffer,'bestOffer')
  return bestOffer || null;
};


const verifypayment = async (req, res) => {
  const user = req.session.User
  try {
    if(req.session.newaddress){
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      const secret = process.env.RAZORPAYX_KEY_SECRET;
  
      const generated_signature = crypto.createHmac("sha256", secret)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");
      if (generated_signature === razorpay_signature) {
        const orderDetails = req.session.orderdetails;
        req.session.orderDetails = null;
        console.log(orderDetails,'orderameaafads === ==__')
        req.session.razorpayid = orderDetails.orderId
        const coupon = req.session.appliedCoupon || { couponDiscount: 0 };
        const couponApplied = coupon.couponDiscount > 0;
        const couponDiscountValue = coupon.couponDiscount || 0;
        if (!orderDetails) {
          return res.status(400).send("Session expired, please try again.");
        }
        const offerPrice = await getUserCartOfferPrice(user._id);
        const address = await addressSchema.Address.findOne({'address._id':req.session.newaddress})
        // req.session.newaddress = null
        const newOrder = new orderSchema({
          razorpayOrderId: orderDetails.orderId,
          userId: orderDetails.userId,
          paymentMethod: 'Online Payment',
          totalGST: orderDetails.totalGST,
          // orderedItems: orderDetails.orderedItems,
          orderedItems: await Promise.all(orderDetails.orderedItems.map(async (item) => {
            const productDoc = await Product.findById(item.product._id || item.product);
            const bestOffer = await getBestOfferForProducts(productDoc);
            return {
              product: productDoc._id,
              quantity: item.quantity,
              price: item.price,
              bestOffer: bestOffer|| 0
            };
          })),
          totalPrice: orderDetails.amount,
          finalAmount: orderDetails.amount,
          address: address.address[0],
          status: "Pending",
          invoiceDate: new Date(),
          couponApplied: couponApplied,
          couponDiscount: couponDiscountValue,
          couponId:req.session.appliedCoupon?.couponId,
          discount: offerPrice
  
        });
        req.session.Coupon = req.session.appliedCoupon?.couponDiscount
        await newOrder.save();
        req.session.order = newOrder.orderId
        console.log(orderDetails, 'orderd details')
        await Promise.all(
          orderDetails.orderedItems.map(async (item) => {
            if (!item.product || !item.product._id) {
              req.session.message = "item not found"
              req.redirect('/user/getcart')
            }
  
            await Product.updateOne(
              { _id: item.product._id },
              { $inc: { quantity: -item.quantity } }
            );
          })
        );
        req.session.offerprice = null;
        const couponfind = await couponSchema.findById(req.session.appliedCoupon?.couponId)
        if(couponfind){
          console.log(couponfind, 'coupon ameer')
          couponfind.userId.push(user._id)
          await couponfind.save()
        }
        await cartSchema.deleteOne({ userId: orderDetails.userId });
      }
      else {
        console.log('failed')
      }
      res.redirect("/user/paymentsuccesspage");
    }
    else{
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      const secret = process.env.RAZORPAYX_KEY_SECRET;
  
      const generated_signature = crypto.createHmac("sha256", secret)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");
      if (generated_signature === razorpay_signature) {
        const orderDetails = req.session.orderdetails;
        req.session.orderDetails = null;
        req.session.razorpayid = orderDetails.orderId
        const coupon = req.session.appliedCoupon || { couponDiscount: 0 };
        const couponApplied = coupon.couponDiscount > 0;
        const couponDiscountValue = coupon.couponDiscount || 0;
        if (!orderDetails) {
          return res.status(400).send("Session expired, please try again.");
        }
        const addressId = new mongoose.Types.ObjectId(req.session.address);
        const address = await addressSchema.Address.findOne({'address._id':addressId });
        console.log(address.address,'addresdaf +++++')
        const offerPrice = await getUserCartOfferPrice(user._id);
        const newOrder = new orderSchema({
          razorpayOrderId: orderDetails.orderId,
          userId: orderDetails.userId,
          discount: req.session.offerprice,
          paymentMethod: 'Online Payment',
          totalGST: orderDetails.totalGST,
          // orderedItems: orderDetails.orderedItems,
          orderedItems: await Promise.all(orderDetails.orderedItems.map(async (item) => {
            const productDoc = await Product.findById(item.product._id || item.product);
            const bestOffer = await getBestOfferForProducts(productDoc);
            return {
              product: productDoc._id,
              quantity: item.quantity,
              price: item.price,
              bestOffer: bestOffer || 0,
            };
          })),
          totalPrice: orderDetails.amount,
          finalAmount: orderDetails.amount,
          address:address.address[0],
          status: "Pending",
          invoiceDate: new Date(),
          couponApplied: couponApplied,
          couponDiscount: couponDiscountValue,
          couponId:req.session.appliedCoupon?.couponId,
          discount: offerPrice,
  
        });
        req.session.Coupon = req.session.appliedCoupon?.couponDiscount
        await newOrder.save();
        req.session.order = newOrder.orderId
        console.log(orderDetails, 'orderd details')
        await Promise.all(
          orderDetails.orderedItems.map(async (item) => {
            if (!item.product || !item.product._id) {
              req.session.message = "item not found"
              req.redirect('/user/getcart')
            }
  
            await Product.updateOne(
              { _id: item.product._id },
              { $inc: { quantity: -item.quantity } }
            );
          })
        );
        req.session.offerprice = null;
        const couponfind = await couponSchema.findById(req.session.appliedCoupon?.couponId)
        if(couponfind){
          console.log(couponfind, 'coupon ameer')
          couponfind.userId.push(user._id)
          await couponfind.save()
        }
       const delet = await cartSchema.deleteOne({ userId: orderDetails.userId });
      console.log(delet,'del')
      }
      else {
        console.log('failed')
      }
      res.redirect("/user/paymentsuccesspage");
    }
  
  } catch (error) {
    console.error("Payment verification failed:", error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send("Payment verification failed");
  }
};



const paymentfailedpage = async (req, res) => {
  try {
    const { reason, orderId } = req.query;
    const user = req.session.User;
    const orderDetails = req.session.orderdetails;

    if (!orderDetails) {
      return res.render("paymentfailedpage", { reason: "Session expired. Cannot create failed order." });
    }
    // Prevent duplicate order creation
    const existingOrder = await orderSchema.findOne({ razorpayOrderId: orderId });
    if (!existingOrder) {
      const addressId = new mongoose.Types.ObjectId(req.session.address);
      const address = await addressSchema.Address.findOne({ 'address._id': addressId });

      const failedOrder = new orderSchema({
        razorpayOrderId: orderId,
        userId: orderDetails.userId,
        discount: req.session.offerprice,
        paymentMethod: 'Online Payment',
        totalGST: orderDetails.totalGST,
        orderedItems: await Promise.all(orderDetails.orderedItems.map(async (item) => {
          const productDoc = await Product.findById(item.product._id || item.product);
          const bestOffer = await getBestOfferForProducts(productDoc);
          return {
            product: productDoc._id,
            quantity: item.quantity,
            price: item.price,
            bestOffer: bestOffer || 0
          };
        })),
        totalPrice: orderDetails.amount,
        finalAmount: orderDetails.amount,
        address: address.address[0],
        status: "Failed",
        invoiceDate: new Date(),
        couponApplied: req.session.appliedCoupon?.couponDiscount > 0,
        couponDiscount: req.session.appliedCoupon?.couponDiscount || 0,
        couponId: req.session.appliedCoupon?.couponId,
      });

      await failedOrder.save();
      await cartSchema.deleteOne({ userId: orderDetails.userId });
    }

    res.render('paymentfailedpage', { reason, orderId });

  } catch (error) {
    console.error('Error in paymentfailedpage controller:', error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send("Something went wrong");
  }
}

// const returnorder = async(req,res)=>{
//   try {
//     const user = req.session.User
//     const{orderId,returnReason} = req.body
//     console.log('sidheeq')
//     const order = await orderSchema.findOne({_id:orderId})
//     console.log(order,'orders')
//     if(order.paymentMethod === "Online Payment"){
//      const find = await walletSchema.findOne({userId:user._id})
//      console.log(find,'find')
//      if(find != null){
//       const wallet = new walletSchema({
//         userId: user._id,
//         transaction: [{
//           Total:(order.totalPrice+order.totalGST)-(order.discount?order.discount:0),
//           Type:'Credit',
//         }]
//       })
//       await wallet.calculateWalletTotal()
//       await wallet.save()
//       console.log(wallet)
//      }
//      else{
//       console.log('ready')
//       const wallet = await walletSchema.findOne({userId:user._id})
//       wallet.transaction.push({
//          Total:(order.totalPrice+order.totalGST)-(order.discount?order.discount:0),
//          Type:'Credit',
//      })
//      await wallet.calculateWalletTotal()
//      await wallet.save()
//      console.log(wallet)
//      order.ReturnReason =  returnReason
//      order.status = "Return Request"
//      await order.save()
//      res.redirect('/user/order')
//      }
//     }
//     else{
//       order.ReturnReason =  returnReason
//       order.status = "Return Request"
//       await order.save()
//       res.redirect('/user/order')
//     }
//   } catch (error) {
//     console.error('error from homecontroller returnorder',error)
//   }
// }
const returnorder = async (req, res) => {
  try {
    const user = req.session.User;
    const { orderId, returnReason,productId } = req.body;
    if(productId){
      const order = await orderSchema.findById(orderId);
      const item = order.orderedItems.find(i => i.product.toString() === productId);
      if(item.returnStatus === 'Requested'){
        req.session.message = "item return requist already submited"
        return res.redirect('/user/order');
      }
      if (item) {
        item.returnStatus = 'Requested';
        item.returnReason = returnReason;
        await order.save();
        res.redirect('/user/order');
      } else {
        console.log('Order not found');
        return res.redirect('/user/order');
      }
    }
    else{
      console.log('Return process started');

      const order = await orderSchema.findOne({ _id: orderId });
      if (!order) {
        console.log('Order not found');
        return res.redirect('/user/order');
      }
  
      // if (order.paymentMethod === "Online Payment") {
      //   let wallet = await walletSchema.findOne({ userId: user._id });
  
      //   if (!wallet) {
      //     console.log('Creating new wallet entry');
      //     wallet = new walletSchema({
      //       userId: user._id,
      //       transaction: [{
      //         Total: (order.totalPrice + order.totalGST) - (order.discount || 0),
      //         Type: 'Credit',
      //       }]
      //     });
      //   } else {
      //     console.log('Updating existing wallet');
      //     wallet.transaction.push({
      //       Total: (order.totalPrice + order.totalGST) - (order.discount || 0),
      //       Type: 'Credit',
      //     });
      //   }
  
      //   await wallet.calculateWalletTotal(); 
      //   await wallet.save();
      //   console.log('Wallet updated:', wallet);
      // }
  
      order.ReturnReason = returnReason;
      order.status = "Return Request";
      await order.save();
  
      console.log('Order updated:', order);
      res.redirect('/user/order');
    }
  } catch (error) {
    console.error('Error from homecontroller returnorder:', error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send('Internal Server Error');
  }
};

const getwallet = async (req, res) => {
  const user = req.session.User
  try {
    const wallet = await walletSchema.findOne({ userId: user._id }).populate("transaction.orderId")
    if (wallet) {
      const createdOn = wallet.createdOn
      const expiryDate = new Date(createdOn);
      expiryDate.setDate(expiryDate.getDate() + 30);
      const currentDate = new Date()
      const differenceInDays = Math.floor((currentDate - createdOn) / (1000 * 60 * 60 * 24));
      if (differenceInDays <= 30) {
        console.log(wallet, 'wallet')
        return res.render('wallet', { wallet: wallet || { transaction: [] }, expiryDate: '' });
      }
    }
    else {
      return res.render('wallet', { wallet: wallet || { transaction: [] }, expiryDate: '' });

    }
  } catch (error) {
    console.log('error from getwallet', error)
  }
}

const addOffer = async (req, res) => {
  const user = req.session.User;
  const cart = await cartSchema.findOne({ userId: user._id }).populate('items.productId');
  try {
    const { coupon } = req.body
    const find = await couponSchema.findOne({ name: coupon })
    if (!find) {
      req.session.message = "No Coupon Found";
      return res.redirect('/user/getcart');
    }
    if (new Date(find.expiredOn) < new Date()) {
      req.session.message = "Coupon Expired";
      return res.redirect('/user/getcart');
    }
    if (find.userId.includes(user._id)) {
      req.session.message = "You have already used this coupon";
      return res.redirect('/user/getcart');
    }
    console.log(cart, 'cart')
    const total = cart.items.reduce((sum, item) => {
      return sum + item.productId.salePrice * item.quantity;
    }, 0);
    if (total  < find.minimumPrice) {
      req.session.message = `Minimum cart value should be ₹${find.minimumPrice}`;
      return res.redirect('/user/getcart');
    }
    let couponDiscount = 0;

    if (find.appliesTo === "all") {
      cart.items.forEach(item => {
        const productDiscount = find.discountType === "percentage"
          ? (item.productId.salePrice * find.discountValue) / 100
          : find.discountValue;

        couponDiscount += productDiscount * item.quantity;
      });
    }

    if (find.appliesTo === "category") {
      cart.items.forEach(item => {
        if (find.categoryId.includes(item.productId.category)) {
          const productDiscount = find.discountType === "percentage"
            ? (item.productId.salePrice * find.discountValue) / 100
            : find.discountValue;

          couponDiscount += productDiscount * item.quantity;
        }
      });
    }
    if (find.appliesTo === "brand") {
      cart.items.forEach(item => {
        if (find.brandId.includes(item.productId.brand)) {
          const productDiscount = find.discountType === "percentage"
            ? (item.productId.salePrice * find.discountValue) / 100
            : find.discountValue;

          couponDiscount += productDiscount * item.quantity;
        }
      });
    }
    const cartTotalWithGST = total 
    const maxAllowedDiscount = Math.min(find.maxDiscount || find.discountValue, cartTotalWithGST / 4);

    if (couponDiscount > maxAllowedDiscount) {
      couponDiscount = maxAllowedDiscount;
    }
    // if (couponDiscount > find.maxDiscount) {
    //   couponDiscount = find.maxDiscount;
    // }
    if(couponDiscount > cartTotalWithGST * 0.25){
      couponDiscount = cartTotalWithGST * 0.25
    }
    console.log(couponDiscount, 'discount')
    cart.couponDiscount = couponDiscount
    console.log(req.session.offerprice, '1', couponDiscount, 'coupon discount')
    req.session.offerprice = (req.session.offerprice || 0) + (couponDiscount || 0);
    console.log(req.session.offerprice, '2')
    if (couponDiscount === 0) {
      req.session.message = `This ${find.appliesTo} has no coupon Try Another`;
      return res.redirect('/user/getcart');
    }
    const category = find.categoryId ? find.categoryId : null
    const brand = find.brandId ? find.brandId : null
    const minimumPrice = find.minimumPrice
    req.session.message = `Coupon applied! You saved ₹${couponDiscount}`;
    req.session.appliedCoupon = {
      code: find.name,
      couponDiscount,
      couponId: find._id,
      category,
      brand,
      minimumPrice,
    }
    return res.redirect('/user/getcart');
    console.log(find, 'find')
  } catch (error) {
    console.log("error from addOffer", error)
  }
}

const removeoffer =async (req,res)=>{
  try {
    req.session.appliedCoupon=null
    await req.session.save(); 
    req.session.message = "coupon removed successfully"
res.redirect("/user/getcart")
  } catch (error) {
    console.log("error in removeOffer page",error)
  }
}







const walletfilter = async(req,res)=>{
  try {
    console.log('hi')
    const user = req.session.User;
    const userId = user._id;
    const { type } = req.query;
    console.log(type,'type')
    const wallet = await walletSchema.findOne({ userId: user._id.toString() }).populate('transaction.orderId');
    if(req.query.type === "all"){
      filteredTransactions = wallet.transaction
    }
    if (req.query.type === 'credit') {
      filteredTransactions = wallet.transaction.filter(tx => tx.Type === 'Credit');
    } else if (req.query.type === 'debit') {
      filteredTransactions = wallet.transaction.filter(tx => tx.Type === 'Debit');
    }

    console.log(filteredTransactions,'transaction')
  
    res.json({ transactions:filteredTransactions,balance:wallet.WalletTotal });
  } catch (error) {
    console.log('error from the walletfilter',error)
  }
}

const toggleWishlist = async (req, res) => {
  try {
    const userId = req.session.User?._id;
    const { productId } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(statusCode.NOT_FOUND).json({ success: false, message: "Product not found" });

    if (product.quantity <= 0) {
      return res.json({ success: false, message: "Cannot add out-of-stock product to wishlist" });
    }
    const user = await userschema.findById(userId);
    if (!user) return res.status(statusCode.NOT_FOUND).json({ success: false, message: "User not found" });

    let action = '';
    let wishlist = await wishlistSchema.findOne({ userId });

    if (wishlist) {
      // Check if product is already in wishlist
      const index = wishlist.Products.findIndex(p => p.productId.toString() === productId);

      if (index !== -1) {
        // Remove product from wishlist
        wishlist.Products.splice(index, 1);
        action = 'removed';
      } else {
        // Add product to wishlist
        wishlist.Products.push({ productId });
        action = 'added';
      }

      await wishlist.save();
    } else {
      // Create a new wishlist
      wishlist = new wishlistSchema({
        userId,
        Products: [{ productId }]
      });
      await wishlist.save();
      action = 'added';
    }

    return res.json({ success: true, action, message: `Product ${action} from wishlist` });
  } catch (error) {
    console.error("Toggle Wishlist Error:", error);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.session.User._id;
    const { productId } = req.body;

    console.log(userId, 'userID', productId, 'productid');

  //  const  wishlist = await wishlistSchema.findOne({userId:userId})
  //  console.log(wishlist,'wishlist')
  const result = await wishlistSchema.findOneAndUpdate(
    { userId },
    { $pull: { Products: { productId: new ObjectId(productId) } } },  // Use ObjectId for comparison
    { new: true }  // Optionally return the updated document
  );

    res.json({ success: true, message: "Item removed from wishlist" });
  } catch (err) {
    console.error("Error removing wishlist item:", err);
    res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
  }
};

const aboutUs = async(req,res)=>{
  try {
    console.log('hi')
    res.render('Aboutus')
  } catch (error) {
    
  }
}



const retryPayment = async (req, res) => {
  try {
    console.log('hidsafdsafas')
    const { orderId } = req.params;
    console.log(orderId,'orderid')
    const order = await orderSchema.findById(orderId);
    req.session.Coupon = order?.couponDiscount
    console.log(order,'order')
    if (!order || order.status !== "Failed") {
      return res.status(400).send("Invalid or non-retryable order");
    }

    const options = {
      amount: (order.finalAmount - order.discount - order.couponDiscount) * 100, // convert to paise
      currency: "INR",
      receipt: `retry_order_${Date.now()}`,
      payment_capture: 1,
    };

    const razorpayOrder = await razorpay.orders.create(options);
    console.log(razorpayOrder,'razorpay order')
    // Update Razorpay ID in DB
    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    // Store this in session so we can use it in verify-payment
    req.session.orderdetails = {
      orderId: razorpayOrder.id,
      amount: order.finalAmount,
      userId: order.userId,
      orderedItems: order.orderedItems,
      totalGST: order.totalGST,
    };
    req.session.razorpayid = razorpayOrder.id
     console.log(razorpayOrder,process.env.RAZORPAYX_KEY_ID)
    // Redirect or return the order
    res.json({ razorpayOrder, secretekey: process.env.RAZORPAYX_KEY_ID });

  } catch (error) {
    console.error("Retry payment error:", error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send("Error retrying payment");
  }
};


const retryverify = async(req,res)=>{
  try {
    const { razorpay_order_id } = req.body;
    const order = await orderSchema.findOne({ razorpayOrderId: razorpay_order_id });
    if (!order) {
      return res.status(statusCode.NOT_FOUND).json({ message: "Order not found" });
    }
    if (order.status !== "Failed") {
      return res.status(400).json({ message: "Order is not eligible for retry verification" });
    }
    order.status = "Pending";
    for (const item of order.orderedItems) {
      const product = await Product.findById(item.product);
      if (product) {
        product.quantity -= item.quantity;
        await product.save();
      }
    }

    await order.save();
    res.status(statusCode.OK).json({ message: "Order updated to Pending and stock adjusted" });

  } catch (error) {
    console.error("Error from retryverify:", error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" });
  }
}


module.exports = {
  getproductmainpage,
  getfilterpage,
  getprofilepage,
  geteditpage,
  editprofile,
  checkotp,
  addresspage,
  addaddress,
  registeraddress,
  editaddress,
  editaddresspost,
  deleteaddress,
  addtocart,
  getcart,
  updatequantity,
  checkoutpage,
  deletecartbutton,
  searchmain,
  paymentpage,
  getpaymentpage,
  orderplacedpage,
  getpaymentsuccesspage,
  orderpage,
  pagination,
  pdfdownload,
  getwishlistpage,
  getwishlist,
  createRazorpayOrder,
  verifypayment,
  paymentfailedpage,
  returnorder,
  getwallet,
  addOffer,
  removeoffer,
  walletfilter,
  toggleWishlist,
  removeFromWishlist,
  aboutUs,
  retryPayment,
  retryverify,
}