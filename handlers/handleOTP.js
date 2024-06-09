const User = require("../models/users.js");

const tempStorage = {};

function saveOtpData(otpId, userData) {
	tempStorage[otpId] = userData;
}

function getOtpData(otpId) {
	return tempStorage[otpId];
}

function deleteOtpData(otpId) {
	delete tempStorage[otpId];
}

async function handleVerifyOtp(req, res) {
	let body = "";
	req.on("data", (chunk) => {
		body += chunk.toString();
	});
	req.on("end", async () => {
		const { otpId, otp } = JSON.parse(body);

		const storedData = getOtpData(otpId);
		if (!storedData) {
			res.statusCode = 400;
			res.setHeader("Content-Type", "text/plain");
			res.end("Invalid OTP ID");
			return;
		}

		if (storedData.otp === otp) {
			try {
				const newUser = new User({
					username: storedData.username,
					email: storedData.email,
					password: storedData.hashedPassword,
				});

				await newUser.save();
				deleteOtpData(otpId);

				res.statusCode = 200;
				res.setHeader("Content-Type", "text/plain");
				res.end("User registered successfully");
			} catch (err) {
				res.statusCode = 500;
				res.setHeader("Content-Type", "text/plain");
				res.end("Error saving user");
			}
		} else {
			res.statusCode = 400;
			res.setHeader("Content-Type", "text/plain");
			res.end("Invalid OTP");
		}
	});
}

module.exports = { saveOtpData, handleVerifyOtp };
