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

const getproductmainpage = async (req, res) => {
  console.log(req.params)
  const { id } = req.params
  req.session.code = id
  const product = await Product.findOne({ _id: id, isDeleted: false });
  const allOffers = await offerschema.find({
    $or: [
      { categoryId:product.category? new mongoose.Types.ObjectId(product.category):null },
      { brandId: product.brand ? new mongoose.Types.ObjectId(product.brand) : null }
    ],
    status:true,
    startDate:{$lte:new Date()},
    expiredOn:{$gte:new Date()},
  })
  const bestOffer = await getBestOfferForProduct(product)
  try {
    if(req.session.message){
      const message = req.session.message
      req.session.message = null
      const recomended = await Product.find({ salePrice: { $gte: priceless, $lte: pricemore }, _id: { $ne: product._id } })
      return res.render('productmainpage', { product: product, recomended: recomended,message:message,bestOffer,allOffers})
    }
    if (product) {
      const priceless = product.salePrice - 15000
      const pricemore = product.salePrice + 15000
      const recomended = await Product.find({ salePrice: { $gte: priceless, $lte: pricemore }, _id: { $ne: product._id } })
      console.log(bestOffer,'bestOffer')
     return res.render('productmainpage', { product: product, recomended: recomended,bestOffer,allOffers })
    }
    else {
      console.log('pos')
      return res.redirect('/user/shoppage')
    }
  } catch (error) {
    console.error('errror from homecontroller', error)
  }
}
const getTotalOffers = async (product) => {
  console.log("Fetching offers...");
  console.log(product, "Product details");

  if (!product.category && !product.brand) return 0; // Ensure product has a category or brand

  const filterConditions = [];

  if (product.category) {
    filterConditions.push({ categoryId: new mongoose.Types.ObjectId(product.category) });
  }
  if (product.brand) {
    filterConditions.push({ brandId: new mongoose.Types.ObjectId(product.brand) });
  }

  const offerList = await offerschema.find({
    $or: filterConditions,
    status: true,
    startDate: { $lte: new Date() },
    expiredOn: { $gte: new Date() },
  });

  if (!offerList || offerList.length === 0) return 0; // No offers available

  let bestOffer = null;
  let maxDiscountValue = 0;

  offerList.forEach((offer) => {
    let discountValue =
      offer.discountType === "percentage"
        ? (offer.discountValue / 100) * product.salePrice
        : offer.discountValue;

    if (offer.maxDiscount) {
      discountValue = Math.min(discountValue, offer.maxDiscount); 
    }

    if (discountValue > maxDiscountValue) {
      maxDiscountValue = discountValue;
      bestOffer = offer;
    }
  });

  if (!bestOffer) return 0;

  console.log(bestOffer, "Selected Offer");
  console.log(maxDiscountValue, "Final Discount Value");

  return maxDiscountValue;
};


const getBestOfferForProduct = async (product) => {
  if (!product.category && !product.brand) return null; 
  const filterConditions = [];

  if (product.category != null) {
    filterConditions.push({ categoryId: new mongoose.Types.ObjectId(product.category) });
  }
  if (product.brand != null) {
    filterConditions.push({ brandId: new mongoose.Types.ObjectId(product.brand) });
  }
  console.log(filterConditions,'filtercondition')
  const offers = await offerschema.find({
    $or: filterConditions,
    status: true,
    startDate: { $lte: new Date() },
    expiredOn: { $gte: new Date() },
  });
  console.log(offers,'offers')
  if (!offers || offers.length === 0) return null; // No offers available

  let bestOffer = null;
  let maxDiscountValue = 0;

  offers.forEach((offer) => {
    let discountValue =
      offer.discountType === "percentage"
        ? (offer.discountValue / 100) * product.salePrice
        : offer.discountValue;

    if (offer.maxDiscount) {
      discountValue = Math.min(discountValue, offer.maxDiscount);
    }

    if (discountValue > maxDiscountValue) {
      maxDiscountValue = discountValue;
      bestOffer = offer;
    }
  });
  return bestOffer;
};



