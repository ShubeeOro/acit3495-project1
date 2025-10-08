const axios = require("axios");

async function authenticateToken(req, res, next) {
    let token = req.cookies.token || req.cookies.access_token_cookie || req.query.token;
    const AUTH_SERVICE_URL = "http://127.0.0.1:5001";
    console.log(AUTH_SERVICE_URL);

    console.log("Authenticating user... Token received:", token);

    if (!token) {
        console.log("No token found. Redirecting to login...");
        return res.redirect(`${AUTH_SERVICE_URL}/login`);
    }

    try {
        const response = await axios.get(`${AUTH_SERVICE_URL}/protected`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.status === 200) {
            const user_id = response.data.user; // Extract user identity
            console.log("Response Data:", response.data);
            console.log("Token verified! Storing user in cookies. User ID:", user_id);

            // ✅ Save user ID inside cookies
            res.cookie("user", { id: Number(user_id), token: token }, { maxAge: 900000, httpOnly: true });

            return res.redirect("/");
        }
    } catch (error) {
        console.log("Authentication failed:", error.message);
        return res.status(403).json({ error: "Forbidden" });
    }
}

module.exports = authenticateToken;