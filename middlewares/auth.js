const user = require('../models/user')
const userAuth = (req,res,next)=>{
    if(req.session.user){
        user.findById(req.session.user)
        .then(data=>{
            if(data && data.isBlocked){
                next()
            }
            else{
                res.redirect('/login')
            }
        })
        .catch((error)=>{
            console.log("error in user auth");
            res.status(500).send('internal server error')
            
        })
    }
    else{
        res.redirect('/login')
    }
}

const adminAuth =(req,res,next)=>{
    user.findOne({isAdmin:true})
       .then(data=>{
        if(data){
            next()
        }
        else{
            res.redirect('/admin/login')
        }
       })
    .catch((error)=>{
        console.log("error in adminauth middlewaree")
        res.status(500).send('Internal server error')
        
    })
}

module.exports = {
    userAuth,
    adminAuth,
}