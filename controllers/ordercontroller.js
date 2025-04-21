const User = require('../models/user')
const orderSchema = require('../models/orderSchema')
const addressschema = require('../models/addressSchema')
const productschema = require('../models/productSchema')
const walletSchema = require('../models/walletSchem')
const Product = require('../models/productSchema')
const getorders = async (req, res) => {
    console.log("hi")
    const ITEMS_PER_PAGE = 10; 
    try {
        const page = parseInt(req.query.page) || 1;

        const totalOrders = await orderSchema.countDocuments();
    
        const totalPages = Math.ceil(totalOrders / ITEMS_PER_PAGE);
    
        const orders = await orderSchema
        .find()
        .sort({ createdOn: -1 }) // Sort by latest createdOn date
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE)
        .populate('userId')
        .populate('orderedItems.product');
      
        console.log(orders,'order')
    
        res.render('order', {
          orders,
          currentPage: page,
          totalPages
        });
    
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
            // if(order.status == "Returned" ){
            //     for (const item of order.orderedItems) {
            //         await Product.findByIdAndUpdate(item.product, {
            //             $inc: { quantity: item.quantity }
            //         });
            //     }
            //     if((order.paymentMethod == "Online Payment"||order.paymentMethod=="Wallet Transfer"||order.paymentMethod =="Cash ON Delivery") ){
            //         let wallet = await walletSchema.findOne({ userId: user._id });
            //         const method = order.paymentMethod 
            //         if (!wallet) {
            //           console.log('Creating new wallet entry');
            //           wallet = new walletSchema({
            //             userId: user._id,
            //             transaction: [{
            //               Total: (order.totalPrice) - (order.discount || 0),
            //               Type: 'Credit',
            //               description:`${method} Returned Amount`,
            //               orderId:order._id,
            //             }]
            //           });
            //         } else {
            //           console.log('Updating existing wallet');
            //           wallet.transaction.push({
            //             description:`${method} Returned Amount`,
            //             Total: (order.totalPrice ) - (order.discount || 0),
            //             Type: 'Credit',
            //             orderId:order._id,
            //           });
            //         }
              
            //         await wallet.calculateWalletTotal(); 
            //         await wallet.save();
            //         console.log('Wallet updated:', wallet);
            //     }
            //     }
            // return res.status(200).json({ message: 'status updated successfully', order: order })
            if (order.status === "Returned") {
                let totalReturnAmount = 0;

                for (const item of order.orderedItems) {
                    if (item.returnStatus === "Approved" || item.returnStatus === "Rejected") continue;
                    await Product.findByIdAndUpdate(item.product, {
                        $inc: { quantity: item.quantity }
                    });
                    totalReturnAmount += item.quantity * item.price;
                }
                if (
                    (order.paymentMethod === "Online Payment" ||
                    order.paymentMethod === "Wallet Transfer" ||
                    order.paymentMethod === "Cash ON Delivery") &&
                    totalReturnAmount > 0
                ) {
                    let wallet = await walletSchema.findOne({ userId: user._id });
                    const method = order.paymentMethod;

                    const transaction = {
                        Total: totalReturnAmount - (order.discount || 0),
                        Type: 'Credit',
                        description: `${method} Returned Amount`,
                        orderId: order._id,
                    };

                    if (!wallet) {
                        wallet = new walletSchema({
                            userId: user._id,
                            transaction: [transaction]
                        });
                    } else {
                        wallet.transaction.push(transaction);
                    }

                    await wallet.calculateWalletTotal();
                    await wallet.save();
                    console.log('Wallet updated:', wallet);
                }
            }

            return res.status(200).json({ message: 'Status updated successfully', order });
        }

    } catch (error) {
        console.error('error from  ordercontroller', error)
    }
}
const orderdetails = async (req, res) => {
    const orderid = req.params
    console.log(orderid,'orderid')
    const order = await orderSchema.findOne({ orderId: orderid.id }).populate('orderedItems.product')
    console.log(order,'order')
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
// const statusfilter = async(req,res)=>{
//    const {status} = req.body
//     try {
//         if(status == "All"){
//             const order = await orderSchema.find({}).populate('userId')
//             if(order){
//               return  res.status(200).json({data:order})
//             }
//         }
//         const order = await orderSchema.find({status:status}).populate('userId')
//         if(order){
//           return  res.status(200).json({data:order})
//         }
//     } catch (error) {
//         console.error('error from statusfilter',error)
//     }
// }

const statusfilter = async (req, res) => {
    const { status } = req.body;
  
    try {
      let orders = [];
  
      if (status === "All") {
        orders = await orderSchema.find({}).populate('userId').populate('orderedItems.product');
      } 
      else if (status === "return-requested") {
        orders = await orderSchema.find({ 'orderedItems.returnStatus': 'Requested' })
          .populate('userId')
          .populate('orderedItems.product');
          console.log(orders,'1')
      } 
      else if (status === "return-rejected") {
        orders = await orderSchema.find({ 'orderedItems.returnStatus': 'Rejected' })
          .populate('userId')
          .populate('orderedItems.product');
          console.log(orders,'2')
      } 
      else if (status === "return-mixed") {
        const allOrders = await orderSchema.find({})
          .populate('userId')
          .populate('orderedItems.product');
          console.log(orders,'3')
  
        orders = allOrders.filter(order => {
          const returnStatuses = new Set();
          order.orderedItems.forEach(item => {
            if (item.returnStatus) returnStatuses.add(item.returnStatus);
          });
          return returnStatuses.size > 1; // Mixed if more than one unique status
        });
      } 
      else {
        let baseOrders = await orderSchema.find({ status: status })
          .populate('userId')
          .populate('orderedItems.product');
      
        // Optional: exclude orders that have return statuses
        if (status === "Delivered" || status === "Pending" || status === "Cancelled") {
          baseOrders = baseOrders.filter(order =>
            order.orderedItems.every(item => !item.returnStatus)
          );
        }
      
        return res.status(200).json({ data: baseOrders });
      }
  
      return res.status(200).json({ data: orders });
  
    } catch (error) {
      console.error('Error from statusfilter:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
  

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
    const user = req.session.User;
    const { orderId } = req.body; 

    try {
        const order = await orderSchema.findOne({ orderId })
            .populate('userId')
            .populate('orderedItems.product');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.status === 'Cancelled') {
            return res.status(400).json({ message: 'Order is already cancelled' });
        }

        // Refund if payment method was online/wallet
        if (order.paymentMethod === "Online Payment" || order.paymentMethod === "Wallet Transfer") {
            const wallet = await walletSchema.findOne({ userId: user._id });
            const refundAmount = order.totalPrice - (order.discount || 0)-(order.couponDiscount || 0);

            if (!wallet) {
                const newWallet = new walletSchema({
                    userId: user._id,
                    transaction: [{
                        Total: refundAmount,
                        Type: "Credit",
                        description: "Amount On Cancelling",
                        orderId: order._id,
                    }]
                });
                await newWallet.calculateWalletTotal();
                await newWallet.save();
            } else {
                wallet.transaction.push({
                    Total: refundAmount,
                    Type: "Credit",
                    description: "Amount On Cancelling",
                    orderId: order._id
                });
                await wallet.calculateWalletTotal();
                await wallet.save();
            }
        }

        // Restock products
        await Promise.all(order.orderedItems.map(async (item) => {
            if (!item.product) return;
            await Product.updateOne(
                { _id: item.product._id },
                { $inc: { quantity: item.quantity } }
            );
        }));

        // Update order status
        await orderSchema.updateOne(
            { _id: order._id },
            { $set: { status: 'Cancelled' } }
        );

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