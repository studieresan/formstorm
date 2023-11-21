const express = require("express");
const { body } = require("express-validator");
const controller = require("../controllers/create-event");
const util = require("../util");

const router = express.Router();

router.get("/create", controller.createEventGet);

router.post(
  "/create",
  body("channel_name").not().isEmpty().trim(),
  body("date").not().isEmpty().trim(),
  body("company_name").not().isEmpty().trim(),
  body("description").not().isEmpty().trim(),
  body("pre_form").not().isEmpty().trim(),
  body("post_form").not().isEmpty().trim(),
  controller.createEventPost
);

module.exports = router;
