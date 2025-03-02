const Category = require("../models/categorySchema")





// const categoryInfo = async(req,res)=>{
//     try {
//         const page = parseInt(req.query.page) || 1;
//         const limit = 4;
//         const skip = (page-1)*limit
//         const categoryData = await Category.find({})
//         .sort({createdAt:1})
//         .skip(skip)
//         .limit(limit)
//         const totalCategories = await Category.countDocuments();
//         const totalPages = Math.ceil(totalCategories/limit)
//         res.render('category',{
//             cat:categoryData,
//             currentPage:page,
//             totalPages : totalPages,
//             totalCategories:totalCategories
//         })
//     } catch (error) {
//         res.render('page-404')
//     }
// }
const categoryInfo = async(req,res)=>{
    try {
        const category = await Category.find({}).sort({createdOn:-1})
        res.render('category',{category})
    } catch (error) {
        console.log(error)
    }
}
const addcategorypage = async(req,res)=>{
    try {
        res.render('addcategory')
    } catch (error) {
        console.log('categorycontroller error',error)
    }
}
const addcategory = async(req,res)=>{
    const {category,description} = req.body
   try {
    const newcategory = new Category({name:category,description:description})
    await newcategory.save()
    res.redirect("/admin/Category")
   } catch (error) {
    console.log("categorycondroller error",error)
   }
}
module.exports = {
    categoryInfo,
    addcategorypage,
    addcategory,
}