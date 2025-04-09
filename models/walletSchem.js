
const mongoose = require('mongoose')
const {Schema} = mongoose
const walletSchema = new Schema({
    userId : {
        type:Schema.Types.ObjectId,
        ref : "User",
        required: true,
    },
    WalletTotal:{
        type:Number,
        default:0,
        required:true,
    },
    transaction:[{
        Total:{
            type:Number,
            default:0,
            required:true,
        },
        Type:{
            type:String,
            enum:['Debit','Credit'],
            required:true,
        },
        createdOn:{
            type:Date,
            default:Date.now,
            required:true
        },
        description:{
            type:String,
            required:false,
        },
        orderId:{
            type:Schema.Types.ObjectId,
            ref : "Order",
            required: false,
        },
    }],
    createdOn:{
        type:Date,
        default:Date.now,
        required:true
    }, 
   
})
walletSchema.methods.calculateWalletTotal = function () {
    const total = this.transaction.reduce((acc, txn) => {
            return txn.Type === 'Credit' ? acc + txn.Total : acc - txn.Total;
       
    }, 0);

    this.WalletTotal = total;
    return total; 
};

const wallet = mongoose.model('wallet',walletSchema)
module.exports = wallet