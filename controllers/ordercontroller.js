const User = require('../models/user')
const orderSchema = require('../models/orderSchema')
const addressschema = require('../models/addressSchema')


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
        const order = await orderSchema.findOne({orderId:orderId.trim()})
        order.status = status
      const saved =  order.save()
      if(saved){
        return res.status(200).json({message:'status updated successfully',order:order})
      }

    } catch (error) {
        console.error('error from  ordercontroller',error)
    }
 }
 const orderdetails = async(req,res)=>{
    const orderid = req.params
    const order = await orderSchema.findOne({orderId:orderid.id}).populate('orderedItems.product') 
    const  addressIdFromOrder = order.address
    const address = await addressschema.Address.findOne({
        "address._id": addressIdFromOrder
      }).exec();
    console.log(order,'order')  
    try { 
        res.status(200).json({order:order,address})
    } catch (error) {
        console.error(error)
    }
 }
module.exports ={  
    getorders,
    updatestatus,
    orderdetails,
}