require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const NodeCache = require("node-cache");
const crypto = require("crypto");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const FormData = require("./models/FormData.js");

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

// Multer storage configuration
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, "uploads/");
	},
	filename: (req, file, cb) => {
		cb(null, uuidv4() + path.extname(file.originalname));
	},
});

const upload = multer({ storage });

// Register Route
app.post("/register", async (req, res) => {
	const { fullname, email, password, country, language } = req.body;

	try {
		// Check if the user already exists
		const existingUser = await User.findOne({ email });

		if (existingUser) {
			return res.status(400).json({ message: "User already exists with this email" });
		}

		// Generate OTP
		const otp = Math.floor(100000 + Math.random() * 900000).toString();
		const uniqueId = crypto.randomBytes(5).toString("hex");
		otpCache.set(uniqueId, { otp, fullname, email, password, country, language });

		// Mail options
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

		// Send the OTP email
		await transporter.sendMail(mailOptions);
		res.status(200).json({ text: "OTP sent to your email. Enter it on the OTP page.", otpid: uniqueId });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Error sending OTP" });
	}
});

// OTP Verification Route
app.post("/verify-otp", async (req, res) => {
	const { otpid, otp } = req.body;

	try {
		const otpRecord = otpCache.get(otpid);

		if (otpRecord && otpRecord.otp === otp) {
			const { fullname, email, password, language, country } = otpRecord;
			console.log(fullname, email, password, language, country);
			const newUser = new User({
				fullName: fullname,
				email: email,
				password: password,
				language: language,
				country: country,
			});
			await newUser.save();
			otpCache.del(otpid);

			res.status(200).json({ message: "Registration and OTP verification successful" });
		} else {
			res.status(400).json({ message: "Invalid OTP" });
		}
	} catch (err) {
		console.error(err); // Log the error for debugging
		res.status(500).json({ message: "Error verifying OTP", reason: err });
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

			// Return user details along with the token
			const { _id, fullName, language, country } = user;
			res.status(200).json({
				token,
				user: { _id, fullName, email, language, country },
				message: "Login successful",
			});
		} else {
			res.status(400).json({ message: "Invalid email or password" });
		}
	} catch (err) {
		console.error(err); // Log the error for debugging
		res.status(500).json({ message: "Error logging in" });
	}
});

// New route to handle data submission and save to MongoDB
app.post(
	"/upload",
	upload.fields([
		{ name: "document", maxCount: 1 },
		{ name: "video", maxCount: 1 },
		{ name: "image", maxCount: 1 },
	]),
	async (req, res) => {
		try {
			const { citizenship, firstName, lastName, dob, address, phoneNumber, ssn, iban } = req.body;

			const newFormData = new FormData({
				citizenship,
				firstName,
				lastName,
				dob,
				address,
				phoneNumber,
				ssn,
				document: req.files["document"] ? req.files["document"][0].filename : null,
				video: req.files["video"] ? req.files["video"][0].filename : null,
				image: req.files["image"] ? req.files["image"][0].filename : null,
				iban,
			});

			await newFormData.save();
			res.status(200).json({ message: "Data uploaded and saved successfully" });
		} catch (err) {
			console.error(err);
			res.status(500).json({ message: "Error uploading and saving data" });
		}
	}
);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});




