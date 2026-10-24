const Listing = require("../models/listings");
const Booking = require("../models/booking");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
require("dotenv").config();

module.exports.createBooking = async (req, res) => {
  const { listingId, checkIn, checkOut } = req.body;

  const listing = await Listing.findById(listingId);
  if (!listing) {
    req.flash("error", "Listing not found");
    return res.redirect("back");
  }
  const newcheckin = new Date(checkIn);
  const newcheckout = new Date(checkOut);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (newcheckin < today) {
    req.flash("error", "Check-in date cannot be in the past");
    return res.redirect("back");
  }

  if (newcheckin >= newcheckout) {
    req.flash("error", "Invalid dates");
    return res.redirect("back");
  }
  const existingBooking = await Booking.findOne({
    listing: listingId,
    status: { $in: ["confirmed", "approved"] },
    checkIn: { $lt: newcheckout },
    checkOut: { $gt: newcheckin },
  });

  if (existingBooking) {
    req.flash("error", "selected dates are already booked");
    return res.redirect(`listings/${listingId}`);
  }

  const days = Math.ceil((newcheckout - newcheckin) / (1000 * 60 * 60 * 24));

  const totalPrice = days * listing.price;
  const newBooking = new Booking({
    listing: listingId,
    user: req.user._id,
    checkIn,
    checkOut,
    totalPrice,
  });

  await newBooking.save();
  

  req.flash("success", "booking created successfully");
  res.redirect(`/listings/${listingId}`);
};

module.exports.approveBooking = async (req, res) => {
  const { id } = req.params;
  const booking = await Booking.findById(id).populate("listing");

  if (!booking) {
    req.flash("error", "no booking found");
    return res.redirect("back");
  }

  if (!booking.listing.owner.equals(req.user._id)) {
    req.flash("error", "You are not authorized");
    return res.redirect("back");
  }

  const conflict = await Booking.findOne({
    _id: { $ne: booking._id },
    listing: booking.listing._id,
    status: { $in: ["confirmed", "approved"] },
    checkIn: { $lt: booking.checkOut },
    checkOut: { $gt: booking.checkIn },
  });

  if (conflict) {
    req.flash("error", "Another booking already confirmed for these dates.");
    return res.redirect("back");
  }

  booking.status = "approved";
  booking.paymentStatus = "pending";
  booking.approvedAt = new Date();

  await booking.save();

  req.flash("success", "Booking approved! Awaiting payment.");
  res.redirect("back");
};

module.exports.rejectBooking = async (req, res) => {
  const { id } = req.params;
  const booking = await Booking.findById(id).populate("listing");

  if (!booking) {
    req.flash("error", "no booking found");
    return res.redirect("back");
  }

  if (!booking.listing.owner.equals(req.user._id)) {
    req.flash("error", "You are not authorized");
    return res.redirect("back");
  }

  if (booking.status === "confirmed") {
    req.flash("error", "Cannot reject a confirmed booking");
    return res.redirect("back");
  }

  booking.status = "rejected";
  await booking.save();

  req.flash("success", "Booking rejected.");
  res.redirect("back");
};

module.exports.bookingPayment = async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate("listing")
    .populate("user");

  if (!booking) {
    req.flash("error", "Booking not found");
    return res.redirect("back");
  }

  if (booking.user._id.toString() !== req.user._id.toString()) {
    req.flash("error", "Unauthorized");
    return res.redirect("back");
  }

  if (booking.status !== "approved") {
    req.flash("error", "Booking not ready for payment");
    return res.redirect("back");
  }

  const diff = new Date() - booking.approvedAt;

  if (diff > 24 * 60 * 60 * 1000) {
    booking.status = "cancelled";
    await booking.save();

    req.flash("error", "Booking expired");
    return res.redirect("back");
  }

  res.render("bookings/pay.ejs", {
    booking,
    razorpayKey: process.env.RAZORPAY_KEY_ID,
  });
};

