const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();

app.use(bodyParser.json());
app.use(cors());

mongoose.connect("mongodb://localhost:27017/userdata", { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
	console.log("Connected to MongoDB");
});

const User = require("./models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

//register route
app.post("/register", async (req, res) => {
	const { username, email, password } = req.body;
	const hashedPassword = await bcrypt.hash(password, 10);

	const newUser = new User({ username, email, password: hashedPassword });
	try {
		await newUser.save();
		res.status(201).send("User registered");
	} catch (err) {
		res.status(400).send("Error registering user");
	}
});

//login route
app.post("/login", async (req, res) => {
	const { email, password } = req.body;
	const user = await User.findOne({ email });

	if (!user) {
		return res.status(400).send("User not found");
	}

	const isMatch = await bcrypt.compare(password, user.password);
	if (!isMatch) {
		return res.status(400).send("Invalid password");
	}

	const token = jwt.sign({ id: user._id }, "your_jwt_secret", { expiresIn: "1h" });
	res.status(200).json({ token });
});

app.listen(7000, () => {
	console.log("Server is running on port 5000");
});
