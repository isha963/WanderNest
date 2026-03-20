const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
  },

  role: {
    type: String,
    enum: ["user", "host"],
    default: "user",
  },

  isVerified: {
    type: Boolean,
    default: false,
  },

  verificationToken: String,

  verificationTokenExpires: Date,
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
