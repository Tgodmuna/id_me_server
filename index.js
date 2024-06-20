require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const FormData = require("./models/FormData.js");
const User = require("./models/Users");
const { handleVerifyOtp, saveOtpData } = require("./handlers/handleOTP.js");

// const corsOptions = {
// 	origin: "*",
// 	methods: ["GET", "POST", "PATCH", "DELETE"],
// 	allowedHeaders: ["Content-Type", "Authorization"],
// };

const customCors = (req, res, next) => {
	const allowedOrigins = ["http://localhost:3000", "https://verification-board.netlify.app"];
	const origin = req.headers.origin;
	if (allowedOrigins.includes(origin)) {
		res.header("Access-Control-Allow-Origin", origin);
	}
	res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE");
	res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
	if (req.method === "OPTIONS") {
		res.sendStatus(200);
	} else {
		next();
	}
};

const app = express();
app.use(customCors);
app.use(bodyParser.json());
// app.use(cors(corsOptions)); // Enable CORS for all routes

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

const tempStorage = {}; // Temporary storage for registration data

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASS,
	},
});

// Multer storage configuration to use memory storage
// const storage = multer.memoryStorage();
const upload = multer({
	storage: multer.memoryStorage(),
	fileFilter: function (req, file, cb) {
		const allowedTypes = ["image/jpeg", "image/png", "video/webm", "application/pdf"];
		if (allowedTypes.includes(file.mimetype)) {
			cb(null, true);
		} else {
			cb(new Error("Invalid file type"));
		}
	},
}).fields([
	{ name: "image", maxCount: 1 },
	{ name: "video", maxCount: 1 },
	{ name: "document", maxCount: 1 },
]);

// Test Route to Check Email Sending
app.get("/test-email", async (req, res) => {
	const mailOptions = {
		from: {
			name: "VerificationBoard",
			address: process.env.EMAIL_USER,
		},
		to: "aguthankgod@gmail.com",
		subject: "Test Email",
		text: "This is a test email sent from the application.",
	};

	try {
		await transporter.sendMail(mailOptions);
		res.status(200).json({ message: "Test email sent successfully" });
	} catch (err) {
		console.error("Error sending test email:", err);
		res.status(500).json({ message: "Error sending test email", error: err });
	}
});

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
		saveOtpData(uniqueId, { otp, fullname, email, password, country, language });

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
		console.error("Error sending OTP:", err);
		res.status(500).json({ message: "Error sending OTP", error: err });
	}
});

// OTP Verification Route
app.post("/verify-otp", async (req, res) => {
	handleVerifyOtp(req, res);
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
		console.error(err);
		res.status(500).json({ message: "Error logging in" });
	}
});

// New route to handle data submission and
app.post("/upload", upload, async (req, res) => {
	try {
		const { citizenship, firstName, lastName, dob, address, phoneNumber, ssn, iban, userDetails } = req.body;

		console.log(req.body);
		console.log("req. files", req.files["image"], req.files["video"]);

		if (!citizenship || !firstName || !lastName || !dob || !address || !phoneNumber) {
			return res.status(400).json({ message: "All fields are required" });
		}

		if (citizenship === "USA" && !ssn && !req.files["video"] && !req.files["image"] && !req.files["document"]) {
			return res.status(400).json({
				message: "SSN , document upload, image  and video capturing  are required for USA citizenship",
			});
		}

		if (
			citizenship === "Germany" &&
			!iban &&
			!req.files["video"] &&
			!req.files["document"] &&
			!req.files["image"]
		) {
			return res.status(400).json({
				message: "IBAN , document upload, image  and video capturing  are  required for Germany citizenship",
			});
		}

		if (!req.files || !req.files["document"] || !req.files["image"]) {
			return res.status(400).json({ message: "All files are required" });
		}

		let parsedUserDetails;
		try {
			parsedUserDetails = JSON.parse(userDetails);
		} catch (err) {
			return res.status(400).json({ message: "Invalid user details format" });
		}

		const newFormData = new FormData({
			citizenship,
			firstName,
			lastName,
			dob,
			address,
			phoneNumber,
			ssn: citizenship === "USA" ? ssn : null,
			iban: citizenship === "Germany" ? iban : null,
			document: {
				data: req.files["document"][0].buffer,
				contentType: req.files["document"][0].mimetype,
			},
			video: req.files["video"]
				? {
						data: req.files["video"][0].buffer,
						contentType: req.files["video"][0].mimetype,
				  }
				: null,
			image: {
				data: req.files["image"][0].buffer,
				contentType: req.files["image"][0].mimetype,
			},
			UserFullName: parsedUserDetails.fullName,
			userID: parsedUserDetails._id,
			email: parsedUserDetails.email,
			verified: false,
		});

		await newFormData.save();

		res.status(200).json({ message: "Data uploaded and saved successfully" });
	} catch (err) {
		console.error("Error uploading and saving data:", err);
		res.status(500).json({ message: "Error uploading and saving data", error: err.message });
	}
});

