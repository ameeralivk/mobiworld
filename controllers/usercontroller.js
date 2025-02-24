const session = require('express-session')
const userschema = require('../models/user')
const bcrypt = require('bcrypt')
const salt = 10
const nodemailer = require('nodemailer')
const env = require('dotenv').config()
const loadregisterpage = async(req,res)=>{
    try {
        let message;
        if(req.session.msg){
            message = req.session.msg
            req.session.msg = null
        }

        return res.render('register',{ message })
        
    } catch (error) {
        console.log('home page not found')
        res.status(500).send('server error')
        
    }
}
const login = async(req,res)=>{
    try {
        let message;
        if(req.session.msg){
             message = req.session.msg
            req.session.msg = null
        }
        return res.render('login',{ message })
        
    } catch (error) {
        console.log('home page not found')
        res.status(500).send('server error')
        
    }
}
const register = async(req,res)=>{
    const {name,email,password,phone} = req.body
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
        req.session.msg = "user already exists"
        res.redirect('register')
    }
    else{
        

        // const hashedpass = await bcrypt.hash(password,salt)
        // const newUser = new userschema({
        //     name,
        //     email,
        //     phone,
        //     password:hashedpass,
        // })
        const otp = generateotp()
        const emailsent = await sendVerificationEmail(email,otp)
        if(!emailsent){
            return res.json("email error")
        }
        req.session.userOtp = otp;
        console.log(req.session.userOtp)
        req.session.userData = {name,phone,email,password};
        res.render('verify-otp')
        console.log('OTP Sent',otp)
        
        // await newUser.save()
        // req.session.msg = "user created successfully"
        // res.redirect('login')

    }
    
  } 
  catch (error){
    console.error('signu error',error)
    res.redirect('/pageNotfound')
}
//   catch (error){
//       console.error('error for save user',error)
//       res.status(500).send("enternal server error")
//   }
}
const verifyOtp = async (req,res)=>{
    try {
        const {otp} = req.body;
        console.log(otp)
        if(otp===req.session.userOtp){
         const user = req.session.userData
         const hashedpass = await bcrypt.hash(user.password,salt)
         const newUser = new userschema({
             name:user.name,
             email:user.email,
             phone:user.phone,
             password:hashedpass,

         })
         console.log(newUser)
        await newUser.save()
        req.session.user = newUser._id;
        console.log(req.session.user)
        req.session.userOtp = null;
        req.session.userData = null;
        res.json({success:true,redirectUrl:"/"})
        console.log('hi')
        // req.session.msg = "user created successfully"
        // res.redirect('/user/login')  
        }else{
            res.status(400).json({success:false,message:"invalid Otp please try again"})
        }

    } catch (error) {
        console.error("Error Verifying OTP",error)
        res.status(500).json({success:false,message:"An Error Occured"})
    }
}

module.exports = { 
    loadregisterpage,
    login,
    register,
    verifyOtp,
}