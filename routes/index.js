var express = require("express");
var router = express.Router();
const usermodel = require("./users");
const postmodel = require("./post");
const passport = require("passport");
const localStrategy = require("passport-local");
const upload = require("./multer");

passport.use(new localStrategy(usermodel.authenticate()));

router.get("/",function (req, res) {
  res.render("index", { footer: false });
});

router.get("/login", function (req, res) {
  res.render("login", { footer: false });
});

router.get("/feed", isLoggedIn,async function (req, res) {
  const user = await usermodel.findOne({username: req.session.passport.user})
 const posts = await postmodel.find().populate("user");
  res.render("feed", { footer: true ,posts, user});
});

router.get("/profile", isLoggedIn,async function (req, res) {
  const user = await usermodel.findOne({username: req.session.passport.user}).populate("posts")
  res.render("profile", { footer: true ,user});
});

router.get("/username/:username", isLoggedIn,async function (req, res) {
  const regex = new RegExp(`^${req.params.username}`, 'i');
  const users = await usermodel.find({username: regex})
  res.json(users);
});

router.get("/edit", isLoggedIn,async function (req, res) {
  const user = await usermodel.findOne({username: req.session.passport.user})
  res.render("edit", { footer: true ,user});
});

router.get("/search", isLoggedIn,async function (req, res) {
  const user = await usermodel.findOne({username: req.session.passport.user})
  res.render("search", { footer: true ,user});
});

router.get("/like/post/:id", isLoggedIn,async function (req, res) {
  const user = await usermodel.findOne({username: req.session.passport.user})
  const post= await postmodel.findOne({_id: req.params.id});
  if(post.likes.indexOf(user._id)===-1){
    post.likes.push(user._id);
  }
  else{
    post.likes.splice(post.likes.indexOf(user._id),1)
  }
  await post.save();
  res.redirect('/feed');
});

router.get("/upload", isLoggedIn,async function (req, res) {
  const user = await usermodel.findOne({username: req.session.passport.user})
  res.render("upload", { footer: true ,user});
});

router.post("/register", function (req, res) {
  var userdata = new usermodel({
    username: req.body.username,
    email: req.body.email,
    name: req.body.name,
  });

  usermodel.register(userdata, req.body.password).then(function () {
    passport.authenticate("local")(req, res, function () {
      res.redirect("/profile");
    });
  });
});

router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/profile",
    failureRedirect: "/login",
  }),
  function (req, res) {}
);

router.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

router.post("/update", upload.single("image"), async function (req, res) {
  const user = await usermodel.findOneAndUpdate({username: req.session.passport.user},
    {username:req.body.username, name:req.body.name, bio:req.body.bio},
    {new:true})

    if(req.file){
      user.profileImage = req.file.filename;
    }
    await user.save();
  res.redirect("/profile");
});

router.post("/upload", isLoggedIn, upload.single("image"),async function(req,res){
  const user = await usermodel.findOne({username: req.session.passport.user})
  // user.post = user.post || [];
  const post= await postmodel.create({
    picture: req.file.filename,
    user: user._id,
    caption: req.body.caption
  })
  user.posts.push(post._id);
  await user.save();
  res.redirect("/feed");
})

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

module.exports = router;
