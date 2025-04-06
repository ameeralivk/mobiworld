const User = require('../models/user')
const orderSchema = require('../models/orderSchema')
const addressschema = require('../models/addressSchema')
const productschema = require('../models/productSchema')
const walletSchema = require('../models/walletSchem')
const Product = require('../models/productSchema')
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
        const user = req.session.User
        const order = await orderSchema.findOne({ orderId: orderId.trim() })
        order.status = status
        const saved = order.save()
        if (saved) {
            if(order.status == "Returned" ){
                if((order.paymentMethod == "Online Payment"||order.paymentMethod=="Wallet Transfer") ){
                    let wallet = await walletSchema.findOne({ userId: user._id });
                    const method = order.paymentMethod 
                    if (!wallet) {
                      console.log('Creating new wallet entry');
                      wallet = new walletSchema({
                        userId: user._id,
                        transaction: [{
                          Total: (order.totalPrice + order.totalGST) - (order.discount || 0),
                          Type: 'Credit',
                          description:`${method} Returned Amount`
                        }]
                      });
                    } else {
                      console.log('Updating existing wallet');
                      wallet.transaction.push({
                        Total: (order.totalPrice + order.totalGST) - (order.discount || 0),
                        Type: 'Credit',
                      });
                    }
              
                    await wallet.calculateWalletTotal(); 
                    await wallet.save();
                    console.log('Wallet updated:', wallet);
                }
                }
            return res.status(200).json({ message: 'status updated successfully', order: order })
        }

    } catch (error) {
        console.error('error from  ordercontroller', error)
    }
}
const orderdetails = async (req, res) => {
    const orderid = req.params
    console.log(orderid,'orderid')
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
        if(status == "All"){
            const order = await orderSchema.find({}).populate('userId')
            if(order){
              return  res.status(200).json({data:order})
            }
        }
        const order = await orderSchema.find({status:status}).populate('userId')
        if(order){
          return  res.status(200).json({data:order})
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
const cancelorder = async (req, res) => {
    const user = req.session.User
    const { orderId } = req.body; 
    try {
        const order = await orderSchema.findOne({ orderId })
            .populate('userId')
            .populate('orderedItems.product');
        if(order.paymentMethod === "Online Payment" || order.paymentMethod === "Wallet Transfer"){
            const find = await walletSchema.findOne({userId:user._id})
            console.log(find,'find')
            if(!find){
                const newWallet = new walletSchema({
                    userId:user._id,
                    transaction:[{
                        Total:(order.totalPrice+order.totalGST)-(order.discount?order.discount:0),
                        Type:"Credit",
                        description:"Amount On Cancelling"
                    }]
                })
                await orderSchema.deleteOne({ _id: order._id });
                await newWallet.calculateWalletTotal()
               await newWallet.save()
            }
            console.log('ready')
            find.transaction.push({
                Total:(order.totalPrice+order.totalGST)-(order.discount?order.discount:0),
                Type:"Credit",
                description:"Amount On Cancelling",
            })
            await orderSchema.deleteOne({ _id: order._id });
            await find.calculateWalletTotal()
           await find.save()
        }
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        await Promise.all(order.orderedItems.map(async (item) => {
            if (!item.product) return; 

            await Product.updateOne(
                { _id: item.product._id },
                { $inc: { quantity: item.quantity } } 
            );
        }));
        await orderSchema.deleteOne({ _id: order._id });
        const orders = await orderSchema.find({}).populate('userId').populate('orderedItems.product');
        res.status(200).json({ message: "Order cancelled successfully", data: orders });

    } catch (error) {
        console.error('Error from ordercontroller:', error);
        res.status(500).json({ message: 'Server error' });
    } 
};


module.exports = {
    getorders,
    updatestatus,
    orderdetails,
    searchorder,
    statusfilter,
    Datefilter,
    cancelorder,
}