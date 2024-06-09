const mongoose = require("mongoose");

const UserDataCollection = new mongoose.Schema({
	username: { type: String, required: true, unique: true },
	email: { type: String, required: true, unique: true },
	password: { type: String, required: true },
	citizenship: { type: String, required: true },
	firstName: { type: String, required: true },
	lastName: { type: String, required: true },
	dob: { type: Date, required: true },
	address: { type: String, required: true },
	phoneNumber: { type: String, required: true },
	ssn: { type: String },
	document: { type: Buffer },
	video: { type: Buffer },
	image: { type: Buffer },
	iban: { type: String },
	notifications: [{ type: String }],
	verificationState: { type: String, enum: ["passed", "failed", "pending"], default: "pending" },
	termsAndConditions: { type: Boolean, required: true },
});

module.exports = mongoose.model("UserData", UserDataCollection);
