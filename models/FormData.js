// models/FormData.js
const mongoose = require("mongoose");

const formDataSchema = new mongoose.Schema({
	citizenship: String,
	firstName: String,
	lastName: String,
	dob: String,
	address: String,
	phoneNumber: String,
	ssn: String,
	iban: String,
	document: {
		data: Buffer,
		contentType: String,
	},
	video: {
		data: Buffer,
		contentType: String,
	},
	image: {
		data: Buffer,
		contentType: String,
	},
	UserFullName: String,
	userID: String,
	email: String,
	verified: Boolean,
});

const FormData = mongoose.model("FormData", formDataSchema);

module.exports = FormData;
