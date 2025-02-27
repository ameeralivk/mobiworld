const express = require("express")
const app = express()
const path = require('path')
const db = require('./config/db')
const dotenv = require('dotenv')
const userRouter = require('./routes/userRouter')
const homerouter = require('./routes/homeRouter')
const adminRouter = require('./routes/adminRouter')
const ejs = require('ejs')
const session = require('express-session')
const passport =require('./config/passport')
dotenv.config()
db()

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.set('view engine','ejs')
app.set("views",[path.join(__dirname,"views/user"),path.join(__dirname,"views/admin")])
app.use(express.static(path.join(__dirname,"public")))
app.use(session({
   secret: process.env.SESSION_SECRET,
   resave: false,
   saveUninitialized: false, 
   cookie: { 
       secure: process.env.NODE_ENV === 'production',
       maxAge: 24 * 60 * 60 * 1000,
       httpOnly:true,
   }
}));
app.use(passport.initialize())
app.use(passport.session())
app.use('/',userRouter)
app.use('/user',userRouter)
app.use('/admin',adminRouter)
app.listen(process.env.PORT,()=>{
   console.log('server is started')

})


module.exports = app