const session = require('express-session')
const userschema = require('../models/user')
const bcrypt = require('bcrypt')
const salt = 10
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
    const {name,email,password} = req.body
    
    const isexist = await userschema.findOne({email})

  try {
    
    if(isexist){
        req.session.msg = "user already exists"
        res.redirect('register')
    }
    else{
        

        const hashedpass = await bcrypt.hash(password,salt)
        const newUser = new userschema({
            name,
            email,
            password:hashedpass
        })
        await newUser.save()
        req.session.msg = "user created successfully"
        res.redirect('login')

    }
    
  } catch (error){
      console.log(error)
  }
}

module.exports = { 
    loadregisterpage,
    login,
    register,
}