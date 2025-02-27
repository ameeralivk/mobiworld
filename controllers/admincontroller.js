const User = require("../models/user")
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const loadlogin = async (req,res)=>{
    if(req.session.admin){
        return res.redirect('/admin/dashboard')
    }
    res.render('admin-login',{message:null})
}

module.exports ={
    loadlogin,
}