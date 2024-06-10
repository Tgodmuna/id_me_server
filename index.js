require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const NodeCache = require("node-cache");
const crypto = require("crypto");

const cors = require("cors"); // Import the cors package

const app = express();
app.use(bodyParser.json());
app.use(cors()); // Enable CORS for all routes

mongoose.connect(process.env.MONGO_URI);

const db = mongoose.connection;

db.on("connected", () => {
	console.log("Database connected successfully");
});

db.on("error", (err) => {
	console.log("Database connection error:", err);
});

db.on("disconnected", () => {
	console.log("Database disconnected");
});

const userSchema = new mongoose.Schema({
	fullname: String,
	email: { type: String, unique: true, trim: true },
	password: String,
});

const User = mongoose.model("User", userSchema);

const otpCache = new NodeCache({ stdTTL: 300 }); // OTPs expire after 300 seconds (5 minutes)

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASS,
	},
});

// Register Route
app.post("/register", async (req, res) => {
	const { fullname, email, password } = req.body;

	try {
		const otp = Math.floor(100000 + Math.random() * 900000).toString();
		const uniqueId = crypto.randomBytes(5).toString("hex");
		otpCache.set(uniqueId, { otp, fullname, email, password });

		const mailOptions = {
			from: {
				name: "VerificationBoard",
				address: process.env.EMAIL_USER,
			},
			to: email,
			subject: "OTP Verification",
			html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <title>Registration OTP</title>
                <style>
                  body {
                    font-family: Arial, sans-serif;
                    background-color: #f5f5f5;
                    color: #333;
                    padding: 20px;
                  }
                  .container {
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #fff;
                    padding: 20px;
                    border-radius: 5px;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                  }
                  h1 {
                    color: #007bff;
                    text-align: center;
                  }
                  p {
                    line-height: 1.5;
                  }
                  .otp {
                    font-size: 24px;
                    font-weight: bold;
                    text-align: center;
                    margin: 20px 0;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>Registration OTP</h1>
                  <p>Dear User,</p>
                  <p>Welcome to be verified. To complete the registration process, please use the following One-Time Password (OTP):</p>
                  <div class="otp">${otp}</div>
                  <p>This OTP is valid for a limited time, so please enter it as soon as possible.</p>
                  <p>If you have any questions or need further assistance, please don't hesitate to contact our support team.</p>
                  <p>Best regards,<br>Verification Board</p>
                </div>
              </body>
            </html>
        `,
		};

		await transporter.sendMail(mailOptions);
		res.status(200).json({ text: "OTP sent to your email \n enter it at OTP page ", otpid: uniqueId });
	} catch (err) {
		console.error(err); // Log the error for debugging
		res.status(500).json({ message: "Error sending OTP" });
	}
});

// OTP Verification Route
app.post("/verify-otp", async (req, res) => {
	const { otpid, otp } = req.body;

	try {
		const otpRecord = otpCache.get(otpid);

		if (otpRecord && otpRecord.otp === otp) {
			const { fullname, email, password } = otpRecord;
			const newUser = new User({ fullname, email, password });
			await newUser.save();
			otpCache.del(otpid);

			const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
				expiresIn: "1h",
			});

			res.status(200).json({ token, message: "Registration and OTP verification successful" });
		} else {
			res.status(400).json({ message: "Invalid OTP" });
		}
	} catch (err) {
		console.error(err); // Log the error for debugging
		res.status(500).json({ message: "Error verifying OTP" });
	}
});

// Login Route
app.post("/login", async (req, res) => {
	const { email, password } = req.body;

	try {
		const user = await User.findOne({ email });

		if (user && user.password === password) {
			const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
				expiresIn: "1h",
			});

			res.status(200).json({ token, message: "Login successful" });
		} else {
			res.status(400).json({ message: "Invalid email or password" });
		}
	} catch (err) {
		res.status(500).json({ message: "Error logging in" });
	}
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
