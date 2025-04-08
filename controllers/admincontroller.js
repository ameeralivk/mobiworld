
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
    const users = await user.find({})

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const paginatedData = await getPaginatedData(page, limit);


    res.render('users', {
        users: paginatedData.data,
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
    const users = await user.findById(req.params.id)
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
            .skip(skip)
            .limit(limit)
            .populate("orderedItems.product")
            .populate({
                path: "orderedItems.product",
                populate: { path: "brand" }
            });

        console.log(orders, 'orders')
        const users = await userschema.countDocuments()
        // const orders = await orderschema.find({$or: [{ status: "Confirmed" }, { status: "Delivered" },{ status: "Return Request" }]}).populate("orderedItems.product").populate({path:"orderedItems.product",populate:{path:"brand"},})
        const PendingOrders = await orderschema.find({ status: "Pending" }).countDocuments()
        let totalPurchasedItems = 0;
        let totalSales = 0
        orders.forEach(order => {
            order.orderedItems.forEach(item => {
                totalPurchasedItems += item.quantity;
            });
            totalSales += (order.totalPrice + order.totalGST) - (order.discount || 0) - (order.couponDiscount || 0)
        });
        res.render('salesReportPage', { orders, users, totalPurchasedItems, totalSales, PendingOrders, page, totalPages })
    } catch (error) {
        console.error('error from salesReport admincontroller', error)
    }
}
const filterSalesReport = async (req, res) => {
    const { from, to } = req.body
    try {
        const orders = await orderschema.find({ $or: [{ status: "Pending" }, { status: "Confirmed" }, { status: "Delivered" }, { status: "Return Request" }] }).populate("orderedItems.product").populate({ path: "orderedItems.product", populate: { path: "brand" }, })
        const fromDate = new Date(from)
        const ToDate = new Date(to)
        console.log(fromDate, ToDate, 'date ameer')
        const filteredOrders = orders.filter(order => {
            const orderDate = new Date(order.createdOn);
            return orderDate >= fromDate && orderDate <= ToDate;
        });
        req.session.date = { from: fromDate, to: ToDate }
        req.session.filterdata = filteredOrders
        res.status(200).json({ success: true, orders: filteredOrders });
    } catch (error) {
        console.log('error from filtersalesReport', error)
    }
}
const downloadSalesReport = async (req, res) => {
    console.log('Generating PDF...');
    const { id } = req.params;

    try {
        const orders = await orderschema.find({ $or: [{ status: "Pending" }, { status: "Confirmed" }, { status: "Delivered" }, { status: "Return Request" }] }).populate("orderedItems.product").populate({ path: "orderedItems.product", populate: { path: "brand" }, })
        console.log(orders, 'orders')
        const templatePath = path.join(__dirname, '../views', 'salesReport.ejs');
        console.log(`Rendering template from: ${templatePath}`);
        const filterdata = req.session.filterdata ? req.session.filterdata : orders
        const date = req.session.date ? req.session.date : null
        console.log(req.session.date, 'daete')
        ejs.renderFile(templatePath, { orders: filterdata, date }, async (err, htmlContent) => {
            if (err) {
                console.error('Error rendering EJS:', err);
                return res.status(500).json({ message: 'Error rendering template' });
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
        res.status(500).send('An error occurred while generating the PDF');
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
        res.status(500).send("Internal Server Error");
    }
};


const addCoupon = async (req, res) => {
    try {
        console.log(req.body)
        const newcoupon = new CouponSchema({
            name: req.body.name,
            createdOn: req.body.createdOn,
            discountType: req.body.discountType,
            discountValue: req.body.discountValue,
            expiredOn: req.body.expiredOn,
            minimumPrice: req.body.minimumPrice,
            maxDiscount: req.body.maxDiscount,
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
        const offer = await offerschema.findById(req.params.id)
        res.json(offer);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load offer' });
    }
}
const editOffer = async (req, res) => {
    const offerId = req.body.offerid;
    try {
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
        const coupon = await CouponSchema.findById(req.params.id);
        res.json(coupon);
    } catch (err) {
        res.status(500).json({ error: 'Coupon not found' });
    }
}


const editCoupon = async (req, res) => {
    const id = req.params.id
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

        await CouponSchema.findByIdAndUpdate(id, updateData);
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
    const id = req.params.id
    try {
        await CouponSchema.findByIdAndDelete(id);
        res.json({ success: true, message: 'Coupon deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error deleting coupon' });
    }
}

const deleteOffer = async (req, res) => {
    try {
        try {
            const id = req.params.id;
            await offerschema.findByIdAndDelete(id);
            res.json({ success: true, message: 'Offer deleted successfully.' });
        } catch (error) {
            console.error(error);
            res.json({ success: false, message: 'Failed to delete offer.' });
        }
    } catch (error) {
        console.log('error from deleteOffer', error)
    }
}


const getChartData = async (req, res) => {
    const filter = req.params.filter;

    let startDate;
    const endDate = new Date();

    // Set start date based on filter
    switch (filter) {
        case 'daily':
            startDate = new Date();
            startDate.setDate(endDate.getDate() - 1);
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
            startDate = new Date(0); // all data
    }
    try {
        const orders = await orderschema.find({ 
            createdOn: { $gte: startDate, $lte: endDate } 
          }).populate('userId') .populate({
            path: 'orderedItems.product',
            populate: [
              { path: 'category', select: 'name' },
              { path: 'brand', select: 'brandName' }
            ]
          });
          console.log(orders,'orders')
        // Sales Overview by Month or Date
        console.log("Hi")
        const salesMap = {};
        orders.forEach(order => {
            const key = filter === 'daily' ? order.createdOn.toLocaleDateString() : order.createdOn.toLocaleString('default', { month: 'short' });
            salesMap[key] = (salesMap[key] || 0) + order.totalPrice-(order.discount+order.couponDiscount);
        });
        const salesLabels = Object.keys(salesMap);
        const salesData = Object.values(salesMap);

        // Best Selling Products
        const productMap = {};
        const productDetails = {};
        for (const order of orders) {
            for (const item of order.orderedItems) {
              const product = item.product;
              const productId = product._id.toString();
          
              productMap[productId] = (productMap[productId] || 0) + item.quantity;
          
              // Save details only once
              if (!productDetails[productId]) {
                productDetails[productId] = {
                  name: product.productName,
                  salePrice: product.salePrice,
                  category: product.category?.name || 'Unknown',
                  brand: product.brand, // you can also populate brand if needed
                  image: product.productImage[0] // just for display
                };
              }
            }
          }
        console.log(productMap,'map')
        const productIds = Object.keys(productMap);
        const productDocs = await productschema.find({ _id: { $in: productIds } });
        const productLabels = productDocs.map(p => p.productName);
        const productData = productDocs.map(p => productMap[p._id]);
        console.log(productData,'data')
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
         console.log(categoryMap,'categorymap')
        const categoryLabels = Object.keys(categoryMap);
        const categoryData = Object.values(categoryMap);

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
         console.log(brandMap,'brandmap')
        const brandLabels = Object.keys(brandMap);
        const brandData = Object.values(brandMap);
        console.log(brandLabels,brandData)

        // Order Status
        const statusMap = {};
        orders.forEach(order => {
            statusMap[order.status] = (statusMap[order.status] || 0) + 1;
        });
         console.log(statusMap,'status map')
        const statusLabels = Object.keys(statusMap);
        const statusData = Object.values(statusMap);
        const lastorders = await orderschema.find({ 
            createdOn: { $gte: startDate, $lte: endDate } 
          }).populate('userId') .populate({
            path: 'orderedItems.product',
            populate: [
              { path: 'category', select: 'name' },
              { path: 'brand', select: 'brandName' }
            ]
          }).limit(10);
        const recentOrders = lastorders.map(order => ({
            orderId: order._id,
            customerName: order.userId?.name || 'Unknown',
            email: order.userId?.email || '',
            createdOn: order.createdOn,
            amount: (order.totalPrice-(order.discount+order.couponDiscount)),
            status: order.status
          }));
        
          console.log(recentOrders,'recent ore')
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
            recentOrders,
        });

    } catch (error) {

    }
}

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
}