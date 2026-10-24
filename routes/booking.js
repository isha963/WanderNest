const express = require("express");
const router = express.Router();

const bookingController = require("../controllers/bookings");
const { isLoggedIn, isHost } = require("../middleware");

const wrapAsync = require("../utils/wrapAsync.js");

router.post("/", isLoggedIn, wrapAsync(bookingController.createBooking));
router.post("/:id/approve", isLoggedIn, wrapAsync(bookingController.approveBooking));
router.post("/:id/reject", isLoggedIn, wrapAsync(bookingController.rejectBooking));
router.get("/:id/pay", isLoggedIn, wrapAsync(bookingController.bookingPayment));

router.post("/:id/create-order", isLoggedIn, wrapAsync(bookingController.createOrder));
router.post("/verify-payment", isLoggedIn, wrapAsync(bookingController.verifyPayment));

module.exports = router;