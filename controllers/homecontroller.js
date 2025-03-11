const nodemailer = require('nodemailer')
const Product = require('../models/productSchema')
const userschema = require('../models/user')
const addressSchema = require('../models/addressSchema')
const getproductmainpage = async (req, res) => {
  console.log(req.params)
  const { id } = req.params
  const product = await Product.findById(id)
  const priceless = product.salePrice - 15000
  const pricemore = product.salePrice + 15000
  const recomended = await Product.find({ salePrice: { $gte: priceless, $lte: pricemore }, _id: { $ne: product._id } })
  try {
    console.log('hi')
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
     const addresses = await addressSchema.Address.find({})
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
}