const register = require("../models/registrationModel.js");

const tempStorage = {};

function saveOtpData(otpid, registerData) {
	tempStorage[otpid] = registerData;
	console.log("extracted by SaveOTP function", tempStorage[otpid]);
}

function getOtpData(otpid) {
	return tempStorage[otpid];
}

function deleteOtpData(otpid) {
	delete tempStorage[otpid];
}

async function handleVerifyOtp(req, res) {
	let body = "";
	req.on("data", (chunk) => {
		body += chunk.toString();
	});
	req.on("end", async () => {
		const { otpid, otp } = JSON.parse(body);

		const storedData = getOtpData(otpid);
		if (!storedData) {
			res.statusCode = 400;
			res.setHeader("Content-Type", "text/plain");
			res.end("Invalid OTP");
			return;
		}

		console.log(`Stored OTP data for OTP ID: ${otpid}`, storedData);

		if (storedData.otp === otp) {
			try {
				const newregister = new register({
					fullname: storedData.fullname,
					email: storedData.email,
					password: storedData.hashedPassword,
				});

				await newregister.save();
				deleteOtpData(otpid);

				console.log(`register registered successfully: ${storedData.email}`);
				res.statusCode = 200;
				res.setHeader("Content-Type", "text/plain");
				res.end("register registered successfully");
			} catch (err) {
				console.error("Error saving register: ", err);
				res.statusCode = 500;
				res.setHeader("Content-Type", "text/plain");
				res.end("Error saving register");
			}
		} else {
			console.log(`Invalid OTP for OTP ID: ${otpid}`);
			res.statusCode = 400;
			res.setHeader("Content-Type", "text/plain");
			res.end("Invalid OTP");
		}
	});
}

module.exports = { saveOtpData, handleVerifyOtp };
