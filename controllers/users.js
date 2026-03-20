const User = require("../models/user");
const crypto = require("crypto");
const nodemailer = require("nodemailer");




module.exports.renderSignupForm = (req, res) => {
    res.render("users/signup.ejs");
}

module.exports.signup = async (req, res) => {
    try {
        let { username, email, password } = req.body;
        const newUser = new User({ email, username });
        const registeredUser = await User.register(newUser, password);
       
        const token = crypto.randomBytes(32).toString("hex");
        registeredUser.verificationToken = token;
        registeredUser.verificationTokenExpires = Date.now() + 3600000;
        await registeredUser.save();
       

        const transport = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL,
            pass: process.env.PASS,
          },
        });

        const verifyLink = `http://localhost:8080/verify/${token}`;

        await transport.sendMail({
          from: process.env.EMAIL,
          to: registeredUser.email,
          subject: "verify your WanderNest account",
          text:  `Welcome to WanderNest! Please verify your email by clicking this link: ${verifyLink}`,
        });

        req.flash("success", "Signup successful! Please verify your email.");
        res.redirect("/login");
    }catch(e){
        req.flash("error",e.message)
        res.redirect("/signup");
    }
};

module.exports.renderloginForm = (req,res)=>{
    res.render("users/login.ejs");
};

module.exports.verifyEmail = async (req, res) => {
  const user = await User.findOne({
    verificationToken: req.params.token,
    verificationTokenExpires: { $gt: Date.now() },
  });

  if (!user) {
    req.flash("error", "Verification link is invalid or expired");
     return res.redirect("/login");
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;
  await user.save();
  req.flash("success", "Email verified successfully! Please login.");
  res.redirect("/login");
};


module.exports.login = async (req, res) => {
    
    if (!req.user.isVerified) {
      return req.logout(() => {
        req.flash("error", "Please verify your email first");
     res.redirect("/login");
      });
    }
    req.flash("success","Successfully LogedIn!");
    let redirectUrl  = res.locals.redirectUrl || "/listings";
    res.redirect(redirectUrl);
};

module.exports.logout = (req,res,next)=>{
    req.logout((err)=>{
        if(err){
            next(err);
        }
        req.flash("success","you are logged out");
        res.redirect("/listings");
    })
}