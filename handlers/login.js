const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

export async function handleLogin(req, res) {
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
