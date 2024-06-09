const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema({
	fullname: {
		type: String,
		required: true,
	},
	email: {
		type: String,
		required: true,
		unique: true,
	},
	password: {
		type: String,
		required: true,
	},
});

module.exports = mongoose.model("Registration", registrationSchema);
