const User = require("./models/User");
const bcrypt = require("bcryptjs");

export async function handleRegister(req, res) {
	let body = "";
	req.on("data", (chunk) => {
		body += chunk.toString();
	});
	req.on("end", async () => {
		const { username, email, password } = JSON.parse(body);
		const hashedPassword = await bcrypt.hash(password, 10);

		const newUser = new User({ username, email, password: hashedPassword });
		try {
			await newUser.save();
			res.statusCode = 201;
			res.setHeader("Content-Type", "text/plain");
			res.end("User registered");
		} catch (err) {
			res.statusCode = 400;
			res.setHeader("Content-Type", "text/plain");
			res.end("Error registering user");
		}
	});
}
