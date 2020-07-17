var express = require("express"),
    mongoose = require("mongoose"),
    bodyParser=require("body-parser"),
    passport=require("passport"),
    LocalStratergy=require("passport-local"),
    passportLocalMongoose=require("passport-local-mongoose"),
    expressSession=require("express-session");
var port = process.env.PORT || 8000;
var app = express();
app.use(express.static("public"));


//database stup
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/car", { useNewUrlParser: true })

//car schema setup
var carSchema=new mongoose.Schema({
    make : String,
    fuel_type : String,
    aspiration : String,
    num_of_doors : String,
    body_style : String,
    drive_wheels : String,
    engine_location : String,
    rent : Number,
    image : String,
    num_of_book : {type:Number, default:0},
    num: String,
})
var Car = mongoose.model("car",carSchema)


//visitor schema   
var userSchema=new mongoose.Schema({
    username : String,
    password : String,
    visitor_name : String,
    phone    : Number,
    car_booked : [{car_name : String,
                   car_num: String,
                   rent: String, 
                   issue_date : Date,
                   return_date: Date}]
})
userSchema.plugin(passportLocalMongoose)
var User=mongoose.model("user",userSchema)

app.use(bodyParser.urlencoded({extended:true}))

//visitor session
app.use(require("express-session")({
    secret:"this is a dog",
    resave:false,
    saveUninitialized:false
}))

app.use(passport.initialize())
app.use(passport.session())
passport.use(new LocalStratergy(User.authenticate()))

passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())


app.set("view engine","ejs")

//landing page
app.get("/",function(req, res){
    res.render("landing")
})


//add car info (get req)
app.get("/add_car", isLoggedIn,function(req, res){
    res.render("new_car")
})

//add car info (post req)
app.post("/add_car", isLoggedIn,function(req, res){
     Car.create(req.body.car) 
     res.redirect("/view_car")
})

//show cars
app.get("/view_car", function(req, res){
    Car.find({},function(err, cars){
    if(err){
        res.send("ERROR OCCURED !!!")
    }
    res.render("visit_cars", {cars : cars, currentuser : req.user })
    })
})


//car details
app.get("/view_car/:id", function(req, res){
    Car.findById(req.params.id, function(err, car){
    if(err){
        res.send("ERROR OCCURED !!!")
    }
    res.render("car_info", {car : car, currentuser : req.user })
    })
})

//filter cars
app.post("/view_car/car_filter", function(req, res){
var opt = req.body.rent
if(opt == "All"){
    Car.find().exec( function(err, cars){
        res.render("visit_cars",{cars:cars, currentuser:req.user});
        })    
}
if(opt == "< 5000"){
Car.find({rent:{$lt: 5000}}).sort({rent : 1}).exec( function(err, cars){
res.render("visit_cars",{cars:cars, currentuser:req.user});
})}

if(opt == "5000 - 10000"){
    Car.find({rent:{$gt: 5000, $lt: 10000}}).sort({rent : 1}).exec( function(err, cars){
    res.render("visit_cars",{cars:cars, currentuser:req.user});
    })}
    
if(opt == "10000 - 15000"){
Car.find({rent:{$gt: 10000, $lt: 15000}}).sort({rent : 1}).exec( function(err, cars){
res.render("visit_cars",{cars:cars, currentuser:req.user});
})}
    
if(opt == "> 15000"){
Car.find({rent:{$gt: 15000}}).sort({rent : 1}).exec( function(err, cars){
res.render("visit_cars",{cars:cars, currentuser:req.user});
})}
})


//visitor page
app.get("/visitor_page", isLoggedIn, function(req,res){
    User.findById(req.user._id, function(err, user){
    res.render("vis_page",{user:user, currentuser: req.user})
    })    
})

//visitor register (get req)
app.get("/visitor_register",function(req,res){
    res.render("vis_register")
})

//visitor register (post req)
app.post("/visitor_register",function(req,res){
User.register(new User({username : req.body.username, 
                        visitor_name : req.body.visitor_name,
                        phone : req.body.phone }),req.body.password,function(err,user){
if(err){
console.log(err)
return res.send("Not registered, email already exist")
}
passport.authenticate("local")(req,res, function(){   
res.redirect("/visitor_page")
    })})}) 

//visitor login  (get req)
app.get("/visitor_login",function(req,res){
res.render("vis_login")
    })

//visitor login (post req)    
app.post("/vis_login",passport.authenticate("local",{
successRedirect:"/visitor_page",
failureRedirect:"/visitor_login"
    }),function(req,res){

})

//visitor logout
app.get("/visitor_logout",function(req,res){
req.logout()
res.redirect("/visitor_login")
})

//book car (get req)
app.get("/view_car/:id/book_now", isLoggedIn,function(req, res){
Car.findById(req.params.id, function(err, car){
User.findById(req.user._id, function(err, user){
    res.render("book_car", {car : car, user : user})
})})
  
})

//book car (post req)

app.post("/view_car/:cid/book_now/:uid", isLoggedIn,function(req, res){
var bookings = 0
    Car.findOne({_id : req.params.cid}, function(err, data){
        if(data){
        bookings = Number(data.num_of_book) + 1
    Car.findByIdAndUpdate(req.params.cid, {num_of_book : bookings},function(err, data){})
    }
})


Car.findById(req.params.cid, function(err, car){
User.updateOne({_id : req.params.uid}, {$push : {car_booked:{
    car_name : car.make,
    rent:car.rent,
    car_num: car.num,
    issue_date : req.body.i_date1,
    return_date: req.body.i_date2}}}
,function(err, user){
res.send("Successfully Booked")
})}) 
})

//update car details (get req)
app.get("/view_car/:id/update", isLoggedIn,function(req, res){
Car.findById(req.params.id, function(err, data){
    if(data.num_of_book == 0){
        res.render("update_car", {car : data})
    }
    else{
        res.send("Bookings Already Exist For This Car You Cannot Update It !!")
    }
})})

//update car details (post req)
app.post("/view_car/:id/update", isLoggedIn, function(req, res){
    Car.findByIdAndUpdate(req.params.id, req.body.car, function(err, data){
        var str = "/view_car/"+String(req.params.id)
        res.redirect(str)
    })
})

//delete car
app.post("/view_car/:id/:book/delete", isLoggedIn, function(req, res){
    if(req.params.book == 0){
    Car.findByIdAndRemove(req.params.id, function(err, data){
    res.redirect("/view_car/")
    })}
    else{
        res.send("Bookings Already Exist For This Car You Cannot DELETE It !!")
    }
})

//visitor authentication middleware
function isLoggedIn(req,res,next){
if(req.isAuthenticated()){
return next()
}
res.redirect("/visitor_login")
}



app.listen(port, function() {
    console.log("App is running on port " + port);
});
