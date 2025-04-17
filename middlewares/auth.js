const user = require('../models/user')
const userAuth = (req,res,next)=>{
    console.log('hidsafa')
    if(req.session.User){
        console.log('dklajfdkajfl')
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
        console.log('hello')
        req.session.message = 'please login '
        res.redirect('/login')
    }
}

const fetchAuth = (req, res, next) => {
    console.log('🛡️ Middleware hit');
    console.log('Session:', req.session);

    if (req.session.User) {
        console.log('✅ User is logged in');
        user.findById(req.session.User)
            .then(data => {
                if (data) {
                    console.log('✅ User found in DB');
                    next();
                } else {
                    console.log('❌ User not found in DB');
                    res.redirect('/login');
                }
            })
            .catch((error) => {
                console.log("❌ Error in user auth", error);
                res.status(500).send('internal server error');
            });
    } else {
        return res.status(401).json({
            success: false,
            message: 'Please log in to use this feature.'
        });
    }
};


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
    fetchAuth,
}