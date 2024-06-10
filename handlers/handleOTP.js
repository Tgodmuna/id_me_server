const User = require("../models/users.js");

const tempStorage = {};

function saveOtpData(otpid, userData) {
	tempStorage[otpid] = userData;
	console.log("extracted by SaveOTP function", tempStorage[otpid]);
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

		console.log(`Received OTP ID: ${otpid}, OTP: ${otp}`);

		const storedData = getOtpData(otpid);
		if (!storedData) {
			console.log(`Invalid OTP ID: ${otpid}`);
			res.statusCode = 400;
			res.setHeader("Content-Type", "text/plain");
			res.end("Invalid OTP ID");
			return;
		}

		console.log(`Stored OTP data for OTP ID: ${otpId}`, storedData);

		if (storedData.otp === otp) {
			try {
				const newUser = new User({
					username: storedData.username,
					email: storedData.email,
					password: storedData.hashedPassword,
				});

				await newUser.save();
				deleteOtpData(otpid);

				console.log(`User registered successfully: ${storedData.email}`);
				res.statusCode = 200;
				res.setHeader("Content-Type", "text/plain");
				res.end("User registered successfully");
			} catch (err) {
				console.error("Error saving user: ", err);
				res.statusCode = 500;
				res.setHeader("Content-Type", "text/plain");
				res.end("Error saving user");
			}
		} else {
			console.log(`Invalid OTP for OTP ID: ${otpId}`);
			res.statusCode = 400;
			res.setHeader("Content-Type", "text/plain");
			res.end("Invalid OTP");
		}
	});
}


module.exports = { saveOtpData, handleVerifyOtp };
