const { trusted } = require("mongoose");
const Category = require("../models/categorySchema");
const { deserializeUser } = require("passport");

const categoryInfo = async(req,res)=>{
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const paginatedData = await getPaginatedData(page, limit);
    try {

        if(req.session.msg){
           const msg = req.session.msg
           req.session.msg = null
            return  res.render('category',{category:paginatedData.data,
                data: paginatedData.data,
                msg:msg,
                totalPages: paginatedData.totalPages,
                currentPage: paginatedData.currentPage,
                limit,
                clearInput:false,  })
        }
           return  res.render('category',{category:paginatedData.data,
                msg:'',
                data: paginatedData.data,
                totalPages: paginatedData.totalPages,
                currentPage: paginatedData.currentPage,
                limit,
                clearInput:false,  })

        }
       
     catch (error) {
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
     const duplicate = await Category.findOne({name:category})
        if(duplicate){
            req.session.msg = 'No duplicate brandname is allowed'
            res.redirect("/admin/Category")
        }
        else{
            req.session.msg = 'new category created successfully'
            const newcategory = new Category({name:category,description:description})
            await newcategory.save()
            res.redirect("/admin/Category")
        }
    
   } catch (error) {
    console.log("categorycondroller error",error)
   }
}


async function getPaginatedData(page, limit) {
    try {
        const skip = (page - 1) * limit;
        const data = await Category.find({isDeleted:false}).sort({createdAt:-1}).skip(skip).limit(limit).exec();
        const totalDocuments = await Category.countDocuments({isDeleted:false});

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
    const limit = parseInt(req.query.limit) || 5;
    const Searchval = req.query.Searchval||''
    const searchfilter = {name:{$regex:Searchval,$options:'i'},isDeleted:false}
   const categories = await Category.find(searchfilter).skip((page - 1)*limit).limit(limit).sort({createdAt:-1});
   const totalCount = await Category.countDocuments(searchfilter);
   const currentPage = page
   const totalPages = Math.ceil(totalCount / limit);
    try {
       return  res.render('category',{ category:categories,
            msg:'',
            data:categories,
            totalPages:totalPages,
            currentPage:currentPage,
            limit,
            clearInput:false,})
    } catch (error) {
        console.log("category contorller error",error)
    }
}


const categoryclear = async(req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const paginatedData = await getPaginatedData(page, limit);
    const category = await Category.find({isDeleted:false}).sort({createdAt:-1})
    try { 
        // res.render('category',{category ,
        //                     msg:'',
        //                     clearInput:true,
        //                     data:paginatedData.data,
        //                     totalPages:paginatedData.totalPages,
        //                     currentPage:paginatedData.currentPage,
        //                     limit,
        //                 })
        res.redirect('/admin/category')
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
const editcategorypage = async(req,res)=>{
  const {id} = req.params
  const category = await Category.findById(id)
  console.log(category)
try {
    res.render('editcategory',{category,msg:''})
} catch (error) {
   console.error('error from category controller',error)
}
}

const editcategory = async (req,res)=>{
    const{name,description,id} = req.body
    console.log(name,description,id)
    try {
        const edited = await Category.findByIdAndUpdate(id,{name:name,description:description})
          req.session.msg = 'category edited successfully'
          res.redirect('/admin/Category')
    } catch (error) {
        req.session.msg = 'category should be unique'
        res.redirect('/admin/Category')
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
    editcategorypage,
    editcategory,
}