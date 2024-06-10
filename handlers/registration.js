const User = require("./models/User");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const otpGenerator = require("otp-generator");
const { v4: uuidv4 } = require("uuid");
const { saveOtpData, handleVerifyOtp } = require("./otpHandler");

export async function handleRegister(req, res) {
	let body = "";
	req.on("data", (chunk) => {
		body += chunk.toString();
	});
	req.on("end", async () => {
		const { username, email, password, language, country } = JSON.parse(body);
		const hashedPassword = await bcrypt.hash(password, 10);

		try {
			const existingUser = await User.findOne({ email });
			if (existingUser) {
				res.statusCode = 400;
				res.setHeader("Content-Type", "text/plain");
				res.end("Email already registered");
			} else {
				const otp = otpGenerator.generate(6, { upperCase: false, specialChars: false, digits: true });
				const otpId = uuidv4();

				saveOtpData(otpId, { username, email, language, country, hashedPassword, otp });

				const transporter = nodemailer.createTransport({
					service: "yahoo",
					auth: {
						user: process.env.YAHOO_USER,
						pass: process.env.YAHOO_PASS,
					},
				});

				const mailOptions = {
					from: process.env.YAHOO_USER,
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
                                  <p>Best regards,<br>Your Company Name</p>
                                </div>
                              </body>
                            </html>
                        `,
				};

				transporter.sendMail(mailOptions, (error, info) => {
					if (error) {
						console.log(error);
						res.statusCode = 500;
						res.setHeader("Content-Type", "text/plain");
						res.end("Error sending OTP");
					} else {
						console.log("Email sent: " + info.response);
						res.statusCode = 200;
						res.setHeader("Content-Type", "application/json");
						res.end(
							JSON.stringify({
								text: "OTP sent to ${email}. Please enter the OTP to complete registration. Your OTP ID is",
								otpID: otpId,
							})
						);
					}
				});
			}
		} catch (err) {
			res.statusCode = 500;
			res.setHeader("Content-Type", "text/plain");
			res.end("Error registering user");
		}
	});
}

export { handleVerifyOtp };
