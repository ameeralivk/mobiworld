const session = require('express-session')
const userschema = require('../models/user')
const bcrypt = require('bcrypt')
const salt = 10
const nodemailer = require('nodemailer')
const { ConnectionStates } = require('mongoose')
const env = require('dotenv').config()
const loadverify = async(req,res)=>{
   return res.render('verify-otp')
}
const pageNotFound = async (req,res)=>{
    try {
        res.render('page-404')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}
const loadregisterpage = async(req,res)=>{
    try {
        let message = '';
        if(req.session.message){
            message = req.session.message
            req.session.message = null
        }

        return res.render('register',{ message })
        
    } catch (error) {
        console.log('home page not found')
        res.status(500).send('server error')
        
    }
}
const Loadlogin= async(req,res)=>{
    try {
        
        if(req.session.User){
          return res.redirect('/')
        }
        let message = '';
        if(req.session.message){
             message = req.session.message
            req.session.message = null
        }
        return res.render('login',{ message })
        
    } catch (error) {
       res.redirect('/pageNotFound')
        
    }
}
const login = async (req,res)=>{
    try {
        const {email,password} = req.body
        const findUser = await userschema.findOne({isAdmin:0,email:email})
        if(!findUser){
            
           return res.render("login",{message:"User not found" })
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
        req.session.User = findUser._id
       return res.redirect('/')
    } catch (error) {
        console.error('login err',error);
        
       return res.render('login',{ message:"Loginfailed,please try again"})
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
        res.status(200).json({
            success: true,
            message: "OTP resended successfully",
            redirectUrl: "verify-otp"  // Change this to the desired URL
        });
        // res.status(200).json({ success: true, message: "OTP resended successfully" });
       }
      } catch (error) {
        console.error("Error in resetOtp function:", error);
        res.status(500).json({ success: false, message: "An Error Occurred" });
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
        res.status(200).json({ success: true, message: "OTP reset successfully" });

    } catch (error) {
        console.error("Error in resetOtp function:", error);
        res.status(500).json({ success: false, message: "An Error Occurred" });
    }
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
    Loadlogin,
    register,
    verifyOtp,
    resetOtp,
    resendOtp,
    loadverify,
    pageNotFound,
    login,
}