const nodemailer = require('nodemailer')
const Product = require('../models/productSchema')
const userschema = require('../models/user')
const addressSchema = require('../models/addressSchema')
const { render } = require('ejs')
const { compareSync } = require('bcrypt')
const cartSchema = require('../models/cartSchema')
const Cart = require('../models/cartSchema')




const getproductmainpage = async (req, res) => {
  console.log(req.params)
  const { id } = req.params
  req.session.code = id
  const product = await Product.findById(id)
  const priceless = product.salePrice - 15000
  const pricemore = product.salePrice + 15000
  const recomended = await Product.find({ salePrice: { $gte: priceless, $lte: pricemore }, _id: { $ne: product._id } })
  try {
    res.render('productmainpage', { product: product, recomended: recomended })
  } catch (error) {

  }
}
const getfilterpage = async (req, res) => {
  try {
    const { category, priceFrom, priceTo } = req.query;
    let filter = {}
    if (category) {
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
      const newuser = await userschema.findByIdAndUpdate(user._id, {email:newusername})
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


const addresspage = async(req,res)=>{
     const user = req.session.User
     const addresses = await addressSchema.Address.find({userId:user._id})
     console.log(addresses)
  try {
    if(req.session.message){
      const message = req.session.message
      req.session.message = null 
     return res.render('addresspage',{message,addresses})
    }
    return res.render('addresspage',{message:'',addresses})
  } catch (error) {
    console.error('error from usernameedit',error)
  }
}

const addaddress = async(req,res)=>{
  try {
    res.render('addaddress')
  } catch (error) {
    
  }
}

const registeraddress = async(req,res)=>{
  const user = req.session.User
  const data = req.body
  console.log(user)
  try {
      if(user){
        const adduser = new addressSchema.Address({
          userId:user._id,
          address:[{
            addressType:data.address,
            name:data.name,
            city:data.City,
            pincode:data.pincode,
            phone:data.phone, 
            altPhone:data.altphone,
            state:data.state,
          }] 
        })
       const save = await adduser.save()
       if(save){
        req.session.message = 'address created succesfully'
          res.redirect('/user/addresspage')
       }
       else{
        req.session.message = 'addresss created failed'
        res.redirect('/user/addresspage')
       }
      }
      else{
        req.session.message = 'user not found'
        res.redirect('/user/addresspage')
      }
     
  } catch (error) { 
    console.error('error from homecontroller regesteraddress',error)
  }
}

const editaddress = async(req,res)=>{
  const {id} = req.params
  console.log(id)
 const address = await addressSchema.Address.findOne({_id:id})
 console.log(address)
  try {
    res.render('editaddress',{address:address.address[0]})
  } catch (error) {
    console.log('error from homecontroller',error)
  }
}
const editaddresspost = async(req,res)=>{
  const {id} = req.params
  console.log(id)
  const {name,state,address,City,pincode,phone,altphone} = req.body
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
    if(result){
      req.session.message = 'address edited successfully'
      res.redirect('/user/addresspage')
    }
    else{
      req.session.message = 'address edited failed'
      res.redirect('/user/addresspage')
    }
  } catch (error) {
    console.log('error from homecontroller editaddresspost',error)
  }
}

const deleteaddress = async(req,res)=>{
  const {id} = req.params
  try {
    const isdeleted = await addressSchema.Address.findByIdAndDelete(id)
    if(isdeleted){
      req.session.message = 'Address deleted successfully'
      res.redirect('/user/addresspage')
    }
    else{
      req.session.message = 'Address deletion failed'
      res.redirect('/user/addresspage')
    }
  } catch (error) {
    console.error('error from home controller',error)
  }
}

const addtocart = async(req,res)=>{
  const user = req.session.User
  if(user){
    const { productId, quantity } = req.body;
    const redirectUrl = `/user/addtocartpage/${productId}/${quantity}`
    try {
    return  res.status(200).json({ message: 'Item added to cart successfully!', redirectUrl})
      
    } catch (error) {
      console.error('error from homecontrller addtocart',error)
    }
  }
  req.session.message = 'user not found'
  return res.status(200).json({redirectUrl:'/user/login'})
}



const addtocartpage = async(req,res)=>{
     const product = await Product.findOne({_id:req.params.id})
     const user = req.session.User
     const isexist = await cartSchema.find({userId:user._id})
     const quantity = req.params.quantity
  try {
      if(isexist.length == 0){
        console.log('ready')
         const newcartschema = new cartSchema({
          userId:user._id,
          items:[{
            productId:product._id,
            quantity:quantity,
            price:product.salePrice,
            totalPrice:product.salePrice * quantity,
          }]
         })
         newcartschema.calculateTotalPrice();
        const saved = await newcartschema.save()
        if(saved){
          const item =newcartschema.items.map(item=>item.productId)
          const products = await Product.find({ _id: { $in: item } });
          const combineddata = products.map((product,index)=>({
            ...product._doc,
           quantity:quantity[index]
         }))
          return res.render('addtocart',{combineddata,quantity,totalPrice:isexist[0]?.totalPrice||newcartschema.items[0].totalPrice})
        }
      
      }else{
        const isexist = await cartSchema.find({userId:user._id})
            console.log(isexist,'isexist')
            const item =isexist[0].items.map(item=>item.productId)
            const product = await Product.findOne({_id:req.params.id})
        const includes = item.some(id=>id.toString() === product._id.toString())
          if(includes != true){
            isexist[0].items.push({
              productId:product._id,
              quantity:quantity,
              price:product.salePrice,
              totalPrice:product.salePrice * quantity,
            })
            isexist[0].calculateTotalPrice();
          const saved = await isexist[0].save()
          
          if(saved){
            const isexist = await cartSchema.findOne({userId:user._id})
            const item =isexist.items.map(item=>item.productId)
            const product = await Product.findOne({_id:req.params.id})
            const quantity = isexist.items.map(item=>item.quantity)
            const products = await Product.find({ _id: { $in: item } });
            const combineddata = products.map((product,index)=>({
              ...product._doc,
             quantity:quantity[index]
           }))
            return res.render('addtocart',{combineddata,quantity,totalPrice:isexist?.totalPrice||newcartschema.items.totalPrice})
          }
          }
          else{
            const user = req.session.User
              const cart = await cartSchema.findOne({userId:user._id})
              const product = await Product.findOne({_id:req.params.id})
              const item = cart.items.find(item => item.productId == req.params.id )
              const total = item.quantity+ parseInt(req.params.quantity)
              item.quantity = total
              const update = item.totalPrice = item.quantity * product.salePrice
              cart.calculateTotalPrice()
              await cart.save()
              if(update){
                const isexist = await cartSchema.findOne({userId:user._id})
                const item =isexist.items.map(item=>item.productId)
                const quantity = isexist.items.map(item=>item.quantity)
                const products = await Product.find({ _id: { $in: item } });
                const combineddata = products.map((product,index)=>({
                  ...product._doc,
                 quantity:quantity[index]
               }))
                return res.render('addtocart',{combineddata,quantity,totalPrice:isexist?.totalPrice||newcartschema.items.totalPrice})
                console.log('upadated successfully')
              }
          }
         
      }
   
  } catch (error) {
    console.error('error from the homecontroller',error)
  }
}
const getcart = async (req,res)=>{
  const user = req.session.User
try {
  console.log('hello')
  const isexist = await cartSchema.findOne({userId:user._id})
  console.log(isexist)
  if(isexist == null){
    res.render('addtocart',{combineddata:[],quantity:'',totalPrice:0})
  }
  else{
    const item =isexist.items.map(item=>item.productId)
    console.log(isexist.items,'exitst item')
    const quantity = isexist.items.map(item=>item.quantity)
    const products = await Product.find({ _id: { $in: item } });
    const combineddata = products.map((product,index)=>({
       ...product._doc,
      quantity:quantity[index]
    }))
    console.log(quantity,'quantity')
   res.render('addtocart',{combineddata,quantity,totalPrice:isexist?.totalPrice})
   console.log('hi')
  }
 
} catch (error) {
  
}
}


const updatequantity = async(req,res)=>{

  const quantity =parseInt(req.body.quantity) 
  const id = req.body.productId
  const user = req.session.User
  console.log(user)
  try {
        const cart = await cartSchema.findOne({userId:user._id})
        const item = cart.items.filter(item => item.productId == id)
        if (item.length > 0 ) {
         item[0].quantity = quantity; 
         item[0].totalPrice = item[0].quantity * item[0].price; 
          cart.calculateTotalPrice();
         const saved = await cart.save()
         if(saved){
          res.status(200).json({redirectUrl:'/user/getcart'})
         }
   
       



      }
    
  
  } catch (error) {
    console.error('error from updatequantity',error)
    
  }
} 


const checkoutpage = async(req,res)=>{
  const userid = req.session.User
  const user = await userschema.find({_id:userid._id,isBlocked:false})
  try {
    console.log(user.length)
    if(user.length > 0){
      const cart = await cartSchema.find({userId:userid})
      const item = cart[0].items.map(item => item.productId)
      const productfind = await Product.find({_id:{$in:item},isBlocked:false,isDeleted:false})
      console.log(productfind.length)
      if(productfind.length == 0){
        console.log('hello amere')
        const message = 'Product is blocked'
        res.render('addtocart',{message,combineddata:[],quantity:0,totalPrice:0})
      }
      else{
        res.render('checkoutpage')
      }
      
    }
    else{
      const message = 'user is blocked'
      res.render('login',{message})
    }
   
  } catch (error) {
    
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
  addtocartpage,
  getcart,
  updatequantity,
  checkoutpage,
}