const User = require('../models/user')
const orderSchema = require('../models/orderSchema')


const getorders = async(req,res)=>{
    const orders = await orderSchema.find().populate('userId').populate('orderedItems.product')
    console.log(orders)  
    try {
        res.render('order',{orders})  
    } catch (error) { 
        console.error('error from admin order page ',error) 
    } 
} 
 const updatestatus = async(req,res) =>{
    const { orderId, status } = req.body;    
    try { 
        console.log(orderId,status)   
    } catch (error) {
        console.error('error from  ordercontroller',error)
    }
 }
module.exports ={  
    getorders,
    updatestatus,
}