// Get all users route
app.get("/users", async (req, res) => {
	try {
		// Fetch all users from the database
		const users = await FormData.find();

		// Return the list of users as JSON response
		res.status(200).json(users);
	} catch (err) {
		// If an error occurs, send an error response
		console.error("Error fetching users:", err);
		res.status(500).json({ message: "Error fetching users", error: err });
	}
});

// Send email to a particular user route
app.post("/send-email", async (req, res) => {
	const { email, subject, message } = req.body;

	try {
		// Fetch the user from the database based on the email
		const user = await User.findOne({ email });

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		// Construct the email options
		const mailOptions = {
			from: {
				name: "Admin",
				address: process.env.EMAIL_USER,
			},
			to: user.email,
			subject: subject,
			html: `
			<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Template</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            background-color: #f5f5f5;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #fff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #333;
            text-align: center;
        }
        p {
            color: #666;
            margin-bottom: 20px;
        }
        .message {
            padding: 20px;
            background-color: #f9f9f9;
            border-radius: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>{${subject}}</h1>
        <div class="message">
            <p>Hello,</p>
            <p>This is a message from the admin:</p>
            <p>{${message}}</p>
            <p>Best regards,</p>
            <p>Admin</p>
        </div>
    </div>
</body>
</html>
`,
		};

		// Send the email
		await transporter.sendMail(mailOptions);

		res.status(200).json({ message: "Email sent successfully" });
	} catch (err) {
		// If an error occurs, send an error response
		console.error("Error sending email:", err);
		res.status(500).json({ message: "Error sending email", error: err });
	}
});

// Post notification to a particular user route
app.post("/post-notification", async (req, res) => {
	const { userId, notification } = req.body;

	try {
		// Fetch the user from the database based on the userId
		const user = await User.findById(userId);

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		// Update the user's notifications array with the new notification
		user.notifications.push(notification);

		// Save the updated user document
		await user.save();

		res.status(200).json({ message: "Notification posted successfully" });
	} catch (err) {
		// If an error occurs, send an error response
		console.error("Error posting notification:", err);
		res.status(500).json({ message: "Error posting notification", error: err });
	}
});

// Fetch all notifications for a particular user route
app.get("/notifications/:userId", async (req, res) => {
	const userId = req.params.userId;

	try {
		// Fetch the user from the database based on the userId
		const user = await User.findById(userId);

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		// Return the user's notifications as JSON response
		res.status(200).json({ notifications: user.notifications });
	} catch (err) {
		// If an error occurs, send an error response
		console.error("Error fetching notifications:", err);
		res.status(500).json({ message: "Error fetching notifications", error: err });
	}
});

// Modify verified property route
app.patch("/verified/:userId", async (req, res) => {
	const formDataId = req.params.userId;
	const { verified } = req.body;

	try {
		// Find the user form data by ID
		const formData = await FormData.findById(formDataId);

		if (!formData) {
			return res.status(404).json({ message: "Form data not found" });
		}

		// Update the verified property
		formData.verified = verified;

		// Save the updated form data
		await formData.save();

		res.status(200).json({ message: "Verification status updated successfully" });
	} catch (err) {
		// If an error occurs, send an error response
		console.error("Error modifying verification status:", err);
		res.status(500).json({ message: "Error modifying verification status", error: err });
	}
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
