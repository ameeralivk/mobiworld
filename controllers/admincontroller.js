
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const user = require('../models/user')
const { query } = require("express")
const connectDB = require('../config/db')
const orderschema = require('../models/orderSchema')
const userschema = require('../models/user')
const puppeteer = require("puppeteer");
const fs = require("fs");
const ejs = require("ejs");
const path = require("path");
const ExcelJS = require('exceljs');
const categoryschema = require('../models/categorySchema')
const brandschema = require('../models/brandSchema')
const productschema = require('../models/productSchema')
const CouponSchema = require('../models/couponSchema')
const offerschema = require('../models/offerSchema')
const { resendOtp } = require('./usercontroller')
const walletSchema = require('../models/walletSchem')
const statuscode  = require('../config/statusCode')
const Product = require('../models/productSchema')
const cartSchema = require('../models/cartSchema')
connectDB()

const loadlogin = async (req, res) => {
    try {
        if (req.session.message) {
            const message = req.session.message;
            req.session.message = null
            return res.render('admin-login', { message })
        }
        if (req.session.data) {
            return res.redirect('/admin/dashboard')
        }
        res.render('admin-login', { message: null })
    }
    catch (error) {
        console.log('error from admincontroller', error)
    }
}
const dashboard = async (req, res) => {
    return res.render('dashboard')
}


const logout = async (req, res) => {
    try {
        req.session.data = null
        console.log(req.session.data)
        res.render('admin-login', { message: '' })
    } catch (error) {
        console.log("error occured at admincontroller", error);

    }

}



const loadusers = async (req, res) => {
   
    // const users = await user.find({})

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;
    const paginatedData = await getPaginatedData(page, limit);
    const users = await user.aggregate([
        {
          $lookup: {
            from: 'wallets',
            localField: '_id',
            foreignField: 'userId',
            as: 'wallet'
          }
        },
        { $unwind: { path: '$wallet', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$wallet.transaction', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'orders',
            localField: 'wallet.transaction.orderId',
            foreignField: '_id',
            as: 'orderDetails'
          }
        },
        {
          $addFields: {
            'wallet.transaction.orderId': { $arrayElemAt: ['$orderDetails', 0] }
          }
        },
        {
          $group: {
            _id: '$_id',
            user: { $first: '$$ROOT' },
            transactions: {
                $push: {
                  $cond: [
                    { $ne: ['$wallet.transaction', null] },
                    '$wallet.transaction',
                    '$$REMOVE'
                  ]
                }
              }
          }
        },
        {
          $addFields: {
            'user.wallet.transaction': '$transactions'
          }
        },
        {
          $replaceRoot: {
            newRoot: '$user'
          }
        },
        { $sort: { createdOn: -1 } },
        { $skip: skip },
        { $limit: limit }
      ]);
      
      
     console.log(users,'useres')
     users.forEach(user => {
        console.log(user.wallet.transaction,'transaction')
        user.wallet.transaction.forEach(element => {
            console.log(element.order)
        });
     });
    res.render('users', {
        users: users,
        data: paginatedData.data,
        totalPages: paginatedData.totalPages,
        currentPage: paginatedData.currentPage,
        limit,
        clearInput: false,
    });




}
const loginverification = async (req, res) => {
    const { email, password } = req.body
    const admin = await user.findOne({ isAdmin: true, email: email })
    try {
        if (!admin) {
            req.session.message = "Not an Admin"
            return res.redirect('/admin/login')

        }
        if (admin) {
            const isMatch = await bcrypt.compare(password, admin.password);
            if (!isMatch) {
                req.session.message = "password Not Match"
                return res.redirect('/admin/login')
            }
            req.session.data = admin
            return res.redirect('/admin/dashboard')
        }
        else {
            return res.redirect('/admin/login')
        }


    } catch (error) {
        console.log(error)
    }
}
const blockUnblock = async (req, res) => {
    const users = await user.findById(req.params.userId)
    try {
        if (users.isBlocked == true) {
            users.isBlocked = false;
            await users.save()
        }
        else {
            users.isBlocked = true;
            await users.save()
        }
        res.redirect('/admin/users')
    } catch (error) {
        console.log(error)
    }
}
const searchuser = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const paginatedData = await getPaginatedData(page, limit);
    const searchquary = req.query.Search
    const users = await user.find({ name: { $regex: searchquary, $options: 'i' } }).sort({ createdOn: -1 });
    try {
        return res.render('users', {
            users,
            data: paginatedData.data,
            totalPages: paginatedData.totalPages,
            currentPage: paginatedData.currentPage,
            limit,
            clearInput: false,
        })
    } catch (error) {
        console.log(error)
    }
}
const clear = async (req, res) => {
    const users = await user.find({}).sort({ createdOn: -1 })
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const paginatedData = await getPaginatedData(page, limit);
    try {
        res.redirect('/admin/users')
    } catch (error) {
        console.log(error)
    }
}



async function getPaginatedData(page, limit) {
    try {
        const skip = (page - 1) * limit;
        const data = await user.find().sort({ createdOn: -1 }).skip(skip).limit(limit).exec();
        const totalDocuments = await user.countDocuments();

        return {
            data,
            totalPages: Math.ceil(totalDocuments / limit),
            currentPage: page,
        };
    } catch {
        console.error('Error fetching paginated data:', error);
        return {
            data: [],
            totalPages: 0,
            currentPage: page,
            totalDocuments: 0,
        };
    }

}

// const SalesReport = async (req, res) => {
//     try {

//         const page = parseInt(req.query.page) || 1;
//         const limit = 10;
//         const skip = (page - 1) * limit;

//         const filter = {
//             $or: [
//                 { status: "Pending" },
//                 { status: "Confirmed" },
//                 { status: "Delivered" },
//                 { status: "Return Request" }
//             ]
//         };

//         const totalOrders = await orderschema.countDocuments(filter);
//         const totalPages = Math.ceil(totalOrders / limit);

//         const orders = await orderschema.find(filter)
//             .skip(skip)
//             .limit(limit)
//             .populate("userId")
//             .populate("orderedItems.product")
//             .populate({
//                 path: "orderedItems.product",
//                 populate: { path: "brand" }
//             });

