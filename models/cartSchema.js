const mongoose = require("mongoose")
const {Schema} = mongoose;


const cartSchema = new Schema({

    userId : {
       type:Schema.Types.ObjectId,
       ref:"User",
       required:true
    },totalPrice:{
        type:Number,
        default:0,
    },
    totalGST:{
        type:Number,
        default:0,
    },
    couponDiscount: {
      type: Number,
      default: 0
    },
    couponName: {
      type: String,
      default: ''
    },
    items:[{
        productId :{
            type:Schema.Types.ObjectId,
            ref:'Product',
            required:true
        },
        quantity:{
            type:Number,
            default:1
        },
        price:{
            type:Number,
            required:true
        },
        gstPercentage: {
            type: Number,
          },
        totalPrice:{
            type:Number,
            required:true
        },
        gstAmount: {
            type: Number,
            default: 0
          },
          totalPriceWithGST: {
            type: Number,
            required: true
          },
        status:{
            type:String,
            default:'placed'
        },
        cancellationReason:{
            type:String,
            default:"none"
        },
        bestOffer:{
          type:Number,
          default:0,
          required:false,
      },
    }]
})

cartSchema.methods.calculateGST = function () {

    let totalGST = 0;
    let totalPriceWithGST = 0;
  
    this.items.forEach(item => {

      const gstAmount = (item.price * item.gstPercentage) / 100;
      item.gstAmount = gstAmount;
  
      
      const totalPrice = item.price * item.quantity;
  

      item.totalPriceWithGST = totalPrice + (gstAmount * item.quantity);
  
 
      totalGST += gstAmount * item.quantity;
  
      
      item.totalPrice = totalPrice;
    });
  
    
    this.totalGST = totalGST;
  
 
    totalPriceWithGST = this.items.reduce((sum, item) => sum + item.totalPriceWithGST, 0);
    this.totalPriceWithGST = totalPriceWithGST;
  
   
    this.calculateTotalPrice();
    return this.totalGST;
  };



cartSchema.methods.calculateTotalPrice = function () {
    this.totalPrice = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
    return this.totalPrice;
};

const Cart = mongoose.model('Cart',cartSchema)
module.exports = Cart;


cartSchema.pre("save", async function (next) {
    const cart = this;
  
    // Populate productId to get the product details (including gstPercentage)
    await mongoose.model("Product").populate(cart.items, { path: 'productId' });
  
    // After population, update the cart item with the product's gstPercentage and price
    for (let item of cart.items) {
      const product = item.productId; // After population, product is available
      item.gstPercentage = product.gstPercentage; // Populate the gstPercentage from the product
      item.price = product.price; // Populate the price from the product
    }
  
    // Recalculate GST and totals after setting prices and GST percentages
    cart.calculateGST();
  
    next();
  });