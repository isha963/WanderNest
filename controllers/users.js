const User = require("../models/user");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const { Resend } = require("resend");


module.exports.renderSignupForm = (req, res) => {
    res.render("users/signup.ejs");
}

module.exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const newUser = new User({ email, username });
    const registeredUser = await User.register(newUser, password);

    // Generate and save the email verification token
    const token = crypto.randomBytes(32).toString("hex");

    registeredUser.verificationToken = token;
    registeredUser.verificationTokenExpires = Date.now() + 3600000;

    await registeredUser.save();

    // Build the verification link
    const BASE_URL = (process.env.BASE_URL || "http://localhost:8080").replace(
      /\/$/,
      "",
    );

    const verifyLink = `${BASE_URL}/verify/${token}`;

    // Send the verification email using Google Apps Script
    const response = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secret: process.env.EMAIL_API_SECRET,
        to: registeredUser.email,
        subject: "Verify your WanderNest account",
        text: `Welcome to WanderNest!

Please verify your email by clicking the link below:

${verifyLink}

This link expires in one hour.

If you did not create this account, you can ignore this email.`,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error(
        "Verification email failed:",
        result.message || "Unknown email service error",
      );

      req.flash(
        "error",
        "Your account was created, but the verification email could not be sent. Please try again later.",
      );

      return res.redirect("/signup");
    }

    req.flash(
      "success",
      "Signup successful! Please check your email to verify your account.",
    );

    return res.redirect("/login");
  } catch (e) {
    console.error("Signup error:", e.message);

    req.flash("error", e.message);
    return res.redirect("/signup");
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