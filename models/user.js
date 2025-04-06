const mongoose = require('mongoose');
const {Schema} = mongoose;
const userschema = new Schema ({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    password:{
        type:String,
        required:false,
    },
    phone: {
        type: String,
        required:false,
        unique:false,
        sparse:true,
        default:null,
    },
    // googleId:{
    //     type : String,
    //     required:false,
    //     unique : true,
    //     sparse:true,
    // },
    googleId:{
        type:String,
        unique:true,
        required:false,
        sparse:true,
    },
    isBlocked:{
        type : Boolean,
        default : false,
    },
    isAdmin : {
        type: Boolean,
        default : false,
    },
    cart:[{
        type:Schema.Types.ObjectId,
        ref:"Cart",
    }],
    wallet:{
        type:Number,
        default:0,
    },
    isGoogleUser:{
       type: Boolean,
       default:false,
    },
    wishlist:[{
        type:Schema.Types.ObjectId,
        ref: 'Wishlist'
    }],
    orderHistory:[{
        type: Schema.Types.ObjectId,
        ref:"Order"
    }],
    createdOn:{
        type:Date,
        default:Date.now
    },
    referalCode:{
        type:String,
    },
    redeemed:{
        type:Boolean
    },
    redeemedUsers:[{
       type : Schema.Types.ObjectId,
       ref:"User"
    }],
    searchHistory:[{
        category: {
            type:Schema.Types.ObjectId,
            ref:"Category",
        },
        brand:{
            type:String
        },
        searchOn : {
            type: Date,
            default: Date.now
        }
    }]
})


const user = mongoose.model('user',userschema)
module.exports = user