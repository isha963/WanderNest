const express = require("express");
const router = express.Router();
const listingController = require("../controllers/listings"); 
router.route("/")
  .get(listingController.index); 

module.exports = router;