const getfilterpage = async (req, res) => {
  const cat = await brandschema.find({})
  const user = req.session.User
  try {
    console.log('hi')
    const { sort, category, priceFrom, priceTo } = req.query;
     const cat = await brandschema.find({brandName:category})
     const categories = await brandschema.find({})
    let filter = {}
    console.log('hello')
    if (cat && cat.length>0) { 
      filter.brand = cat[0]._id
    }  
    if (priceFrom || priceTo) { 
      filter.salePrice = {}; 
      if (priceFrom) filter.salePrice.$gte = parseInt(priceFrom);  
      if (priceTo) filter.salePrice.$lte = parseInt(priceTo);
    }
    if (sort === 'A to Z') {
       const wishlist = await wishlistSchema.findOne({ userId: user._id }).populate("Products.productId");
       const wishlistProductIds = wishlist ? wishlist.Products.map(item => item.productId._id.toString()) : [];
      const products = await Product.find(filter).sort({ productName: 1 });
      return res.render('shoppage', { product: products, category: categories,wishlistProductIds }); 
    }
    if (sort === 'Z to A') {
       const wishlist = await wishlistSchema.findOne({ userId: user._id }).populate("Products.productId");
          const wishlistProductIds = wishlist ? wishlist.Products.map(item => item.productId._id.toString()) : [];
      const products = await Product.find(filter).sort({ productName: -1 });
      return res.render('shoppage', { product: products, category: categories,wishlistProductIds });
    }
    if (sort === 'Low To High') {  
       const wishlist = await wishlistSchema.findOne({ userId: user._id }).populate("Products.productId");
       const wishlistProductIds = wishlist ? wishlist.Products.map(item => item.productId._id.toString()) : [];
      const products = await Product.find(filter).sort({ salePrice: 1 });
      return res.render('shoppage', { product: products, category: categories,wishlistProductIds });
    }
    if (sort === 'High To Low') {
       const wishlist = await wishlistSchema.findOne({ userId: user._id }).populate("Products.productId");
          const wishlistProductIds = wishlist ? wishlist.Products.map(item => item.productId._id.toString()) : [];
      const products = await Product.find(filter).sort({ salePrice: -1 });
      return res.render('shoppage', { product: products, category: categories,wishlistProductIds });
    }
    console.log(filter, 'filter')
     const wishlist = await wishlistSchema.findOne({ userId: user._id }).populate("Products.productId");
     const wishlistProductIds = wishlist ? wishlist.Products.map(item => item.productId._id.toString()) : [];
    const products = await Product.find(filter);
    console.log(products)
    return res.render('shoppage', { product: products, category: categories,wishlistProductIds }); 

  }
  catch (error) {
    console.log('error from homecontroller', error)
  }
}
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
    res.status(500).json({ success: false, message: "An Error Occured" })
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
    if(req.session.message){
      const message = req.session.message
      req.session.message = null
      return  res.render('addaddress',{message})
    }
   return  res.render('addaddress')
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
    console.log(exitsaddress,'exitst ad')
    if(exitsaddress){
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
  const { id } = req.params
  console.log(id)
  const address = await addressSchema.Address.findOne({ _id: id })
  console.log(address)
  try {
    res.render('editaddress', { address: address.address[0] })
  } catch (error) {
    console.log('error from homecontroller', error)
  }
}
const editaddresspost = async (req, res) => {
  const { id } = req.params
  console.log(id)
  const { name, state, address, City, pincode, phone, altphone } = req.body
  try {
    const result = await addressSchema.Address.updateOne(
      { "address._id": id }, // Match the document with the specific address ID
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
  const { id } = req.params
  try {
    const isdeleted = await addressSchema.Address.findByIdAndDelete(id)
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
//   return res.status(200).json({redirectUrl:'/user/login'})
// }



const addtocart = async (req, res) => {
  const { productId, quantity } = req.body;
  console.log(productId, quantity);

  const user = req.session.User;
  if (!user) {
    req.session.message = 'User not found';
    return res.status(200).json({ redirectUrl: '/user/login' });
  }

  try {
    const product = await Product.findOne({ _id: productId });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    if(product.quantity<quantity){
      req.session.message = 'Out of Stock'
      return res.redirect('/user/productmainpage/:id')
    }

    let cart = await cartSchema.findOne({ userId: user._id });
    if (!cart) {
      let wishlist = await wishlistSchema.findOne({ userId: user._id });
      cart = new cartSchema({
        userId: user._id,
        items: [{
          productId: product._id,
          quantity,
          price: product.salePrice,
          gstPercentage:product.Tax,
          totalPriceWithGST: (product.salePrice * quantity) + (product.salePrice * quantity * product.gstPercentage / 100),
          totalPrice: product.salePrice * quantity,
        }]
      });
      cart.calculateGST();
      await cart.save();
      wishlist.Products = wishlist.Products.filter(item => !item.productId.equals(product._id));
      await wishlist.save();
    } else {
      // Update existing cart
      const existingItem = cart.items.find(item => item.productId.toString() === productId.toString());
      if (existingItem) {
        // Update quantity and totalPrice if product already exists in cart
        existingItem.quantity += parseInt(quantity);
        existingItem.totalPrice = existingItem.quantity * product.salePrice;
      } else {
        // Add new product to cart
        cart.items.push({
          productId: product._id,
          quantity,
          price: product.salePrice,
          gstPercentage:product.Tax,
          totalPrice: product.salePrice * quantity,
          totalPriceWithGST:(product.salePrice*quantity)+(product.salePrice*quantity*product.gstPercentage/100)
        });
      }
      let wishlist = await wishlistSchema.findOne({ userId: user._id });
      cart.calculateGST();
      await cart.save();
      console.log('hidas fasdfmd dsaf safmas f')
      wishlist.Products = wishlist.Products.filter(item => !item.productId.equals(product._id));
      await wishlist.save();
    }

    return res.json({ message: 'Cart updated successfully' });
  } catch (error) {
    console.error('Error in addtocart:', error);
    return res.status(500).json({ message: 'An error occurred' });
  }
};




const addtocartpage = async (product, quantity) => {
  //  const product = await Product.findOne({_id:req.params.id})

}
const getcart = async (req, res) => {
  const user = req.session.User
  try {
    if(!user){
      req.session.message = 'Please login'
      res.redirect('/user/login')
    }
    if (req.session.message) {
      const isexist = await cartSchema.findOne({ userId: user._id })
      if (isexist == null) {
      const message =  req.session.message 
      req.session.message = null
        return res.render('addtocart', { combineddata: [], quantity: '', totalPrice: 0,totalGST:'' ,message })
      }
      const message = req.session.message;
      req.session.message = null
      const item = isexist.items.map(item => item.productId)
      const quantity = isexist.items.map(item => item.quantity)
      const products = await Product.find({ _id: { $in: item } });
      const populatedCart = await cartSchema.findOne({ userId: user._id }).populate('items.productId');
      const offerPrices = async (products) => {
        const discounts = await Promise.all(products.map(getTotalOffers));
        return discounts.reduce((acc, discount) => acc + discount, 0);
      };
      const offerPrice = await offerPrices(products);
      console.log(offerPrice,'ameer offerprice')
      req.session.offerprice = offerPrice
      const combineddata = products.map((product, index) => ({
        ...product._doc,
        quantity: quantity[index]
      }))
      return res.render('addtocart', { combineddata: populatedCart.items, quantity, totalPrice: isexist?.totalPrice,totalGST:isexist?.totalGST, message: message,offerPrice })
    }

    else {
      const isexist = await cartSchema.findOne({ userId: user._id })
      if (isexist == null) {
        return res.render('addtocart', { combineddata: [], quantity: '',totalGST:'',totalPrice: 0 })
      }
      const item = isexist.items.map(item => item.productId)
      const quantity = isexist.items.map(item => item.quantity)
      console.log(quantity, 'quantity')
      const products = await Product.find({ _id: { $in: item } });
      console.log(products, 'products')
      const populatedCart = await cartSchema.findOne({ userId: user._id }).populate('items.productId');
      const offerPrices = async (products) => {
        const discounts = await Promise.all(products.map(getTotalOffers));
        return discounts.reduce((acc, discount,index) => acc + discount * quantity[index], 0);
      };
      const offerPrice = await offerPrices(products);
      req.session.offerprice = offerPrice
      console.log(offerPrice,"ameer ali ")
      const combineddata = products.map((product, index) => ({
        ...product._doc,
        quantity: quantity[index]
      }))
      return res.render('addtocart', { combineddata: populatedCart.items, quantity, totalPrice: isexist?.totalPrice,totalGST:isexist?.totalGST, message: '',offerPrice })
    }



  } catch (error) {
     console.error('error from homecontroller',error)
  }
}


const updatequantity = async (req, res) => {
  const quantity = parseInt(req.body.quantity);
  const id = req.body.productId;
  const user = req.session.User;

  try {
    let cart = await cartSchema.findOne({ userId: user._id });

    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    const item = cart.items.find(item => item._id == id);

    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found in cart" });
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
    res.status(200).json({ success: true, total, totalGST, offerprice });
  } catch (error) {
    console.error("Error from updatequantity:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};



const checkoutpage = async (req, res) => {
  const userid = req.session.User;
   if(!userid){
    req.session.message = 'Please login';
    return res.redirect('/user/login');
   }
   const cart = await cartSchema.findOne({userId:userid._id})
  try {
     if(cart){
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
          req.session.message = `${item.productId.productName} is outofstock`;
          return res.redirect('/user/getcart');
        }
        if(item.quantity>product.quantity){
          req.session.message = `please decrease the quantity of the ${product.productName}`
         return res.redirect('/user/getcart')
  
         }
        if (product.isDeleted) {
          req.session.message = `${item.productId.productName} is deleted by admin`;
          return res.redirect('/user/getcart');
        }
      }
      if(req.session.message){
        const message = req.session.message
        req.session.message = null
        const cart = await cartSchema.findOne({userId:userid._id}).populate('items.productId')
      const product = cart.items.map(item=>item.productId)
      const total = cart.totalPrice
      const totalGST = cart.totalGST
      const address = await addressSchema.Address.find({userId:userid._id})
      const addresses = address.map(address=>address.address)
      const offerPrice = req.session.offerprice
      console.log(offerPrice,'offerameer')
      return res.render('checkoutpage',{product,total,totalGST,address:addresses,message,offerPrice});
      }
      const cart = await cartSchema.findOne({userId:userid._id}).populate('items.productId')
      const product = cart.items.map(item=>item.productId)
      const total = cart.totalPrice
      const totalGST = cart.totalGST
      const address = await addressSchema.Address.find({userId:userid._id})
      const addresses = address.map(address=>address.address)
      const offerPrice = req.session.offerprice
      console.log(offerPrice,'offerameer')
      return res.render('checkoutpage',{product,total,totalGST,address:addresses,offerPrice});


     }
     else{
      console.log('yes reay')
      req.session.message = 'cart is empty'
      return res.redirect('/user/getcart')
     }
  
  } catch (error) {
    console.error('Error in checkout page:', error);
    return res.status(500).send('An error occurred.');
  }
};

const deletecartbutton = async (req, res) => {
  const productId = req.params.id;
  const user = req.session.User;

  try {
    let cart = await cartSchema.findOne({ userId: user._id });

    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }
    cart.items = cart.items.filter(item => item.productId.toString() !== productId);

    cart.calculateGST();
    await cart.save(); 
    cart = await cartSchema.findOne({ userId: user._id });
    if (cart.items.length === 0) {
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
    res.json({
      success: true,
      cartTotal,
      carttotalGST: cartGST,
      offerPrice,
    });

  } catch (error) {
    console.error("Error from deletecartbutton:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


const searchmain = async(req,res)=>{
  try {
    const searchval = req.query.query
    const results = await Product.find({ 
      productName: { $regex: searchval, $options: 'i' } 
  });
   if(results){
    res.json({ success: true, products: results });
   }
   else{
    res.json({ success: true, products:[] });
   }
  
    
  } catch (error) {
    
  }
}
const paymentpage = async(req,res)=>{
  const user = req.session.User
  const data = req.body
  console.log(data,'this is what i wnd')
  const User = await userschema.findOne({_id:user._id,isBlocked:false})
  console.log(User,'User')
  try {
    if(!User){
      req.session.message = 'Please Login'
      return res.redirect('/user/login')
    }
    if (user && req.body. useNewAddress === 'true') {
      const exitsaddress = await addressSchema.Address.findOne({
        userId: user._id,
        'address.addressType': data.address,
        'address.pincode': data.pincode,
        'address.city': data.city,
        'address.phone': data.phone,
        'address.altPhone': data.altphone,
        'address.state': data.state,
      })
      if(exitsaddress){
        req.session.message = 'address already exist'
        return res.redirect('/user/checkoutpage')
      }
      else{
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
        console.log(adduser,'useradd')
        const save = await adduser.save()
        req.session.newaddress = save.address[0]._id
        if (save) {
          res.redirect('/user/getpaymentpage')
        }
        else {
          req.session.message = 'addresss created failed'
          res.redirect('/user/addresspage')
        }
      }
     
    }
     if(user){
      req.session.address = data.selectedAddress
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

const getpaymentpage = async(req,res)=>{
  try {
    if(req.session.message){
      const message = req.session.message
      req.session.message = null
      return res.render('paymentpage',{message})
    }
   return res.render('paymentpage')
  } catch (error) {
    
  }
}
const orderplacedpage = async(req,res)=>{
  const user = req.session.User
  const payment = req.body.paymentMethod
  const isexit = await userschema.find({_id:user._id,isBlocked:false})
  const items = await cartSchema.findOne({userId:user._id}).populate('items.productId')
  try {
    if(payment === 'cash'){
      if(isexit.length>0){
        if(req.session.address){
          const orderededuser = await cartSchema.findOne({userId:user._id})
          const totalPrice =  orderededuser.totalPrice
          const totalGST = orderededuser.totalGST
          const address = req.session.address
          req.session.address = null
          const orderedItems = orderededuser.items.map(item=>({
            product : item.productId,
            quantity : item.quantity,
            price : item.price,
          }))
              const newOrder = new orderSchema({
                userId: user._id,
                paymentMethod:'Cash ON Delivery',
                totalGST:totalGST,
                orderedItems:orderedItems,
                totalPrice: totalPrice,
                finalAmount:totalPrice,
                address:address,
                status:"Pending", // Default status is 'Pending' if not provided
                invoiceDate: new Date(),
                couponApplied:false,
                discount:req.session.offerprice,
              });
            const saved =  await newOrder.save();
            if(saved){
              req.session.offerprice = null
              const orderededuser = await cartSchema.findOne({userId:user._id}).populate('items.productId')
              updateQuantities(orderededuser.items)
              if(items){
                req.session.order = saved.orderId
                const remove = await cartSchema.deleteOne({userId:user._id})
                return res.redirect('/user/paymentsuccesspage')
              }
              else{
                return res.redirect('/user/getcart')
              }
                
            }
              
        }
        else{
          const orderededuser = await cartSchema.findOne({userId:user._id})
          if(orderededuser){
            const totalPrice = orderededuser.totalPrice
          }
          else{
            return res.redirect('/user/getcart')
          }
          const address = req.session.newaddress
          req.session.newaddress = null
          const totalPrice = orderededuser.totalPrice
          const totalGST = orderededuser.totalGST
          const orderedItems = orderededuser.items.map(item=>({
            product : item.productId,
            quantity : item.quantity,
            price : item.price,
          }))
              const newOrder = new orderSchema({
                userId: user._id,
                orderedItems:orderedItems,
                totalGST:totalGST,
                totalPrice: totalPrice,
                finalAmount:totalPrice,
                address:address,
                status:"Pending", 
                invoiceDate: new Date(),
                couponApplied:false,
                discount:req.session.offerprice,
              });
              await newOrder.save();
              req.session.offerprice = null
        }
      }
      else{
        req.session.message = 'user Not found'
        return res.redirect('/user/login')
      }

    }
    else{
      console.log('other payment')
    }
   
    
  } catch (error) {
    console.error('error from homecontroller',error)
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
const getpaymentsuccesspage =async(req,res)=>{
  const user = req.session.User
  const orderid = req.session.order
  console.log(orderid,'orderid1')
 
  try {
    if(orderid){
      req.session.orderId = null
      const orderdetails = await orderSchema.findOne({orderId:orderid})
      console.log(orderdetails,'orderdetails')
        res.render('paymentsuccesspage',{orderdetails})
    }
    else{
     const razorpayid= req.session.razorpayid 
     const orderdetails = await orderSchema.findOne({razorpayOrderId:razorpayid})
     console.log(orderdetails,'orderdetails')
       res.render('paymentsuccesspage',{orderdetails})
    }
   

  } catch (error) {
    console.error('error from getpaymentsuccesspage',error)
  }
}


//order

const orderpage = async(req,res)=>{
  const user = req.session.User
  try {
    if(user){
      const orders = await orderSchema.find({userId:user._id}).populate('orderedItems.product').sort({createdOn:-1})
      console.log(orders,'hidasfdsa')
      return res.render('orderpage',{orders})
    }
    else{
      req.session.message = 'user not found'
      res.redirect('/user/login')
    }
   
  } catch (error) {
    console.log('error from order controller',error)
  }
}

const pagination = async(req,res)=>{
  const user = req.session.User
  const items = await orderSchema.find({userId:user._id}).populate('orderedItems.product')
  const product = items.map(item=>item.orderedItems)
  console.log(product.flat(1),'product')
  const count = product.flat(1)
  try {
    const page = parseInt(req.query.page) || 1; 
    const limit = parseInt(req.query.limit) || 10; 
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const currentItems = items.slice(startIndex, endIndex);
    console.log(currentItems,'currentitems')
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
//     res.status(500).send('An error occurred while generating the PDF');
//   }
// };

// Add this to save the PDF
const puppeteer = require('puppeteer');
const Wishlist = require('../models/wishlistSchema')




const pdfdownload = async (req, res) => {
  console.log('Generating PDF...');
  const { id } = req.params;

  try {
 
    const cart = await orderSchema.findOne({ _id: id }).populate('userId').populate('orderedItems.product');
    console.log(cart,'cart')
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

 const totalPriceWithGST = cart.totalPrice+cart.totalGST
    const invoiceData = {
      items:cart.orderedItems,
      cartId: cart._id,
      date: new Date().toLocaleDateString(),
      customerName: cart.userId.name,
      totalPrice: cart.totalPrice,
      totalGST: cart.totalGST,
      totalPriceWithGST: totalPriceWithGST,
    };

console.log(invoiceData,'invoice data')
    const templatePath = path.join(__dirname, '../views', 'invoice-template.ejs');
    console.log(`Rendering template from: ${templatePath}`);

    ejs.renderFile(templatePath, invoiceData, async (err, htmlContent) => {
      if (err) {
        console.error('Error rendering EJS:', err);
        return res.status(500).json({ message: 'Error rendering template' });
      }

      console.log('EJS rendering successful, launching Puppeteer...');

     
      const browser = await puppeteer.launch({ headless: 'new' });
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
    res.status(500).send('An error occurred while generating the PDF');
  }
};

const getwishlistpage = async (req, res) => {
  const { id } = req.params;
  const user = req.session.User;

  if (!user) {
      return res.json({ success: false, message: 'Please login' });
  }

  try {
      let wishlist = await wishlistSchema.findOne({ userId: user._id });
      console.log(wishlist,'wishlist')
      if (!wishlist) {
          wishlist = new wishlistSchema({
              userId: user._id,
              Products: [{ productId:id }]
          });
          await wishlist.save();
          return res.json({ success: true, added: true });
      }
      else{
        const exist = wishlist.Products.find(item => item.productId.equals(id));
        console.log(exist)
        if(exist){
          wishlist.Products = wishlist.Products.filter(item => !item.productId.equals(id));
          await wishlist.save();
          return res.json({ success: true, added: false });
        }
        wishlist.Products.push({productId:id})
        await wishlist.save();
          return res.json({ success: true, added: true });
      }

     
  } catch (error) {
      console.error('Error toggling wishlist:', error);
      res.json({ success: false, message: 'Server error' });
  }
};

const getwishlist = async(req,res)=>{
  const theProducts = await wishlistSchema.find({}).populate('Products.productId')
  try {
    res.render('wishlist',{theProducts})
  } catch (error) {
    console.error('error from homecontroller',error)
  }
}
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAYX_KEY_ID,
  key_secret: process.env.RAZORPAYX_KEY_SECRET,
});
const createRazorpayOrder = async (req, res) => {
  try {
    const user = req.session.User;
    if(!user){
      req.session.message = 'please login'
      res.redirect('/user/login')
    }
    else{
      const cart = await cartSchema.findOne({ userId: user._id }).populate("items.productId");

    if (!cart) {
      return res.status(400).json({ message: "Cart is empty" });
    }
     
    const totalAmount = (cart.totalPrice+cart.totalGST) * 100; // Convert to paise
    const options = {
      amount: totalAmount,
      currency: "INR",
      receipt: `order_${Date.now()}`,
      payment_capture: 1,
    };
    const razorpayOrder = await razorpay.orders.create(options);
    req.session.orderdetails = {
      orderId:razorpayOrder.id,
      amount: cart.totalPrice,
      userId: user._id,
      orderedItems:[{
        product:cart.items[0].productId,
        quantity:cart.items[0].quantity,
        price:cart.items[0].price,
      }],
      totalGST:cart.totalGST,
    };
    res.json({ razorpayOrder,secretekey:process.env.RAZORPAYX_KEY_ID,name:user.name,email:user.email,phone:user.phone});
  } 
    }
    catch (error) {
      console.error("Error creating Razorpay order:", error);
      res.status(500).json({ message: "Error processing payment" });
    }
    
};

const verifypayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const secret = process.env.RAZORPAYX_KEY_SECRET;

    const generated_signature = crypto.createHmac("sha256", secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");
      if(generated_signature === razorpay_signature){
        const orderDetails = req.session.orderdetails;
        req.session.orderDetails = null;
        req.session.razorpayid = orderDetails.orderId
        if (!orderDetails) {
          return res.status(400).send("Session expired, please try again.");
        }
    
        const newOrder = new orderSchema({
          razorpayOrderId:orderDetails.orderId,
          userId: orderDetails.userId,
          paymentMethod:'Online Payment',
          totalGST:orderDetails.totalGST,
          orderedItems:orderDetails.orderedItems,
          totalPrice: orderDetails.amount,
          finalAmount:orderDetails.amount,
          address:req.session.address,
          status:"Confirmed",
          invoiceDate: new Date(),
          couponApplied:false,
    
        });
    
        await newOrder.save();
        await cartSchema.deleteOne({ userId: orderDetails.userId });
      }
      else{
         console.log('failed')
      }
   

    res.redirect("/user/paymentsuccesspage");
  } catch (error) {
    console.error("Payment verification failed:", error);
    res.status(500).send("Payment verification failed");
  }
};



const paymentfailedpage = async(req,res)=>{
  try {
    res.render('paymentfailedpage')
  } catch (error) {
    console.error('error from homecontroler',error)
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
}