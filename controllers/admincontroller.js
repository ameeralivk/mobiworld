
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const user = require('../models/user')
const { query } = require("express")
const connectDB = require('../config/db')
const orderschema = require('../models/orderSchema')
const userschema = require('../models/user')
connectDB()

const loadlogin = async (req,res)=>{
    try {
        if(req.session.message){
            const message = req.session.message;
            req.session.message = null
           return res.render('admin-login',{message})
        }
        if(req.session.data){
            return res.redirect('/admin/dashboard')
        }
        res.render('admin-login',{message:null})
    }
     catch (error) {
        console.log('error from admincontroller',error)
    }
}
const dashboard = async(req,res)=>{
   return res.render('dashboard')
}


const logout = async (req,res)=>{
try {
    req.session.data = null
    console.log(req.session.data)
    res.render('admin-login',{message:''})
} catch (error) { 
    console.log("error occured at admincontroller",error);
    
}

}



const loadusers = async(req,res)=>{
    const users = await user.find({})
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const paginatedData = await getPaginatedData(page, limit);
   

    res.render('users', {
        users:paginatedData.data,
        data: paginatedData.data,
        totalPages: paginatedData.totalPages,
        currentPage: paginatedData.currentPage,
        limit,
        clearInput:false,
    });




}
const loginverification = async(req,res)=>{
    const {email,password} = req.body
    const admin = await user.findOne({isAdmin:true,email:email})
    try {
        if(!admin){
            req.session.message = "Not an Admin"
            return res.redirect('/admin/login')
    
        }
        if(admin){
            const isMatch = await bcrypt.compare(password, admin.password);
            if(!isMatch){
                req.session.message = "password Not Match"
                return res.redirect('/admin/login')
            }
            req.session.data = admin
           return res.redirect('/admin/dashboard')
        }
        else{
           return res.redirect('/admin/login')
        }
      
       
    } catch (error) {
        console.log(error)
    }
}
const blockUnblock = async(req,res)=>{
    const users = await user.findById(req.params.id)
    try {
        if(users.isBlocked == true){
            users.isBlocked = false;
            await users.save()
        }
        else{
            users.isBlocked = true;
            await users.save()
        }
        res.redirect('/admin/users')
    } catch (error) {
        console.log(error)
    }
}
const  searchuser = async(req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const paginatedData = await getPaginatedData(page, limit);
    const searchquary = req.query.Search
    const users = await user.find({ name: { $regex: searchquary, $options: 'i' } }).sort({createdOn:-1});
try {
    return res.render('users',{  users,
                                 data:paginatedData.data,
                                 totalPages:paginatedData.totalPages,
                                 currentPage:paginatedData.currentPage,
                                 limit,
                                 clearInput:false,})
} catch (error) {
    console.log(error)
}
}
const clear = async(req,res)=>{
    const users = await user.find({}).sort({createdOn:-1})
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const paginatedData = await getPaginatedData(page, limit);
    try { 
        res.redirect('/admin/users')
    } catch (error) { 
        console.log(error)         
    }
}



async function getPaginatedData(page, limit) {
    try {
        const skip = (page - 1) * limit;
        const data = await user.find().sort({createdOn:-1}).skip(skip).limit(limit).exec();
        const totalDocuments = await user.countDocuments();

        return {
            data,
            totalPages: Math.ceil(totalDocuments / limit),
            currentPage: page,
        };
    } catch  {
        console.error('Error fetching paginated data:', error);
        return {
            data: [],
            totalPages: 0,
            currentPage: page,
            totalDocuments: 0,
        };
    }
        
}

const SalesReport = async(req,res)=>{
    try {
        const users = await userschema.countDocuments()
        const orders = await orderschema.find({$or: [{ status: "Confirmed" }, { status: "Delivered" },{ status: "Return Request" }]}).populate("orderedItems.product").populate({path:"orderedItems.product",populate:{path:"brand"},})
        const PendingOrders = await orderschema.find({status:"Pending"}).countDocuments()
        let totalPurchasedItems = 0;
        let totalSales = 0
        orders.forEach(order => {
            order.orderedItems.forEach(item => {
                totalPurchasedItems += item.quantity;
            });
            totalSales += (order.totalPrice + order.totalGST) - (order.discount || 0)
        });
        res.render('salesReportPage',{orders,users,totalPurchasedItems,totalSales,PendingOrders})
    } catch (error) {
        console.error('error from salesReport admincontroller',error)
    }
}


module.exports ={
    loadlogin,
    loginverification,
    dashboard,
    loadusers,
    blockUnblock,
    searchuser,
    clear,  
    logout,
    SalesReport,
}