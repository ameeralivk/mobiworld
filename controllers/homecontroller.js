
const loadhome = async (req,res)=>{
  try {
     res.render('home')
  } catch (error) {
    console.log(error)
  }

}
const pagenotfound = async (req,res)=>{
    try {
        res.render("page-404")
    } catch (error) {
        res.redirect('pageNotFound')
    }
}


module.exports ={
    loadhome,
    pagenotfound,
}
