const mongoose = require("mongoose");

const { Schema } = mongoose;
const OfferSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    description:{
        type:String,
        required:false,
    },
    offerType: {
        type: String,
        required: true,
        enum: ["category", "brand","product"],
    },
    discountType: {
        type: String,
        required: true,
        enum: ["percentage", "fixed"],
    },
    discountValue: {
        type: Number,
        required: true,
    },
    maxDiscount: {
        type: Number,
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: function () {
            return this.offerType === "category";
        },
    },
    brandId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Brand",
        required: function () {
            return this.offerType === "brand";
        },
    },
    prouductId:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Product",
        required: function () {
          return this.offerType === "product"
        },
    }],
    status: {
        type: Boolean,
        default: true,
    },
    expiredOn: {
        type: Date,
        required: true,
    },
    startDate:{
        type:Date,
        required:true
    }
});

const Offer = mongoose.model("Offer", OfferSchema);
module.exports = Offer;