//         console.log(orders, 'orders')
//         const users = await userschema.countDocuments()
//         // const orders = await orderschema.find({$or: [{ status: "Confirmed" }, { status: "Delivered" },{ status: "Return Request" }]}).populate("orderedItems.product").populate({path:"orderedItems.product",populate:{path:"brand"},})
//         const PendingOrders = await orderschema.find({ status: "Pending" }).countDocuments()
//         let totalPurchasedItems = 0;
//         let totalSales = 0
//         orders.forEach(order => {
//             let nonReturnedTotal = 0;
//             let fullItemTotal = 0;
//             let hasValidItem = false;
//             order.orderedItems.forEach(item => {
//                 const itemTotal = item.price * item.quantity;
//                 fullItemTotal += itemTotal;
//                 if (item.product && item.returnStatus !== "Returned" && order.status !== "Cancelled") {
//                     nonReturnedTotal += itemTotal;
//                     totalPurchasedItems += item.quantity;
//                     hasValidItem = true;
//                 }
//             });
//            totalSales = order.finalAmount - order.discount - order.returnAmound
//         });
        
        
//         res.render('salesReportPage', { orders, users, totalPurchasedItems, totalSales, PendingOrders, page, totalPages })
//     } catch (error) {
//         console.error('error from salesReport admincontroller', error)
//     }
// }
const SalesReport = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const filter = {
            $or: [
                { status: "Pending" },
                { status: "Confirmed" },
                { status: "Delivered" },
                { status: "Return Request" }
            ]
        };

        const totalOrders = await orderschema.countDocuments(filter);
        const totalPages = Math.ceil(totalOrders / limit);

        const orders = await orderschema.find(filter)
            .sort({ createdOn: -1 })
            .skip(skip)
            .limit(limit)
            .populate("userId")
            .populate("orderedItems.product")
            .populate({
                path: "orderedItems.product",
                populate: { path: "brand" }
            });

        const users = await userschema.countDocuments();
        const PendingOrders = await orderschema.countDocuments({ status: "Pending" });

        let totalPurchasedItems = 0;
        let totalSales = 0;

        orders.forEach(order => {
            let orderItemTotal = 0;

            order.orderedItems.forEach(item => {
                if (item.returnStatus !== "Returned" && order.status !== "Cancelled" && item.cancelledStatus !== "Cancelled") {
                    totalPurchasedItems += item.quantity;
                }
            });

            // Apply your exact logic here:
            if (order.status !== "Returned" && order.status !== "Cancelled" && order.status !== "Failed") {
                totalSales += (order.totalPrice || 0) - ((order.discount || 0) + (order.couponDiscount || 0)) - (order.returnAmound || 0);
            }
        });

        res.render('salesReportPage', {
            orders,
            users,
            totalPurchasedItems,
            totalSales,
            PendingOrders,
            page,
            totalPages
        });

    } catch (error) {
        console.error('Error from salesReport admincontroller:', error);
        res.status(statuscode.INTERNAL_SERVER_ERROR).render('errorPage', { message: 'Something went wrong while loading the sales report.' });
    }
}


