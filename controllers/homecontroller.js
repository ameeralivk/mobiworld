const nodemailer = require('nodemailer')
const Product = require('../models/productSchema')
const userschema = require('../models/user')
const addressSchema = require('../models/addressSchema')
const { render } = require('ejs')
const { compareSync } = require('bcrypt')
const cartSchema = require('../models/cartSchema')
const Cart = require('../models/cartSchema')
const categories = require('../models/categorySchema')
const { connect } = require('mongoose')
const orderSchema = require('../models/orderSchema')

const getproductmainpage = async (req, res) => {
  console.log(req.params)
  const { id } = req.params
  req.session.code = id
  // const product = await Product.findById(id,{isDeleted:false})
  const product = await Product.findOne({ _id: id, isDeleted: false });
  try {
    if(req.session.message){
      const message = req.session.message
      req.session.message = null
      const recomended = await Product.find({ salePrice: { $gte: priceless, $lte: pricemore }, _id: { $ne: product._id } })
      return res.render('productmainpage', { product: product, recomended: recomended,message:message})
    }
    if (product) {
      const priceless = product.salePrice - 15000
      const pricemore = product.salePrice + 15000
      const recomended = await Product.find({ salePrice: { $gte: priceless, $lte: pricemore }, _id: { $ne: product._id } })
     return res.render('productmainpage', { product: product, recomended: recomended })
    }
    else {
      console.log('pos')
      return res.redirect('/user/shoppage')
    }
  } catch (error) {
    console.error('errror from homecontroller', error)
  }
}
const getfilterpage = async (req, res) => {
  const cat = await categories.find({})
  try {
    const { sort, category, priceFrom, priceTo } = req.query;
    console.log(sort)
    let filter = {}
    if (category) {
      filter.brand = category;
    }
    if (priceFrom || priceTo) {
      filter.salePrice = {};
      if (priceFrom) filter.salePrice.$gte = parseInt(priceFrom);
      if (priceTo) filter.salePrice.$lte = parseInt(priceTo);
    }
    if (sort === 'A to Z') {
      const products = await Product.find(filter).sort({ productName: 1 });
      return res.render('shoppage', { product: products, category: cat });
    }
    if (sort === 'Z to A') {
      const products = await Product.find(filter).sort({ productName: -1 });
      return res.render('shoppage', { product: products, category: cat });
    }
    if (sort === 'Low To High') {
      const products = await Product.find(filter).sort({ salePrice: 1 });
      return res.render('shoppage', { product: products, category: cat });
    }
    if (sort === 'High To Low') {
      const products = await Product.find(filter).sort({ salePrice: -1 });
      return res.render('shoppage', { product: products, category: cat });
    }
    console.log(filter, 'filter')
    const products = await Product.find(filter);
    console.log(products)
    return res.render('shoppage', { product: products, category: cat });

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
      // Create new cart if it doesn't exist
      cart = new cartSchema({
        userId: user._id,
        items: [{
          productId: product._id,
          quantity,
          price: product.salePrice,
          totalPrice: product.salePrice * quantity,
        }]
      });
      cart.calculateTotalPrice();
      await cart.save();
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
          totalPrice: product.salePrice * quantity,
        });
      }
      cart.calculateTotalPrice();
      await cart.save();
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
        return res.render('addtocart', { combineddata: [], quantity: '', totalPrice: 0 })
      }
      const message = req.session.message;
      req.session.message = null
      const item = isexist.items.map(item => item.productId)
      const quantity = isexist.items.map(item => item.quantity)
      const products = await Product.find({ _id: { $in: item } });
      const populatedCart = await cartSchema.findOne({ userId: user._id }).populate('items.productId');
      const combineddata = products.map((product, index) => ({
        ...product._doc,
        quantity: quantity[index]
      }))
      return res.render('addtocart', { combineddata: populatedCart.items, quantity, totalPrice: isexist?.totalPrice, message: message })
    }

    else {
      const isexist = await cartSchema.findOne({ userId: user._id })
      if (isexist == null) {
        return res.render('addtocart', { combineddata: [], quantity: '', totalPrice: 0 })
      }
      const item = isexist.items.map(item => item.productId)
      const quantity = isexist.items.map(item => item.quantity)
      console.log(quantity, 'quantity')
      const products = await Product.find({ _id: { $in: item } });
      console.log(products, 'products')
      const populatedCart = await cartSchema.findOne({ userId: user._id }).populate('items.productId');
      const combineddata = products.map((product, index) => ({
        ...product._doc,
        quantity: quantity[index]
      }))
      return res.render('addtocart', { combineddata: populatedCart.items, quantity, totalPrice: isexist?.totalPrice, message: '' })
    }



  } catch (error) {
     console.error('error from homecontroller',error)
  }
}


