const mongoose = require("mongoose");

const{Schema} = mongoose;
const CouponSchema = new Schema({
    name:{
        type:String,
        required: true,
        unique:true,
    },
    createdOn : {
       type:Date,
       default:Date.now,
       required:true,
    },
    usage:{
        type:Boolean,
        required:true,
        default:false,
    },
    discountType:{
        type:String,
        required:true,
        enum:["percentage","fixed"]
    },
    discountValue: {
        type: Number,
        required: true,
    },
    status:{
        type:Boolean,
        required:true,
        default:true,
    },
    expiredOn :{
        type:Date,
        required:true
    },
    minimumPrice:{
        type:Number,
        required:true,
    },
    maxDiscount:{
        type:Number,
        required:true,
    },
    isList:{
        type:Boolean,
        default:true
    },
    userId:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    }],
    appliesTo: {
        type: String,
        required: true,
        enum: ["all", "category", "brand","product"], 
        default: "all"
    },
    categoryId: [{ 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: function() { return this.appliesTo === "category"; }, 
    }],
    brandId: [{ 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Brand',
        required: function() { return this.appliesTo === "brand"; },
    }],
    productId:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
    }],
})
CouponSchema.pre('validate', function (next) {
    if (this.categoryId?.length) {
        this.appliesTo = "category";
    } else if (this.brandId?.length) {
        this.appliesTo = "brand";
    } else if (this.productId?.length) {
        this.appliesTo = "product";
    } else {
        this.appliesTo = "all";
    }
    next();
});
const Coupon = mongoose.model("Coupon",CouponSchema)
module.exports = Coupon;