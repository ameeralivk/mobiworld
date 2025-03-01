
// const loadhome = async (req,res)=>{
//   try {
//     const user = req.session.user
//     console.log(user)
//     if(user){
//       const userData = await user.findOne({_id:user._id})
//       res.render('home',{user:userData})
//     }
//     else{
//       return res.render('home')
//     }
    
//   } catch (error) {
//     console.log("home page not loading",error);
//     res.status(500).send('Server Error');
//   }

// }
// const pagenotfound = async (req,res)=>{
//     try {
//         res.render("page-404")
//     } catch (error) {
//         res.redirect('pageNotFound')
//     }
// }


// module.exports ={
//     loadhome,
//     pagenotfound,
// }