const updatequantity = async (req, res) => {
  const quantity = parseInt(req.body.quantity)
  const id = req.body.productId
  const user = req.session.User
  try {
    const cart = await cartSchema.findOne({ userId: user._id })
    const item = cart.items.find(item => item._id == id)
    if (item) {
      item.quantity = quantity;
      item.totalPrice = item.quantity * item.price;
      cart.calculateTotalPrice();
      const saved = await cart.save()
      if (saved) {
        const total = saved.calculateTotalPrice()
        res.status(200).json({ success: true, total })
      }

    }


  } catch (error) {
    console.error('error from updatequantity', error)

  }
}


const checkoutpage = async (req, res) => {
  const userid = req.session.User;
   if(!userid){
    req.session.message = 'Please login';
    return res.redirect('/user/login');
   }
  try {
 
    // Check if user is blocked
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
        console.log(item.productId, 'this product')
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
    const address = await addressSchema.Address.find({userId:userid._id})
    const addresses = address.map(address=>address.address)
    return res.render('checkoutpage',{product,total,address:addresses,message});
    }
    const cart = await cartSchema.findOne({userId:userid._id}).populate('items.productId')
    const product = cart.items.map(item=>item.productId)
    const total = cart.totalPrice
    const address = await addressSchema.Address.find({userId:userid._id})
    const addresses = address.map(address=>address.address)
    return res.render('checkoutpage',{product,total,address:addresses});
  } catch (error) {
    console.error('Error in checkout page:', error);
    return res.status(500).send('An error occurred.');
  }
};

const deletecartbutton = async(req,res)=>{
  const productId = req.params.id
  const user = req.session.User
  try {
    console.log(productId)
     const cart = await cartSchema.findOne({userId:user._id})
     const product = cart.items.filter(item=>item.productId.toString() !== productId)
     cart.items = product
     cart.calculateTotalPrice()
     const cartTotal = cart.totalPrice
    const saved = await cart.save()
    if(saved){
      res.json({
        success: true,
        cartTotal: cartTotal,
      });
    }
     console.log(product,'product')
     console.log(cart)
    console.log('hello')
  } catch (error) {
    
  }
}

const searchmain = async(req,res)=>{
  try {
    const searchval = req.query.query
    console.log(searchval)
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
      console.log(exitsaddress,'exitst ad')
      if(exitsaddress){
        console.log('already exite')
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
        console.log(save,'save')
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
          console.log(orderededuser,'ordereduser')
          const totalPrice = orderededuser.totalPrice
          const address = req.session.address
          req.session.address = null
          const orderedItems = orderededuser.items.map(item=>({
            product : item.productId,
            quantity : item.quantity,
            price : item.price,
          }))
              const newOrder = new orderSchema({
                userId: user._id,
                orderedItems:orderedItems,
                totalPrice: totalPrice,
                finalAmount:totalPrice,
                address:address,
                status:"Pending", // Default status is 'Pending' if not provided
                invoiceDate: new Date(),
                couponApplied:false,
              });
            const saved =  await newOrder.save();
            if(saved){
              const orderededuser = await cartSchema.findOne({userId:user._id}).populate('items.productId')
              updateQuantities(orderededuser.items)
              const remove = await cartSchema.deleteOne({userId:user._id})
              if(remove){
                console.log('removed')
                
              }
            }
              
        }
        else{
          const orderededuser = await cartSchema.findOne({userId:user._id})
          console.log(orderededuser,'ordereduser')
          const totalPrice = orderededuser.totalPrice
          const address = req.session.newaddress
          req.session.newaddress = null
          const orderedItems = orderededuser.items.map(item=>({
            product : item.productId,
            quantity : item.quantity,
            price : item.price,
          }))
              const newOrder = new orderSchema({
                userId: user._id,
                orderedItems:orderedItems,
                totalPrice: totalPrice,
                finalAmount:totalPrice,
                address:address,
                status:"Pending", 
                invoiceDate: new Date(),
                couponApplied:false,
              });
              await newOrder.save();
              console.log("New Order Created:", newOrder);
              console.log(newOrder,'neworeder')
            console.log(data,'data')
          console.log(req.body)
        }
      }
      else{
        req.session.message = 'user Not found'
        return res.redirect('/user/login')
      }

    }
    else{
      console.log('hakeem brototype')
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
}