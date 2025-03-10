const user = require('../models/user')
const userAuth = (req,res,next)=>{
    if(req.session.User){
       user.findById(req.session.User)
        .then(data=>{
            if(data){
            
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
        req.session.message = 'user not found'
        res.redirect('/login')
    }
}

const adminAuth =(req,res,next)=>{
    const data = req.session.data
        if(data){
            console.log('next')
            next()
        }
        else{
            console.log('not next')
            res.render('admin-login',{message:''})
        }
       }

const login = (req,res,next)=>{
    const data = req.session.data
    if(data){
        res.redirect('/admin/dashboard')
    }
    else{
        next()
    }
   
}
module.exports = {
    userAuth,
    adminAuth,
    login,
}