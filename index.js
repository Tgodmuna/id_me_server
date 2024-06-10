require("dotenv").config();
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
// const registre = require("./models/registerModel.js");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const otpGenerator = require("otp-generator");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const { saveOtpData, handleVerifyOtp } = require("./handlers/handleOTP.js");
const JWT_SECRET = process.env.JWT_SECRET;

// Load environment variables from .env file
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose.connect(MONGO_URI);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
	console.log("Connected to MongoDB");
});

// handleRegister handles the registration of a new user
async function handleRegister(req, res) {
	let body = "";
	req.on("data", (chunk) => {
		body += chunk.toString();
	});
	req.on("end", async () => {
		const { username, email, password } = JSON.parse(body);
		const hashedPassword = await bcrypt.hash(password, 10);

		try {
			const existingUser = await User.findOne({ email });
			if (existingUser) {
				res.statusCode = 400;
				res.setHeader("Content-Type", "text/plain");
				res.end("Email already registered");
			} else {
				const otp = otpGenerator.generate(6, { upperCase: false, specialChars: true, digits: true });
				const otpId = uuidv4();

				saveOtpData(otpId, { username, email, hashedPassword, otp });

				const transporter = nodemailer.createTransport({
					service: "gmail",
					host: "smtp.gmail.com",
					auth: {
						user: process.env.EMAIL_USER,
						pass: process.env.EMAIL_PASS,
					},
				});
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
                              <p>Thank you for registering with our platform. To complete the registration process, please use the following One-Time Password (OTP):</p>
                              <div class="otp">${otp}</div>
                              <p>This OTP is valid for a limited time, so please enter it as soon as possible.</p>
                              <p>If you have any questions or need further assistance, please don't hesitate to contact our support team.</p>
                              <p>Best regards,<br>Verification Board</p>
                            </div>
                          </body>
                        </html>
                    `,
				};

				transporter.sendMail(mailOptions, (error, info) => {
					if (error) {
						console.log("Error sending OTP email: ", error);
						res.statusCode = 500;
						res.setHeader("Content-Type", "text/plain");
						res.end("Error sending OTP");
					} else {
						console.log("Email sent: " + info.response);
						res.statusCode = 200;
						res.setHeader("Content-Type", "application/json");
						res.end(
							JSON.stringify({
								text: `OTP sent to ${email}. Please enter the OTP to complete registration.`,
								otpID: otpId,
							})
						);
					}
				});
			}
		} catch (err) {
			console.error("Error during registration: ", err);
			res.statusCode = 500;
			res.setHeader("Content-Type", "text/plain");
			res.end("Error registering user");
		}
	});
}

//handle login
async function handleLogin(req, res) {
	let body = "";
	req.on("data", (chunk) => {
		body += chunk.toString();
	});
	req.on("end", async () => {
		const { email, password } = JSON.parse(body);
		const user = await User.findOne({ email });

		if (!user) {
			res.statusCode = 400;
			res.setHeader("Content-Type", "text/plain");
			res.end("User not found");
			return;
		}

		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			res.statusCode = 400;
			res.setHeader("Content-Type", "text/plain");
			res.end("Invalid password");
			return;
		}

		const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1h" });
		res.statusCode = 200;
		res.setHeader("Content-Type", "application/json");
		res.end(JSON.stringify({ token }));
	});
}

// Create a CORS middleware
const corsMiddleware = cors({
	origin: "http://localhost:3000", // Allow only this origin
	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allowed methods
	allowedHeaders: ["Content-Type", "Access-Control-Allow-Headers"], // Allowed headers
});

// Utility function to use middleware with Node.js HTTP server
const useMiddleware = (req, res, middleware) => {
	return new Promise((resolve, reject) => {
		middleware(req, res, (result) => {
			if (result instanceof Error) {
				return reject(result);
			}
			return resolve(result);
		});
	});
};
const server = http.createServer(async (req, res) => {
	try {
		await useMiddleware(req, res, corsMiddleware);

		if (req.method === "OPTIONS") {
			res.writeHead(204);
			res.end();
			return;
		}

		if (req.method === "POST" && req.url === "/register") {
			handleRegister(req, res);
		} else if (req.method === "POST" && req.url === "/login") {
			handleLogin(req, res);
		} else if (req.method === "POST" && req.url === "/verify-otp") {
			handleVerifyOtp(req, res);
		} else {
			res.statusCode = 404;
			res.setHeader("Content-Type", "text/plain");
			res.end("Not Found");
		}
	} catch (error) {
		res.statusCode = 500;
		res.setHeader("Content-Type", "text/plain");
		res.end("Internal Server Error");
	}
});

server.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
