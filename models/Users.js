const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
	{
		fullName: {
			type: String,
			required: true,
			trim: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		password: {
			type: String,
			required: true,
		},
		country: {
			type: String,
			required: true,
		},
		language: {
			type: String,
			required: true,
		},
		notifications: [{ type: String }],
	},
	{ timestamps: true }
);

const User = mongoose.model("Users", userSchema);

module.exports = User;
