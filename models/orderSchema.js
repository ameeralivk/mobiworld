
const mongoose = require("mongoose")
const {Schema} = mongoose
// const {v4:uuidv4} = require('uuid');
const generateOrderId = () => {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${datePart}-${randomPart}`;
  };
  


const orderSchema = new Schema({
    userId : {
        type:Schema.Types.ObjectId,
        ref : "user",
        required: true,

    },
    orderId: {
        type: String,
        default: generateOrderId,
        unique: true,
      },
    razorpayOrderId: {
        type: String,
        required:function() {
            return this.paymentMethod === "Online Payment"; 
        }
    },
    paymentMethod:{
        type:String,
        require:true,
    },
    totalGST:{
        type:Number,
        require:true,
    },
    orderedItems:[{
        product:{
            type:Schema.Types.ObjectId,
            ref:'Product',
            required:true
        },
        quantity:{
            type:Number,
            required:true,
        },
        price:{
            type:Number,
            default:0
        },
        bestOffer:{
            type:Number,
            default:0,
            required:false,
        },
        cancelledStatus:{
            type:String,
            enum:["Cancelled"],
            default:undefined,
        },
        returnStatus: {
            type: String,
            enum: ['NotRequested', 'Requested', 'Approved', 'Rejected', 'Returned'],
            default:undefined,
          },
          returnReason: { type: String, default: '' },

    }],
    totalPrice:{
     type: Number,
     required:true
    },
    returnAmound:{
        type:Number,
        default:0,
        required:false,
    },
    discount:{
        type:Number,
        default:0
    },
    finalAmount:{
        type:Number,
        required:true
    },
    // address:{
    //     type:Schema.Types.ObjectId,
    //     ref:'Address', 
    //     required:true
    // }, 
    address:[{
        addressType:{
            type : String,
            required : true,
        },
        name: {
            type: String,
            required : true,
        },
        city:{
            type: String,
            required : true,
        },
        state:{
            type: String,
            required: true,
        },
        pincode:{
            type:Number,
            required: true
        },
        phone:{
            type :String,
            required:true,
        },
        altPhone:{
            type: String,
            required:true,
        }
      }],
    invoiceDate:{ 
        type:Date
    }, 
    status:{
        type:String,
        required:true,
        enum:['Pending','processing','Shipped','Delivered','Cancelled','Confirmed','Return Request','Returned','ReturnCancelled']
    },
    createdOn:{
        type:Date,
        default:Date.now,
        required:true
    },
    couponApplied:{
        type:Boolean,
        default:false,
    },
    couponRevoked:{
        type:Number,
        default:0,
        required:false,
    },
    couponDiscount:{
        type:Number,
        default:0,
    },
    couponId:{
        type:Schema.Types.ObjectId,
        ref:'Coupon',
        required:false,          
    },
    ReturnReason:{
        type:String,
        required:false,
        
    }
})
const Order = mongoose.model("Order",orderSchema);
module.exports = Order;