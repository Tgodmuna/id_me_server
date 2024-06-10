const mongoose = require("mongoose");

const formDataSchema = new mongoose.Schema({
	citizenship: String,
	firstName: String,
	lastName: String,
	dob: Date,
	address: String,
	phoneNumber: String,
	ssn: String,
	document: String,
	video: String,
	image: String,
	iban: String,
});

const FormData = mongoose.model("FormData", formDataSchema);

module.exports = FormData;
