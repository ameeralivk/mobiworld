const { trusted } = require("mongoose");
const Category = require("../models/categorySchema")

const categoryInfo = async(req,res)=>{
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 1;
    
        const paginatedData = await getPaginatedData(page, limit);
    try {
        const category = await Category.find({})
        res.render('category',{category:paginatedData.data,
                               data: paginatedData.data,
                               totalPages: paginatedData.totalPages,
                               currentPage: paginatedData.currentPage,
                               limit,
                               clearInput:false,  })
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


async function getPaginatedData(page, limit) {
    try {
        const skip = (page - 1) * limit;
        const data = await Category.find().sort({createdAt:-1}).skip(skip).limit(limit).exec();
        const totalDocuments = await Category.countDocuments();

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

const categorySearch =async(req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const paginatedData = await getPaginatedData(page, limit);
    const {Searchval} = req.query
    const category = await Category.find({ name: { $regex: Searchval, $options: 'i' } }).sort({createdAt:-1});
    try {
       return  res.render('category',{ category,
            data:paginatedData.data,
            totalPages:paginatedData.totalPages,
            currentPage:paginatedData.currentPage,
            limit,
            clearInput:false,})
    } catch (error) {
        console.log("category contorller error",error)
    }
}


const categoryclear = async(req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const paginatedData = await getPaginatedData(page, limit);
    const category = await Category.find({}).sort({createdAt:-1})
    try { 
        res.render('category',{category ,
                            clearInput:true,
                            data:paginatedData.data,
                            totalPages:paginatedData.totalPages,
                            currentPage:paginatedData.currentPage,
                            limit,
                        })
    } catch (error) { 
        console.log(error)         
    }
}
const deleteCategory = async(req,res)=>{
    const id = req.params.id
    const category = await Category.findById(id)
    try {
        if(category.isDeleted == true){
            const n = await Category.findByIdAndUpdate(id,{isDeleted:false})
          return  res.redirect('/admin/deleteCategory')
        }
        else{
            await Category.findByIdAndUpdate(id,{isDeleted:true})
           return res.redirect('/admin/deleteCategory')
        }
     
       
       
    } catch (error) {
        res.status(500).send('Error deleting category');
    }
}

 const loadDeleteCategory = async(req,res)=>{
  try {
          return res.redirect('/admin/category')
  } catch (error) {
    
  }
}


module.exports = {
    categoryInfo,
    addcategorypage,
    addcategory,
    categorySearch,
    categoryclear,
    deleteCategory,
    loadDeleteCategory,
}