module.exports.createOrder = async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }
  if (booking.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  if (booking.status !== "approved") {
    return res.status(400).json({ error: "Booking not ready for payment" });
  }

  if (!booking.approvedAt) {
    return res.status(400).json({ error: "Booking approval time missing" });
  }

  const diff = new Date() - booking.approvedAt;
  if (diff > 24 * 60 * 60 * 1000) {
    booking.status = "cancelled";
    await booking.save();
    return res.status(400).json({ error: "Booking expired" });
  }

  if (booking.razorpayOrderId) {
    return res.json({
      id: booking.razorpayOrderId,
      amount: booking.totalPrice * 100,
      currency: "INR",
    });
  }

  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return res.status(500).json({ error: "Razorpay not configured" });
  }

  const razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });

  const amount = booking.totalPrice * 100;
  const currency = "INR";

  const order = await razorpay.orders.create({ amount, currency });

  booking.razorpayOrderId = order.id;
  await booking.save();

  return res.json(order);
};





async function sendConfirmationMail({ email, username, booking }) {
  try {
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASS,
      },
    });
   
    
    let mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Booking Confirmed - WanderNest",
      html: `
      <div style="font-family: Arial; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        
        <h2>🎉 Booking Confirmed!</h2>
        <p>Hi ${username},</p>
        <p>Your booking has been successfully confirmed.</p>

        <div style="background:#f8f9fa; padding:15px; border-radius:8px;">
          <p><strong>Booking ID:</strong> ${booking._id}</p>
          <p><strong>Property:</strong> ${booking.listing.title}</p>
          <p><strong>Check-in:</strong> ${new Date(booking.checkIn).toDateString()}</p>
          <p><strong>Check-out:</strong> ${new Date(booking.checkOut).toDateString()}</p>
          <p><strong>Total Paid:</strong> ₹${booking.totalPrice}</p>
        </div>

        <h3 style="color:#e74c3c;">Important</h3>
        <p>Please carry a valid ID proof at check-in:</p>
        <ul>
          <li>Aadhaar Card</li>
          <li>PAN Card</li>
          <li>Voter ID</li>
        </ul>

        <p><strong>Note:</strong> Entry may be denied without ID verification.</p>

        <hr/>

        <p>📍 ${booking.listing.location || "Location details shared at check-in"}</p>
        <p>Please show this email at check-in.</p>

        <p>Thanks,<br/><strong>WanderNest Team</strong></p>
      </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Mail Error:", err.message);
  }
}





module.exports.verifyPayment = async (req, res) => {
 
 try {
   const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
     req.body;

   const { RAZORPAY_KEY_SECRET } = process.env;
   if (!RAZORPAY_KEY_SECRET) {
     return res.status(500).json({ error: "Razorpay not configured" });
   }

   const expected = crypto
     .createHmac("sha256", RAZORPAY_KEY_SECRET)
     .update(`${razorpay_order_id}|${razorpay_payment_id}`)
     .digest("hex");

   

   const validSignature =
     typeof razorpay_signature === "string" &&
     razorpay_signature.length === expected.length &&
     crypto.timingSafeEqual(
       Buffer.from(razorpay_signature),
       Buffer.from(expected),
     );

   if (!validSignature) {
     return res.status(400).json({ error: "Invalid payment signature" });
   }
   // if (!validSignature) {
   //   console.log("Signature failed, bypassing for test");
   // }

   const booking = await Booking.findOne({ razorpayOrderId: razorpay_order_id })
     .populate("listing")
     .populate("user");
   if (!booking) {
     return res.status(404).json({ error: "Booking not found" });
   }
   
   if (
     !req.user ||
     !req.user._id ||
     booking.user._id.toString() !== req.user._id.toString()
   ) {
     return res.status(403).json({ error: "Unauthorized" });
   }

   
  
   if (booking.paymentStatus === "paid") {
     return res.status(400).json({ error: "Already paid" });
   }

   if (booking.status !== "approved") {
     return res.status(400).json({ error: "Invalid booking state" });
   }

   booking.paymentStatus = "paid";
   booking.status = "confirmed";
   booking.razorpayPaymentId = razorpay_payment_id;
   await booking.save();

   await sendConfirmationMail({
     email: booking.user.email,
     username: booking.user.username,
     booking: booking,
   });

    

   return res.json({
     success: true,
     message: "Payment verified & booking confirmed",
   });
 } catch (err) {
   console.error("Verify Payment Error:", err);
   return res.status(500).json({ error: "Something went wrong" });
 }
  
};
