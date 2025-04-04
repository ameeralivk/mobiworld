
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
connectDB()

const loadlogin = async (req,res)=>{
    try {
        if(req.session.message){
            const message = req.session.message;
            req.session.message = null
           return res.render('admin-login',{message})
        }
        if(req.session.data){
            return res.redirect('/admin/dashboard')
        }
        res.render('admin-login',{message:null})
    }
     catch (error) {
        console.log('error from admincontroller',error)
    }
}
const dashboard = async(req,res)=>{
   return res.render('dashboard')
}


const logout = async (req,res)=>{
try {
    req.session.data = null
    console.log(req.session.data)
    res.render('admin-login',{message:''})
} catch (error) { 
    console.log("error occured at admincontroller",error);
    
}

}



const loadusers = async(req,res)=>{
    const users = await user.find({})
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const paginatedData = await getPaginatedData(page, limit);
   

    res.render('users', {
        users:paginatedData.data,
        data: paginatedData.data,
        totalPages: paginatedData.totalPages,
        currentPage: paginatedData.currentPage,
        limit,
        clearInput:false,
    });




}
const loginverification = async(req,res)=>{
    const {email,password} = req.body
    const admin = await user.findOne({isAdmin:true,email:email})
    try {
        if(!admin){
            req.session.message = "Not an Admin"
            return res.redirect('/admin/login')
    
        }
        if(admin){
            const isMatch = await bcrypt.compare(password, admin.password);
            if(!isMatch){
                req.session.message = "password Not Match"
                return res.redirect('/admin/login')
            }
            req.session.data = admin
           return res.redirect('/admin/dashboard')
        }
        else{
           return res.redirect('/admin/login')
        }
      
       
    } catch (error) {
        console.log(error)
    }
}
const blockUnblock = async(req,res)=>{
    const users = await user.findById(req.params.id)
    try {
        if(users.isBlocked == true){
            users.isBlocked = false;
            await users.save()
        }
        else{
            users.isBlocked = true;
            await users.save()
        }
        res.redirect('/admin/users')
    } catch (error) {
        console.log(error)
    }
}
const  searchuser = async(req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const paginatedData = await getPaginatedData(page, limit);
    const searchquary = req.query.Search
    const users = await user.find({ name: { $regex: searchquary, $options: 'i' } }).sort({createdOn:-1});
try {
    return res.render('users',{  users,
                                 data:paginatedData.data,
                                 totalPages:paginatedData.totalPages,
                                 currentPage:paginatedData.currentPage,
                                 limit,
                                 clearInput:false,})
} catch (error) {
    console.log(error)
}
}
const clear = async(req,res)=>{
    const users = await user.find({}).sort({createdOn:-1})
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
        const data = await user.find().sort({createdOn:-1}).skip(skip).limit(limit).exec();
        const totalDocuments = await user.countDocuments();

        return {
            data,
            totalPages: Math.ceil(totalDocuments / limit),
            currentPage: page,
        };
    } catch  {
        console.error('Error fetching paginated data:', error);
        return {
            data: [],
            totalPages: 0,
            currentPage: page,
            totalDocuments: 0,
        };
    }
        
}

const SalesReport = async(req,res)=>{
    try {

        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const filter = {
            $or: [
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


        const users = await userschema.countDocuments()
        // const orders = await orderschema.find({$or: [{ status: "Confirmed" }, { status: "Delivered" },{ status: "Return Request" }]}).populate("orderedItems.product").populate({path:"orderedItems.product",populate:{path:"brand"},})
        const PendingOrders = await orderschema.find({status:"Pending"}).countDocuments()
        let totalPurchasedItems = 0;
        let totalSales = 0
        orders.forEach(order => {
            order.orderedItems.forEach(item => {
                totalPurchasedItems += item.quantity;
            });
            totalSales += (order.totalPrice + order.totalGST) - (order.discount || 0)
        });
        res.render('salesReportPage',{orders,users,totalPurchasedItems,totalSales,PendingOrders,page,totalPages})
    } catch (error) {
        console.error('error from salesReport admincontroller',error)
    }
}
const filterSalesReport = async(req,res)=>{
    const{from,to} = req.body
    try {
        const orders = await orderschema.find({$or: [{ status: "Confirmed" }, { status: "Delivered" },{ status: "Return Request" }]}).populate("orderedItems.product").populate({path:"orderedItems.product",populate:{path:"brand"},})
        const fromDate = new Date(from)
        const ToDate = new Date(to)
        console.log(fromDate,ToDate,'date ameer')
        const filteredOrders = orders.filter(order => {
            const orderDate = new Date(order.createdOn);
            return orderDate >= fromDate && orderDate <= ToDate;
        });
          req.session.date = { from: fromDate, to: ToDate }
          req.session.filterdata = filteredOrders
        res.status(200).json({ success: true, orders: filteredOrders });
    } catch (error) {
        console.log('error from filtersalesReport',error)
    }
}
const downloadSalesReport= async (req, res) => {
    console.log('Generating PDF...');
    const { id } = req.params;
  
    try {
        const orders = await orderschema.find({$or: [{ status: "Confirmed" }, { status: "Delivered" },{ status: "Return Request" }]}).populate("orderedItems.product").populate({path:"orderedItems.product",populate:{path:"brand"},})
        console.log(orders,'orders')
      const templatePath = path.join(__dirname, '../views', 'salesReport.ejs');
      console.log(`Rendering template from: ${templatePath}`);
      const filterdata = req.session.filterdata?req.session.filterdata:orders
      const date = req.session.date?req.session.date:null
      console.log(req.session.date,'daete')
      ejs.renderFile(templatePath,{orders:filterdata,date}, async (err, htmlContent) => {
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

const downloadExcelReport = async(req,res)=>{
    console.log('hi')
    try {
        const orders = await orderschema.find({
            $or: [
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
            { header: 'Price', key: 'price', width: 15 },
            { header: 'Quantity', key: 'quantity', width: 10 },
            { header: 'Total', key: 'total', width: 15 }
        ];

        // Add rows
        orders.forEach(order => {
            order.orderedItems.forEach(item => {
                worksheet.addRow({
                    orderId: order.orderId,
                    productName: item.product.productName,
                    brandName: item.product.brand.brandName,
                    price: item.price,
                    quantity: item.quantity,
                    total: item.price * item.quantity
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

const salesReportFilter = async(req,res)=>{
    const{range} = req.body
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
        console.log("error from salesReportFilter",error)
    }
}
module.exports ={
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
}