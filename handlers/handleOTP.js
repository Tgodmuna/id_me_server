const mongoose = require("mongoose");
const User = require("../models/Users.js"); 

const tempStorage = {};

function saveOtpData(otpid, userData) {
	tempStorage[otpid] = userData;
	console.log("extracted by SaveOTP function", tempStorage[otpid]);
}

function getOtpData(otpid) {
	return tempStorage[otpid];
}

function deleteOtpData(otpid) {
	delete tempStorage[otpid];
}

async function handleVerifyOtp(req, res) {
    console.log("OTP Verification initiated");
    const { otp, otpid } = req.body;

    if (!otp || !otpid) {
        console.log("Missing OTP or OTP ID");
        return res.status(400).json({ message: "OTP and OTP ID are required" });
    }

    try {
        console.log(`Fetching OTP data for otpid: ${otpid}`);
        const otpData = getOtpData(otpid); // Retrieve OTP data based on the OTP ID

        if (!otpData) {
            console.log("Invalid or expired OTP ID");
            return res.status(400).json({ message: "Invalid or expired OTP ID" });
        }

        if (otpData.otp !== otp) {
            console.log("Invalid OTP");
            return res.status(400).json({ message: "Invalid OTP" });
        }

        // OTP is correct, proceed with user registration or other actions
        const { fullname, email, password, country, language } = otpData;
        console.log("OTP verified, registering user...");

        // Here, save the user data to the database
        const newUser = new User({
            fullName: fullname,
            email,
            password,
            country,
            language
        });

        await newUser.save();

        // Remove the OTP data after successful verification
        deleteOtpData(otpid);
        console.log("User registered and OTP data deleted");

        res.status(200).json({ message: "OTP verified and user registered successfully" });
    } catch (err) {
        console.error("Error verifying OTP:", err);
        res.status(500).json({ message: "Error verifying OTP" });
    }
}


module.exports = { saveOtpData, handleVerifyOtp };