const filterSalesReport = async (req, res) => {
    const { from, to } = req.body
    try {
        const orders = await orderschema.find({ $or: [{ status: "Pending" }, { status: "Confirmed" }, { status: "Delivered" }, { status: "Return Request" }] }).populate("orderedItems.product").populate({ path: "orderedItems.product", populate: { path: "brand" }, })
        orders.forEach(order => {
            order.orderedItems = order.orderedItems.filter(item => item.returnStatus !== "Returned");
        });
        const fromDate = new Date(from)
        const ToDate = new Date(to)
        console.log(fromDate, ToDate, 'date ameer')
        const filteredOrders = orders.filter(order => {
            const orderDate = new Date(order.createdOn);
            return orderDate >= fromDate && orderDate <= ToDate;
        });
        req.session.date = { from: fromDate, to: ToDate }
        req.session.filterdata = filteredOrders
        res.status(statuscode.OK).json({ success: true, orders: filteredOrders });
    } catch (error) {
        console.log('error from filtersalesReport', error)
    }
}
const downloadSalesReport = async (req, res) => {
    console.log('Generating PDF...');
    const { id } = req.params;

    try {
        const orders = await orderschema.find({ $or: [{ status: "Pending" }, { status: "Confirmed" }, { status: "Delivered" }, { status: "Return Request" }] }).populate("orderedItems.product").populate({ path: "orderedItems.product", populate: { path: "brand" }, })
        orders.forEach(order => {
            order.orderedItems = order.orderedItems.filter(item => item.returnStatus !== "Returned");
        });
        console.log(orders, 'orders')
        const templatePath = path.join(__dirname, '../views', 'salesReport.ejs');
        console.log(`Rendering template from: ${templatePath}`);
        const filterdata = req.session.filterdata ? req.session.filterdata : orders
        const date = req.session.date ? req.session.date : null
        console.log(req.session.date, 'daete')
        ejs.renderFile(templatePath, { orders: filterdata, date }, async (err, htmlContent) => {
            if (err) {
                console.error('Error rendering EJS:', err);
                return res.status(statuscode.INTERNAL_SERVER_ERROR).json({ message: 'Error rendering template' });
            }
            req.session.filterdata = null
            req.session.date = null
            console.log('EJS rendering successful, launching Puppeteer...');


            const browser = await puppeteer.launch({ headless: 'new' });
            const page = await browser.newPage();
            await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });


            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
            });

            await browser.close();
            console.log('PDF generated successfully!');


            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=invoice-${id}.pdf`);
            res.setHeader('Content-Length', pdfBuffer.length);

            res.end(pdfBuffer);

        });

    } catch (error) {
        console.error('Error generating the PDF:', error);
        res.status(statuscode.INTERNAL_SERVER_ERROR).send('An error occurred while generating the PDF');
    }
};

const downloadExcelReport = async (req, res) => {
    console.log('hi')
    try {
        const orders = await orderschema.find({
            $or: [
                { status: "Pending" },
                { status: "Confirmed" },
                { status: "Delivered" },
                { status: "Return Request" }
            ]
        })
            .populate("orderedItems.product")
            .populate({ path: "orderedItems.product", populate: { path: "brand" } });
            orders.forEach(order => {
                order.orderedItems = order.orderedItems.filter(item => item.returnStatus !== "Returned");
            });
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        // Define columns
        worksheet.columns = [
            { header: 'Order ID', key: 'orderId', width: 30 },
            { header: 'Product', key: 'productName', width: 30 },
            { header: 'Brand', key: 'brandName', width: 20 },
            { header: 'Quantity', key: 'quantity', width: 10 },
            { header: 'Price', key: 'price', width: 15 },
            { header: 'Total', key: 'total', width: 15 },
            { header: 'Discount', key: 'discount', width: 15 },
            { header: 'Payment Method', key: 'paymentMethod', width: 20 },
            { header: 'Final Price', key: 'finalPrice', width: 20 },
        ];

        // Add rows
        orders.forEach(order => {
            order.orderedItems.forEach(item => {
                worksheet.addRow({
                    orderId: order.orderId,
                    productName: item.product.productName,
                    brandName: item.product.brand.brandName,
                    quantity: item.quantity,
                    price: item.price,
                    total: item.price * item.quantity,
                    discount: order.discount,
                    paymentMethod: order.paymentMethod || 'N/A',
                    finalPrice: (order.finalAmount - order.discount),
                });
            });
        });

        // Set response headers
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=" + "SalesReport.xlsx"
        );

        // Write the workbook to the response
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {

    }
}

const salesReportFilter = async (req, res) => {
    const { range } = req.body
    const today = new Date();
    let fromDate = new Date();
    if (range === '7days') {
        fromDate.setDate(today.getDate() - 7);
    } else if (range === '1month') {
        fromDate.setMonth(today.getMonth() - 1);
    } else {
        fromDate = new Date(today.toDateString());
    }
    try {
        const orders = await orderschema.find({
            createdOn: { $gte: fromDate, $lte: today },
            $or: [
                { status: "Pending" },
                { status: "Confirmed" },
                { status: "Delivered" },
                { status: "Return Request" }
            ]
        })
            .populate("orderedItems.product")
            .populate({ path: "orderedItems.product", populate: { path: "brand" } });
        req.session.filterdata = orders;
        req.session.date = { from: fromDate, to: today };
        res.json({ success: true, orders });
    } catch (error) {
        console.log("error from salesReportFilter", error)
    }
}



//coupon 
// const couponPage = async(req,res)=>{
//     try {
//         if(req.session.message){
//             const message = req.session.message 
//             req.session.message = null
//         const coupon = await CouponSchema.find({isList:true})
//         const categories = await categoryschema.find({})
//         const brands = await brandschema.find({})
//         const products = await productschema.find({})
//        return res.render('coopenPage',{categories,brands,products,coupon,message})
//         }
//         const coupon = await CouponSchema.find({isList:true})
//         const categories = await categoryschema.find({})
//         const brands = await brandschema.find({})
//         const products = await productschema.find({})
//        return res.render('coopenPage',{categories,brands,products,coupon,message:''})
//     } catch (error) {
//         console.log('error from couponPage',error)
//     }
// }

const couponPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const totalCoupons = await CouponSchema.countDocuments({ isList: true });
        const totalPages = Math.ceil(totalCoupons / limit);

        const coupon = await CouponSchema.find({ isList: true })
            .skip(skip)
            .limit(limit)
            .sort({ expiryDate: 1 }); // optional sort

        const categories = await categoryschema.find({});
        const brands = await brandschema.find({});
        const products = await productschema.find({});

        const message = req.session.message || '';
        req.session.message = null;

        return res.render('coopenPage', {
            categories,
            brands,
            products,
            coupon,
            message,
            page,
            totalPages
        });
    } catch (error) {
        console.log('Error from couponPage:', error);
        res.status(statuscode.INTERNAL_SERVER_ERROR).send("Internal Server Error");
    }
};


const addCoupon = async (req, res) => {
    try {
        // const findCoupon = await CouponSchema.findOne({name:req.body.name.trim()})
        const findCoupon = await CouponSchema.findOne({
            name: { $regex: new RegExp(`^${req.body.name.trim()}$`, 'i') }
          });
        if(findCoupon){
            req.session.message = {
                type: 'error',
                text: 'Coupon already exists!'
            };
            return res.redirect('/admin/couponPage');
        }
        console.log(req.body)
        const newcoupon = new CouponSchema({
            name: req.body.name,
            createdOn: req.body.createdOn,
            discountType: req.body.discountType,
            discountValue: req.body.discountValue,
            expiredOn: req.body.expiredOn,
            minimumPrice: req.body.minimumPrice,
            maxDiscount: req.body.maxDiscount || 0,
            categoryId: req.body.categoryId ? req.body.categoryId : null,
            brandId: req.body.brandId ? req.body.brandId : null,
            productId: req.body.productId ? req.body.productId : null,
        })
        await newcoupon.save()
        req.session.message = {
            type: 'success',
            text: 'Coupon Created Successfully!'
        };
        res.redirect('/admin/couponPage')
    } catch (error) {
        console.log("error from addCoupon", error)
    }
}

const getOffer = async (req, res) => {
    try {
        const offer = await offerschema.findById(req.params.OfferId)
        res.json(offer);
    } catch (error) {
        res.status(statuscode.INTERNAL_SERVER_ERROR).json({ error: 'Failed to load offer' });
    }
}
const editOffer = async (req, res) => {
    const offerId = req.body.offerid;
    try {
        const oldOffer = await offerschema.findById(offerId);
        console.log(req.body)
        const updatedData = {
            _id: req.body.offerid,
            name: req.body.name,
            description: req.body.description,
            offerType: req.body.offerType,
            productId: req.body.productId ? req.body.productId : [],
            discountType: req.body.discountType,
            discountValue: req.body.discountValue,
            categoryId: req.body.offerType === 'category' ? req.body.categoryId : null,
            brandId: req.body.offerType === 'brand' ? req.body.brandId : null,
            maxDiscount: req.body.maxDiscount,
            startDate: new Date(req.body.startDate),
            expiredOn: new Date(req.body.expiredOn)
        };
        const find = await offerschema.findOne(updatedData)
        if (find) {
            req.session.error = "item is same"
            res.redirect('/admin/offersPage')
        }
        await offerschema.findByIdAndUpdate(offerId, updatedData);
        
          let affectedProducts = [];

        if (req.body.offerType === 'category') {
            affectedProducts = await Product.find({ category: req.body.categoryId });
        } else if (req.body.offerType === 'brand') {
            affectedProducts = await Product.find({ brand: req.body.brandId });
        } else if (req.body.offerType === 'product') {
            const ids = Array.isArray(req.body.productId)
                ? req.body.productId
                : req.body.productId.split(',').map(id => id.trim());
            affectedProducts = await Product.find({ _id: { $in: ids } });
        }
        console.log(affectedProducts,'products')
        for (const product of affectedProducts) {
            const bestOffer = await getBestOfferForProduct(product);
            let discount = 0;

            if (bestOffer) {
                const price = product.salePrice;
                discount = bestOffer.discountType === "percentage"
                    ? Math.min((price * bestOffer.discountValue) / 100, bestOffer.maxDiscount || Infinity)
                    : bestOffer.discountValue;
                discount = Math.floor(discount);
            }

            // Update this product's offer in every user's cart
            await cartSchema.updateMany(
            { "items.productId": product._id },
            { $set: { "items.$[elem].bestOffer": discount } },
            { arrayFilters: [{ "elem.productId": product._id }] }
            );
        }

        req.session.message = "Offer updated successfully!";
        res.redirect('/admin/offersPage');
        console.log(find, 'find')
    } catch (error) {
        console.log('error from editOffer', error)
    }
}


const couponEditDetails = async (req, res) => {
    console.log("Hi")
    try {
        const coupon = await CouponSchema.findById(req.params.couponId);
        res.json(coupon);
    } catch (err) {
        res.status(statuscode.INTERNAL_SERVER_ERROR).json({ error: 'Coupon not found' });
    }
}


const editCoupon = async (req, res) => {
    const couponId = req.params.couponId
    try {
        const {
            name,
            discountType,
            discountValue,
            expiredOn,
            minimumPrice,
            maxDiscount,
            appliesTo,
            categoryId,
            brandId,
            productId
        } = req.body;

        const updateData = {
            name,
            discountType,
            discountValue,
            expiredOn,
            minimumPrice,
            maxDiscount,
            appliesTo
        };
        if (appliesTo === 'category') {
            updateData.categoryId = categoryId;
            updateData.brandId = null;
            updateData.productId = null;
        } else if (appliesTo === 'brand') {
            updateData.brandId = brandId;
            updateData.categoryId = null;
            updateData.productId = null;
        } else if (appliesTo === 'Product') {
            updateData.productId = productId;
            updateData.categoryId = null;
            updateData.brandId = null;
        } else {
            updateData.categoryId = null;
            updateData.brandId = null;
            updateData.productId = null;
        }

        await CouponSchema.findByIdAndUpdate(couponId, updateData);
        req.session.message = {
            type: 'success',
            text: 'Coupon updated successfully!'
        };
        res.redirect('/admin/couponPage');
    } catch (error) {
        console.log('error from editCoupon', error)
    }
}

const deleteCoupon = async (req, res) => {
    const couponId = req.params.couponId
    try {
        await CouponSchema.findByIdAndDelete(couponId);
        res.json({ success: true, message: 'Coupon deleted successfully' });
    } catch (err) {
        res.status(statuscode.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Error deleting coupon' });
    }
}

const deleteOffer = async (req, res) => {
    try {
        try {
            const offerId = req.params.offerId;
            await offerschema.findByIdAndDelete(offerId);
            res.json({ success: true, message: 'Offer deleted successfully.' });
        } catch (error) {
            console.error(error);
            res.json({ success: false, message: 'Failed to delete offer.' });
        }
    } catch (error) {
        console.log('error from deleteOffer', error)
    }
}


// const getChartData = async (req, res) => {
//   const filter = req.params.filter;

//   let startDate;
//   const endDate = new Date();
//   const year = endDate.getFullYear();

//   // Set start date based on filter
//   switch (filter) {
//     case 'daily':
//       startDate = new Date();
//       startDate.setDate(endDate.getDate() - 6); // Last 7 days including today
//       break;
//     case 'weekly':
//       startDate = new Date();
//       startDate.setDate(endDate.getDate() - 7);
//       break;
//     case 'monthly':
//       startDate = new Date();
//       startDate.setMonth(endDate.getMonth() - 1);
//       break;
//     default:
//       startDate = new Date(0); // all data
//   }

//   try {
//     const orders = await orderschema.find({
//         createdOn: { $gte: startDate, $lte: endDate },
//         status: { $nin: ['Cancelled', 'Returned'] }
//       }).populate('userId').populate({
//         path: 'orderedItems.product',
//         populate: [
//           { path: 'category', select: 'name' },
//           { path: 'brand', select: 'brandName' }
//         ]
//       });
      

//     // Sales Overview: build daily map
//     let salesLabels = [];
//     let salesData = [];


//     // if (filter === 'daily') {
//     //   const tempDate = new Date(startDate);
//     //   while (tempDate <= endDate) {
//     //     const dateKey = tempDate.toLocaleDateString('en-GB'); // format: dd/mm/yyyy
//     //     salesMap[dateKey] = 0;
//     //     dateLabels.push(dateKey);
//     //     tempDate.setDate(tempDate.getDate() + 1);
//     //   }

//     //   orders.forEach(order => {
//     //     if (order.status !== "Returned" && order.status !== "Cancelled") {
//     //       const key = new Date(order.createdOn).toLocaleDateString('en-GB');
//     //       if (salesMap[key] !== undefined) {
//     //         salesMap[key] += order.totalPrice - (order.discount + order.couponDiscount + order.returnAmound);
//     //       }
//     //     }
//     //   });
//     // } 
//     // else {
//     //   orders.forEach(order => {
//     //     if (order.status !== "Returned" && order.status !== "Cancelled") {
//     //       const key = filter === 'weekly'
//     //         ? new Date(order.createdOn).toLocaleDateString('en-GB')
//     //         : order.createdOn.toLocaleString('default', { month: 'short' });

//     //       salesMap[key] = (salesMap[key] || 0) + order.totalPrice - (order.discount + order.couponDiscount + order.returnAmound);
//     //     }
//     //   });

//     //   dateLabels.push(...Object.keys(salesMap));
//     // }

//     // const salesLabels = dateLabels;
//     // const salesData = dateLabels.map(label => salesMap[label] || 0);


//     if (filter === 'daily') {
//         const today = now.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
//         const yesterday = new Date();
//         yesterday.setDate(now.getDate() - 1);
//         const yest = yesterday.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
  
//         const dayMap = { [yest]: 0, [today]: 0 };
  
//         orders.forEach(order => {
//           const d = new Date(order.createdOn).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
//           if (dayMap[d] !== undefined) {
//             dayMap[d] += order.totalPrice - (order.discount + order.couponDiscount + order.returnAmound);
//           }
//         });
  
//         salesLabels = Object.keys(dayMap);
//         salesData = Object.values(dayMap);
//       }
  
//       else if (filter === 'weekly' || filter === 'monthly') {
//         const days = filter === 'weekly' ? 7 : 30;
//         const dayMap = {};
//         for (let i = days - 1; i >= 0; i--) {
//           const d = new Date();
//           d.setDate(endDate.getDate() - i);
//           const label = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
//           dayMap[label] = 0;
//         }
  
//         orders.forEach(order => {
//           const d = new Date(order.createdOn).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
//           if (dayMap[d] !== undefined) {
//             dayMap[d] += order.totalPrice - (order.discount + order.couponDiscount + order.returnAmound);
//           }
//         });
  
//         salesLabels = Object.keys(dayMap);
//         salesData = Object.values(dayMap);
//       }
  
//       else if (filter === 'yearly') {
//         const monthMap = {};
//         for (let i = 0; i < 12; i++) {
//           const month = new Date(year, i).toLocaleString('en-US', { month: 'short' });
//           monthMap[month] = 0;
//         }
  
//         orders.forEach(order => {
//           const d = new Date(order.createdOn);
//           if (d.getFullYear() === year) {
//             const label = d.toLocaleString('en-US', { month: 'short' });
//             if (monthMap[label] !== undefined) {
//               monthMap[label] += order.totalPrice - (order.discount + order.couponDiscount + order.returnAmound);
//             }
//           }
//         });
  
//         salesLabels = Object.keys(monthMap);
//         salesData = Object.values(monthMap);
//       }
  

//     // Best Selling Products
//     const productMap = {};
//     const productDetails = {};
//     for (const order of orders) {
//       for (const item of order.orderedItems) {
//         const product = item.product;
//         const productId = product._id.toString();

//         productMap[productId] = (productMap[productId] || 0) + item.quantity;

//         if (!productDetails[productId]) {
//           productDetails[productId] = {
//             name: product.productName,
//             salePrice: product.salePrice,
//             category: product.category?.name || 'Unknown',
//             brand: product.brand,
//             image: product.productImage[0]
//           };
//         }
//       }
//     }

//     const productIds = Object.keys(productMap);
//     const productDocs = await productschema.find({ _id: { $in: productIds } }).limit(10);
//     const productLabels = productDocs.map(p => p.productName);
//     const productData = productDocs.map(p => productMap[p._id]);

//     // Categories
//     const categoryMap = {};
//     orders.forEach(order => {
//       order.orderedItems.forEach(item => {
//         const categoryName = item.product?.category?.name;
//         if (categoryName) {
//           categoryMap[categoryName] = (categoryMap[categoryName] || 0) + 1;
//         }
//       });
//     });

//     const sortedCategories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
//     const categoryLabels = sortedCategories.map(([label]) => label);
//     const categoryData = sortedCategories.map(([_, value]) => value);

//     // Brands
//     const brandMap = {};
//     orders.forEach(order => {
//       order.orderedItems.forEach(item => {
//         const brandname = item.product?.brand?.brandName;
//         if (brandname) {
//           brandMap[brandname] = (brandMap[brandname] || 0) + 1;
//         }
//       });
//     });

//     const sortedBrands = Object.entries(brandMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
//     const brandLabels = sortedBrands.map(([label]) => label);
//     const brandData = sortedBrands.map(([_, value]) => value);

//     // Order Status
//     const statusMap = {};
//     orders.forEach(order => {
//       statusMap[order.status] = (statusMap[order.status] || 0) + 1;
//     });
//     const statusLabels = Object.keys(statusMap);
//     const statusData = Object.values(statusMap);

//     // Recent Orders
//     const lastorders = await orderschema.find({
//       createdOn: { $gte: startDate, $lte: endDate },
//       status: { $ne: 'Cancelled' },
//     }).populate('userId').populate({
//       path: 'orderedItems.product',
//       populate: [
//         { path: 'category', select: 'name' },
//         { path: 'brand', select: 'brandName' }
//       ]
//     }).limit(10);

//     const recentOrders = lastorders.map(order => ({
//       order: order.orderId,
//       orderId: order._id,
//       customerName: order.userId?.name || 'Unknown',
//       email: order.userId?.email || '',
//       createdOn: order.createdOn,
//       amount: order.totalPrice - (order.discount + order.couponDiscount),
//       status: order.status
//     }));

//     res.json({
//       labels: {
//         salesOverview: salesLabels,
//         products: productLabels,
//         categories: categoryLabels,
//         brands: brandLabels,
//         orderStatus: statusLabels
//       },
//       datasets: {
//         sales: salesData,
//         products: productData,
//         categories: categoryData,
//         brands: brandData,
//         orderStatus: statusData
//       },
//       recentOrders
//     });

//   } catch (error) {
//     console.error("Error fetching chart data:", error);
//     res.status(statuscode.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
//   }
// };

const getChartData = async (req, res) => {
    const filter = req.params.filter;
  
    let startDate;
    const endDate = new Date();
    const year = endDate.getFullYear();
  
    // Set start date based on filter
    switch (filter) {
      case 'daily':
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 6); // Last 7 days
        break;
      case 'weekly':
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'monthly':
        startDate = new Date();
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      default:
        startDate = new Date(0); // All data
    }
  
    // Helper function for date label formatting
    const formatDateLabel = (date) =>
      date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
  
    try {
      const orders = await orderschema.find({
        createdOn: { $gte: startDate, $lte: endDate },
        status: { $nin: ['Cancelled', 'Failed'] }
      })
        .populate('userId')
        .populate({
          path: 'orderedItems.product',
          populate: [
            { path: 'category', select: 'name' },
            { path: 'brand', select: 'brandName' },
          ],
        });
  
      let salesLabels = [];
      let salesData = [];
  
      if (filter === 'daily') {
        const today = formatDateLabel(endDate);
        const yesterday = new Date();
        yesterday.setDate(endDate.getDate() - 1);
        const yest = formatDateLabel(yesterday);
  
        const dayMap = { [yest]: 0, [today]: 0 };
  
        orders.forEach((order) => {
          const d = formatDateLabel(new Date(order.createdOn));
          if (dayMap[d] !== undefined) {
            dayMap[d] += order.totalPrice - (order.discount + order.couponDiscount + order.returnAmound);
          }
        });
  
        salesLabels = Object.keys(dayMap);
        salesData = Object.values(dayMap);
      } else if (filter === 'weekly' || filter === 'monthly') {
        const days = filter === 'weekly' ? 7 : 30;
        const dayMap = {};
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(endDate.getDate() - i);
          const label = formatDateLabel(d);
          dayMap[label] = 0;
        }
  
        orders.forEach((order) => {
          const d = formatDateLabel(new Date(order.createdOn));
          if (dayMap[d] !== undefined) {
            dayMap[d] += order.totalPrice - (order.discount + order.couponDiscount + order.returnAmound);
          }
        });
  
        salesLabels = Object.keys(dayMap);
        salesData = Object.values(dayMap);
      } else if (filter === 'yearly') {
        const monthMap = {};
        for (let i = 0; i < 12; i++) {
          const month = new Date(year, i).toLocaleString('en-US', { month: 'short' });
          monthMap[month] = 0;
        }
  
        orders.forEach((order) => {
          const d = new Date(order.createdOn);
          if (d.getFullYear() === year) {
            const label = d.toLocaleString('en-US', { month: 'short' });
            if (monthMap[label] !== undefined) {
              monthMap[label] += order.totalPrice - (order.discount + order.couponDiscount + order.returnAmound);
            }
          }
        });
  
        salesLabels = Object.keys(monthMap);
        salesData = Object.values(monthMap);
      }
  
      // Best Selling Products
      const productMap = {};
      const productDetails = {};
  
      for (const order of orders) {
        for (const item of order.orderedItems) {
          const product = item.product;
          const productId = product._id.toString();
  
          productMap[productId] = (productMap[productId] || 0) + item.quantity;
  
          if (!productDetails[productId]) {
            productDetails[productId] = {
              name: product.productName,
              salePrice: product.salePrice,
              category: product.category?.name || 'Unknown',
              brand: product.brand,
              image: product.productImage[0],
            };
          }
        }
      }
  
      const productIds = Object.keys(productMap);
      const productDocs = await productschema.find({ _id: { $in: productIds } }).limit(10);
      const productLabels = productDocs.map(p => p.productName);
      const productData = productDocs.map(p => productMap[p._id]);
  
      // Categories
      const categoryMap = {};
      orders.forEach(order => {
        order.orderedItems.forEach(item => {
          const categoryName = item.product?.category?.name;
          if (categoryName) {
            categoryMap[categoryName] = (categoryMap[categoryName] || 0) + 1;
          }
        });
      });
      const sortedCategories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
      const categoryLabels = sortedCategories.map(([label]) => label);
      const categoryData = sortedCategories.map(([_, value]) => value);
  
      // Brands
      const brandMap = {};
      orders.forEach(order => {
        order.orderedItems.forEach(item => {
          const brandname = item.product?.brand?.brandName;
          if (brandname) {
            brandMap[brandname] = (brandMap[brandname] || 0) + 1;
          }
        });
      });
      const sortedBrands = Object.entries(brandMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
      const brandLabels = sortedBrands.map(([label]) => label);
      const brandData = sortedBrands.map(([_, value]) => value);
  
      // Order Status
      const statusMap = {};
      orders.forEach(order => {
        statusMap[order.status] = (statusMap[order.status] || 0) + 1;
      });
      const statusLabels = Object.keys(statusMap);
      const statusData = Object.values(statusMap);
  
      // Recent Orders
      const lastorders = await orderschema.find({
        createdOn: { $gte: startDate, $lte: endDate },
        status: { $ne: 'Cancelled' },
      }).populate('userId').populate({
        path: 'orderedItems.product',
        populate: [
          { path: 'category', select: 'name' },
          { path: 'brand', select: 'brandName' }
        ]
      }).limit(10);
  
      const recentOrders = lastorders.map(order => ({
        order: order.orderId,
        orderId: order._id,
        customerName: order.userId?.name || 'Unknown',
        email: order.userId?.email || '',
        createdOn: order.createdOn,
        amount: order.totalPrice - (order.discount + order.couponDiscount),
        status: order.status
      }));
  
      res.json({
        labels: {
          salesOverview: salesLabels,
          products: productLabels,
          categories: categoryLabels,
          brands: brandLabels,
          orderStatus: statusLabels
        },
        datasets: {
          sales: salesData,
          products: productData,
          categories: categoryData,
          brands: brandData,
          orderStatus: statusData
        },
        recentOrders
      });
  
    } catch (error) {
      console.error("Error fetching chart data:", error);
      res.status(statuscode.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
    }
  };
  

const returnProduct = async(req,res)=>{
    try {
        const orderId = req.params.id?.trim();
        const order = await orderschema
            .findOne({  orderId:orderId })
            .populate({
                path: 'orderedItems.product',
            });
        console.log(order,'order is here')
        if (!order) {
            return res.status(statuscode.NOT_FOUND).json({ success: false, message: 'Order not found' });
        }
        
        // Filter items with return requests
        const returnItems = order.orderedItems.filter(
            item => item.returnStatus === "Requested" || item.returnStatus === "returnRequest"
        );
        
        res.json({
            success: true,
            orderId: order.orderId,
            returnItems,
            orderStatus: order.status
        });
    } catch (error) {
        console.error('Error fetching return details:', error);
        res.status(statuscode.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
}

const getBestOfferForProduct = async (product) => {
  // if (!product.category && !product.brand) return null;
  if (!product || (!product.category && !product.brand)) return null;
  const filterConditions = [];

  if (product.category != null) {
    filterConditions.push({ categoryId: new mongoose.Types.ObjectId(product.category) });
  }
  if (product.brand != null) {
    filterConditions.push({ brandId: new mongoose.Types.ObjectId(product.brand) });
  }
  if (product._id != null) {
    filterConditions.push({ productId: new mongoose.Types.ObjectId(product._id) });
  }
  console.log(filterConditions, 'filtercondition')
  const offers = await offerschema.find({
    $or: filterConditions,
    status: true,
    startDate: { $lte: new Date() },
    expiredOn: { $gte: new Date() },
  });
  console.log(offers, 'offers')
  if (!offers || offers.length === 0) return null; // No offers available

  let bestOffer = null;
  let maxDiscountValue = 0;

  offers.forEach((offer) => {
    let discountValue =
      offer.discountType === "percentage"
        ? (offer.discountValue / 100) * product.salePrice
        : offer.discountValue;

    if (offer.maxDiscount) {
      discountValue = Math.min(discountValue, offer.maxDiscount);
    }

    if (discountValue > maxDiscountValue) {
      maxDiscountValue = discountValue;
      bestOffer = offer;
    }
  });
  return bestOffer;
};

// const updateReturnStatus = async (req, res) => {
//     const { orderId, itemId } = req.params;
//     const { status } = req.body;
//     try {
//         const order = await orderschema.findOne({ orderId });
//         if (!order) {
//             return res.status(statuscode.NOT_FOUND).json({ success: false, message: 'Order not found' });
//         }

//         const item = order.orderedItems.id(itemId);
//         if (!item) {
//             return res.status(statuscode.NOT_FOUND).json({ success: false, message: 'Order item not found' });
//         }
//         if (item.returnStatus === "Returned" || item.returnStatus === "Rejected") {
//             return res.status(400).json({
//                 success: false,
//                 message: `Product already marked as ${item.returnStatus}`
//             });
//         }
//         const product = await productschema.findOne({ _id: item.product });
//         if (!product) {
//             return res.status(statuscode.NOT_FOUND).json({ success: false, message: 'Product not found' });
//         }

//         if (status === "Rejected") {
//             // Only update return status if it's Rejected
//             item.returnStatus = "Rejected";
//             await order.save();
//             return res.json({ success: true, message: 'Return status updated to Rejected' });
//         }

//         // Restock product
//         product.quantity += item.quantity;
//         await product.save();

//         // Get offer discount
//         const offer = await getBestOfferForProduct(product);
//         let offerDiscount = 0;
//         if (offer) {
//             let discountPerItem = offer.discountType === "percentage"
//                 ? (offer.discountValue / 100) * item.price
//                 : offer.discountValue;

//             if (offer.maxDiscount) {
//                 discountPerItem = Math.min(discountPerItem, offer.maxDiscount);
//             }

//             offerDiscount = discountPerItem * item.quantity;

//             // Subtract the offer discount from order's total discount
//             // order.discount = Math.max(0, (order.discount || 0) - offerDiscount);
//         }

//         // Calculate proportional coupon deduction
//         let couponAdjustment = 0;
//         if (order.couponDiscount && order.totalPrice) {
//             const itemValue = item.quantity * item.price;
//             const proportion = itemValue / order.totalPrice;
//             couponAdjustment = Math.round(order.couponDiscount * proportion);
//             console.log('Coupon Adjustment:', couponAdjustment);
//         }

//         // Create wallet transaction
//         const transactionEntry = {
//             Total: (item.quantity * item.price) - offerDiscount - couponAdjustment,
//             Type: "Credit",
//             description: `Amount refunded on return of ${product.productName}`,
//             orderId: order._id,
//         };

//         const wallet = await walletSchema.findOne({ userId: order.userId });
//         if (wallet) {
//             wallet.transaction.push(transactionEntry);
//             wallet.calculateWalletTotal();
//             await wallet.save();
//         } else {
//             const newWallet = new walletSchema({
//                 userId: order.userId,
//                 transaction: [transactionEntry]
//             });
//             newWallet.calculateWalletTotal();
//             await newWallet.save();
//         }

//         // Update item return status
//         item.returnStatus = status;

//         // Check if all items are returned — if so, reset coupon and mark order status as Returned
//         const allReturned = order.orderedItems.every(i => i.returnStatus === 'Returned');
//         if (allReturned) {
//             order.couponCode = null;
//             order.status = "Returned";
//         }

//         // Recalculate totalPrice and finalAmount after return
//         const itemPriceTotal = item.price * item.quantity;
//         // order.totalPrice = Math.max(0, order.totalPrice - itemPriceTotal);
//         // order.finalAmount = Math.max(0, order.totalPrice - (order.couponDiscount || 0) - (order.discount || 0));
//         // order.returnAmound = itemPriceTotal - (order.couponDiscount || 0) - (order.discount || 0)
//         order.returnAmound += transactionEntry.Total

//         await order.save();

//         res.json({ success: true, message: 'Return status updated successfully' });

//     } catch (err) {
//         console.error('Error updating return status:', err);
//         res.status(statuscode.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
//     }
// };


// const updateReturnStatus = async (req, res) => {
//     const { orderId, itemId } = req.params;
//     const { status } = req.body;

//     try {
//         const order = await orderschema.findOne({ orderId });
//         if (!order) {
//             return res.status(statuscode.NOT_FOUND).json({ success: false, message: 'Order not found' });
//         }

//         const item = order.orderedItems.id(itemId);
//         if (!item) {
//             return res.status(statuscode.NOT_FOUND).json({ success: false, message: 'Order item not found' });
//         }

//         if (item.returnStatus === "Returned" || item.returnStatus === "Rejected") {
//             return res.status(400).json({
//                 success: false,
//                 message: `Product already marked as ${item.returnStatus}`
//             });
//         }

//         const product = await productschema.findOne({ _id: item.product });
//         if (!product) {
//             return res.status(statuscode.NOT_FOUND).json({ success: false, message: 'Product not found' });
//         }

//         if (status === "Rejected") {
//             item.returnStatus = "Rejected";
//             await order.save();
//             return res.json({ success: true, message: 'Return status updated to Rejected' });
//         }

//         // Restock product
//         product.quantity += item.quantity;
//         await product.save();

//         // Get best offer and calculate discount
//         const offer = await getBestOfferForProduct(product);
//         let offerDiscount = 0;

//         if (offer) {
//             let discountPerItem = offer.discountType === "percentage"
//                 ? (offer.discountValue / 100) * item.price
//                 : offer.discountValue;

//             if (offer.maxDiscount) {
//                 discountPerItem = Math.min(discountPerItem, offer.maxDiscount);
//             }

//             offerDiscount = discountPerItem * item.quantity;

          
//         }

//         // Calculate proportional coupon deduction
//         // let  = order.couponDiscount;
//         // if (order.couponDiscount && order.totalPrice) {
//         //     const itemValue = item.quantity * item.price;
//         //     const proportion = itemValue / order.totalPrice;
//         //     couponAdjustment = Math.round(order.couponDiscount * proportion);
//         // }
//         const itemTotal = item.quantity * item.price;
//         const remainingTotal = (order.totalPrice - order.discount) - itemTotal;
//         let couponDiscount = order.couponDiscount
//         if(order.couponRevoked == 0){
//             couponDiscount = order.couponDiscount
//         }
//         else{
//             couponDiscount = 0
//         }
//         if (order.couponId && order.couponRevoked == 0) {
//             const coupon = await CouponSchema.findById(order.couponId);
        
//             if (coupon) {
//                 if (remainingTotal < coupon.minimumPrice) {
//                     order.couponId = null;
//                     order.couponRevoked = couponDiscount;
//                 }
//                 else{
//                     couponDiscount = 0 ;
//                 }
                 
//             }
//         }
//         const refundAmount = (item.quantity * item.price) - offerDiscount - couponDiscount;

//         const transactionEntry = {
//             Total: refundAmount,
//             Type: "Credit",
//             description: `Amount refunded on return of ${product.productName}`,
//             orderId: order._id,
//         };

//         const wallet = await walletSchema.findOne({ userId: order.userId });
//         if (wallet) {
//             wallet.transaction.push(transactionEntry);
//             wallet.calculateWalletTotal();
//             await wallet.save();
//         } else {
//             const newWallet = new walletSchema({
//                 userId: order.userId,
//                 transaction: [transactionEntry]
//             });
//             newWallet.calculateWalletTotal();
//             await newWallet.save();
//         }
//         item.returnStatus = status;
//         const allReturned = order.orderedItems.every(i => i.returnStatus === 'Returned');
//         if (allReturned) {
//             order.couponCode = null;
//             order.status = "Returned";
//         }
//         order.returnAmound += refundAmount;

//         await order.save();

//         res.json({ success: true, message: 'Return status updated successfully' });

//     } catch (err) {
//         console.error('Error updating return status:', err);
//         res.status(statuscode.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
//     }
// };

const updateReturnStatus = async (req, res) => {
    const { orderId, itemId } = req.params;
    const { status } = req.body;

    try {
        const order = await orderschema.findOne({ orderId });
        if (!order) {
            return res.status(statuscode.NOT_FOUND).json({ success: false, message: 'Order not found' });
        }

        const item = order.orderedItems.id(itemId);
        if (!item) {
            return res.status(statuscode.NOT_FOUND).json({ success: false, message: 'Order item not found' });
        }

        if (item.returnStatus === "Returned" || item.returnStatus === "Rejected") {
            return res.status(400).json({
                success: false,
                message: `Product already marked as ${item.returnStatus}`
            });
        }

        const product = await productschema.findOne({ _id: item.product });
        if (!product) {
            return res.status(statuscode.NOT_FOUND).json({ success: false, message: 'Product not found' });
        }

        if (status === "Rejected") {
            item.returnStatus = "Rejected";
            await order.save();
            return res.json({ success: true, message: 'Return status updated to Rejected' });
        }

        product.quantity += item.quantity;
        await product.save();

        const offer = await getBestOfferForProduct(product);
        let offerDiscount = 0;

        if (offer) {
            let discountPerItem = offer.discountType === "percentage"
                ? (offer.discountValue / 100) * item.price
                : offer.discountValue;

            if (offer.maxDiscount) {
                discountPerItem = Math.min(discountPerItem, offer.maxDiscount);
            }

            offerDiscount = discountPerItem * item.quantity;
        }

     
        const itemTotal = item.quantity * item.price;
        let refundAmount = itemTotal - offerDiscount;

     
        const remainingTotal = (order.totalPrice - order.discount) - itemTotal;
        let couponDiscount = order.couponDiscount || 0;

        if (order.couponId && order.couponRevoked === 0) {
            const coupon = await CouponSchema.findById(order.couponId);

            if (coupon && remainingTotal < coupon.minimumPrice) {
                order.couponId = null;
                order.couponRevoked = couponDiscount;
                refundAmount -= couponDiscount;  // apply deduction
            } else {
                couponDiscount = 0; // not revoked
            }
        } else {
            couponDiscount = 0;
        }

       
        const transactionEntry = {
            Total: refundAmount,
            Type: "Credit",
            description: order.couponRevoked
                ? `Refund for returned item ${product.productName} (Coupon Revoked)`
                : `Refund for returned item ${product.productName}`,
            orderId: order._id,
        };

        const wallet = await walletSchema.findOne({ userId: order.userId });
        if (wallet) {
            wallet.transaction.push(transactionEntry);
            wallet.calculateWalletTotal();
            await wallet.save();
        } else {
            const newWallet = new walletSchema({
                userId: order.userId,
                transaction: [transactionEntry]
            });
            newWallet.calculateWalletTotal();
            await newWallet.save();
        }

       
        item.returnStatus = status;
        order.returnAmound += refundAmount;

        const allReturned = order.orderedItems.every(i => i.returnStatus === 'Returned');
        if (allReturned) {
            order.couponCode = null;
            order.status = "Returned";
        }

        await order.save();

        res.json({ success: true, message: 'Return status updated successfully' });

    } catch (err) {
        console.error('Error updating return status:', err);
        res.status(statuscode.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
    }
};

  

module.exports = {
    loadlogin,
    loginverification,
    dashboard,
    loadusers,
    blockUnblock,
    searchuser,
    clear,
    logout,
    SalesReport,
    filterSalesReport,
    downloadSalesReport,
    downloadExcelReport,
    salesReportFilter,
    couponPage,
    addCoupon,
    getOffer,
    editOffer,
    couponEditDetails,
    editCoupon,
    deleteCoupon,
    deleteOffer,
    getChartData,
    returnProduct,
    updateReturnStatus,
}