const cron = require("node-cron");
const Booking = require("../models/booking");

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

async function expireUnpaidApprovedBookings() {
  const cutoff = new Date(Date.now() - TWENTY_FOUR_HOURS_MS);
  const result = await Booking.updateMany(
    {
      status: "approved",
      paymentStatus: { $ne: "paid" },
      approvedAt: { $lt: cutoff },
    },
    { $set: { status: "cancelled" } }
  );
  if (result.modifiedCount > 0) {
    console.log(`Auto-cancelled ${result.modifiedCount} expired booking(s)`);
  }
}

function startExpireBookingsCron() {
  cron.schedule("*/10 * * * *", () => {
    expireUnpaidApprovedBookings().catch((err) => {
      console.error("expireBookings cron error:", err);
    });
  });
}

module.exports = { startExpireBookingsCron };
