const User = require('../models/user')
const orderSchema = require('../models/orderSchema')
const addressschema = require('../models/addressSchema')


const getorders = async (req, res) => {
    const orders = await orderSchema.find().populate('userId').populate('orderedItems.product')
    console.log(orders)
    try {
        res.render('order', { orders })
    } catch (error) {
        console.error('error from admin order page ', error)
    }
}
const updatestatus = async (req, res) => {
    const { orderId, status } = req.body;
    try {
        console.log(orderId, status)
        const order = await orderSchema.findOne({ orderId: orderId.trim() })
        order.status = status
        const saved = order.save()
        if (saved) {
            return res.status(200).json({ message: 'status updated successfully', order: order })
        }

    } catch (error) {
        console.error('error from  ordercontroller', error)
    }
}
const orderdetails = async (req, res) => {
    const orderid = req.params
    const order = await orderSchema.findOne({ orderId: orderid.id }).populate('orderedItems.product')
    const addressIdFromOrder = order.address
    const address = await addressschema.Address.findOne({
        "address._id": addressIdFromOrder
    }).exec();
    console.log(order, 'order')
    try {
        res.status(200).json({ order: order, address })
    } catch (error) {
        console.error(error)
    }
}

const searchorder = async (req, res) => {
    const { query } = req.body
    try {
        console.log(query)
        const orders = await orderSchema.find({}).populate('userId');
        const filteredOrders = orders.filter(order => {
            const matchesOrderId = order.orderId && order.orderId.toLowerCase().includes(query.toLowerCase());
            const matchesUserName = order.userId && order.userId.name && order.userId.name.toLowerCase().includes(query.toLowerCase());
            return matchesOrderId || matchesUserName;
        });
        if(filteredOrders.length>0){
            res.json({data:filteredOrders})
        }
        else{
            res.json({message:'no data available'})
        }
    } catch (error) {
         console.error(error)
    }
}
const statusfilter = async(req,res)=>{
   const {status} = req.body
    try {
        const order = await orderSchema.find({status:status}).populate('userId')
        if(order){
            res.status(200).json({data:order})
        }
    } catch (error) {
        console.error('error from statusfilter',error)
    }
}

const Datefilter = async(req,res)=>{
    const {DateFilter} = req.body
     try {
        const orders = await orderSchema.find({}).populate('userId')
        if(DateFilter === 'New-Old'){
            console.log('ready')
            orders.sort((a, b) => new Date(a.createdOn) - new Date(b.createdOn));
            res.status(200).json({data:orders})
        }
        else{
            orders.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
            res.status(200).json({data:orders})
        }
     } catch (error) {
         console.error('error from statusfilter',error)
     }
 }


module.exports = {
    getorders,
    updatestatus,
    orderdetails,
    searchorder,
    statusfilter,
    Datefilter,
}