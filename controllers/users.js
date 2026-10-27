const User = require("../models/user");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const { Resend } = require("resend");


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
       
const resend = new Resend(process.env.RESEND_API_KEY);
        // const transport = nodemailer.createTransport({
        //   service: "gmail",
        //   host: "smtp.gmail.com",
        //   port: 465,
        //   secure: true,
        //   auth: {
        //     user: process.env.EMAIL,
        //     pass: process.env.PASS,
        //   },
        //   connectionTimeout: 10000,
        //   greetingTimeout: 10000,
        //   socketTimeout: 20000,
      // });
      
        const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
      const verifyLink = `${BASE_URL}/verify/${token}`;
      
        const { data, error } = await resend.emails.send({
          from: "WanderNest <onboarding@resend.dev>",
          to: [registeredUser.email],
          subject: "Verify your WanderNest account",
          text: `Welcome to WanderNest! Please verify your email by clicking this link: ${verifyLink}`,
        });
      
      if (error) {
        console.error("Verification email failed:", error.message);
        req.flash(
          "error",
          "Your account was created, but the verification email could not be sent. Please try again later.",
        );
        return res.redirect("/signup");
      }


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