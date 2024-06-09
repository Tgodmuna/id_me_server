require("dotenv").config();
const http = require("http");
const mongoose = require("mongoose");
const { parse } = require("querystring");

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

const server = http.createServer((req, res) => {
	// Enable CORS
	res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
	res.setHeader("Access-Control-Allow-Credentials", "true");

	if (req.method === "OPTIONS") {
		// Preflight request
		res.writeHead(204, {
			"Access-Control-Allow-Origin": "http://localhost:3000",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
			"Access-Control-Allow-Credentials": "true",
		});
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
});

server.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});

// Dummy handlers for illustration
function handleRegister(req, res) {
	let body = "";
	req.on("data", (chunk) => {
		body += chunk;
	});
	req.on("end", () => {
		// Process the registration logic here
		res.statusCode = 200;
		res.setHeader("Content-Type", "application/json");
		res.end(JSON.stringify({ message: "User registered successfully!" }));
	});
}

function handleLogin(req, res) {
	let body = "";
	req.on("data", (chunk) => {
		body += chunk;
	});
	req.on("end", () => {
		// Process the login logic here
		res.statusCode = 200;
		res.setHeader("Content-Type", "application/json");
		res.end(JSON.stringify({ message: "Login successful!" }));
	});
}

function handleVerifyOtp(req, res) {
	let body = "";
	req.on("data", (chunk) => {
		body += chunk;
	});
	req.on("end", () => {
		// Process the OTP verification logic here
		res.statusCode = 200;
		res.setHeader("Content-Type", "application/json");
		res.end(JSON.stringify({ message: "OTP verified successfully!" }));
	});
}
