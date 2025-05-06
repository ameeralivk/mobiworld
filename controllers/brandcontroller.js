
const brandschema = require('../models/brandSchema')
const getbrands = async(req,res)=>{
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const paginatedData = await getPaginatedData(page, limit);
    try {

        if(req.session.msg){
            console.log(req.session.msg)
           const msg = req.session.msg||''
           req.session.msg = null
            return  res.render('brand',{brand:paginatedData.data,
                data: paginatedData.data,
                msg:msg,
                totalPages: paginatedData.totalPages,
                currentPage: paginatedData.currentPage,
                limit,
                clearInput:false,  })
        }
           return  res.render('brand',{brand:paginatedData.data,
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

async function getPaginatedData(page, limit) {
    try {
        const skip = (page - 1) * limit;
        const data = await brandschema.find({isDeleted:false}).sort({createdOn:-1}).skip(skip).limit(limit).exec();
        const totalDocuments = await brandschema.countDocuments();

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
const addbrand = async(req,res)=>{
    try {
        res.render('addbrand')
    } catch (error) {
        console.log('categorycontroller error',error)
    }
}


const registerbrand = async(req,res)=>{
    const {brandname,description,Offer} = req.body
    console.log(brandname,description,Offer)
   try {
    const duplicate = await brandschema.findOne({
        brandName: { $regex: new RegExp(`^${brandname}$`, 'i') } 
      });
    console.log(duplicate,'dup')
    if(duplicate){
        req.session.msg = 'No duplicate brandname is allowed'
       return res.redirect("/admin/brands")
    }
    else{
        req.session.msg = 'brand created succesfully'
        const newbrand = new brandschema({brandName:brandname,description:description,Offer:Offer})
        await newbrand.save()
       return res.redirect("/admin/brands")
    }
   } catch (error) {
    console.log("categorycondroller error",error)
   }
}

const editbrandpage = async(req,res)=>{
    const {id} = req.params
    const brand = await brandschema.findById(id)
  try {
      res.render('editbrand',{brand,msg:''})
  } catch (error) {
     console.error('error from category controller',error)
  }
  }


  const editbrand = async (req,res)=>{
    const{brandname,description,id} = req.body
    try {
        const edited = await brandschema.findByIdAndUpdate(id,{brandName:brandname,description:description})
          req.session.msg = 'brand updated successfully'
          res.redirect('/admin/brands')
          if(!edited){
            req.session.msg = 'brand should be unique'
            res.redirect('/admin/brands')
          }
    } catch (error) {
       console.log('error from brandcontroller',error)
    }
}


const deletebrand = async(req,res)=>{
    const id = req.params.id
    const category = await brandschema.findById(id)
    try {
        if(category.isDeleted == true){
            const n = await brandschema.findByIdAndUpdate(id,{isDeleted:false})
          return  res.redirect('/admin/deletebrand')
        }
        else{
            await brandschema.findByIdAndUpdate(id,{isDeleted:true})
           return res.redirect('/admin/deletebrand')
        }
     
       
       
    } catch (error) {
        res.status(500).send('Error deleting category');
    }
}
const loadDeletebrand = async(req,res)=>{
    try {
            return res.redirect('/admin/brands')
    } catch (error) {
      
    }
  }


  const brandSearch =async(req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const Searchval = req.query.Searchval||''
    const searchfilter = {brandName:{$regex:Searchval,$options:'i'},isDeleted:false}
   const brands = await brandschema.find(searchfilter).skip((page - 1)*limit).limit(limit).sort({createdAt:-1});
   console.log(brands)
   const totalCount = await brandschema.countDocuments(searchfilter);
   const currentPage = page
   const totalPages = Math.ceil(totalCount / limit);
    try {
       return  res.render('brand',{ brand:brands,
            msg:'',
            data:brands,
            totalPages:totalPages,
            currentPage:currentPage,
            limit,
            clearInput:false,})
    } catch (error) {
        console.log("category contorller error",error)
    }
}
const brandclear = async(req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const paginatedData = await getPaginatedData(page, limit);
    const category = await brandschema.find({isDeleted:false}).sort({createdAt:-1})
    try { 
        res.redirect('/admin/brands')
    } catch (error) { 
        console.log(error)         
    }
}

module.exports = {
    getbrands,
    addbrand,
    registerbrand,
    editbrandpage,
    editbrand,
    deletebrand,
    loadDeletebrand,
    brandSearch,
    brandclear,
}