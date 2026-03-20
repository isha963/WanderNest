const { ref, required, number } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
  listing: {
    type: Schema.Types.ObjectId,
    ref: "Listing",
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  checkIn: {
    type: Date,
    required: true,
  },
  checkOut: {
    type: Date,
    required: true,
  },

  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "confirmed", "cancelled"],
    default: "pending",
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ["unpaid", "pending", "paid"],
    default: "unpaid",
  },

  approvedAt: Date,

  razorpayOrderId: String,
  razorpayPaymentId: String,
  
  totalPrice: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Booking", bookingSchema);