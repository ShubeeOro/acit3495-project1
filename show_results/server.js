require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const path = require("path");
const cookieParser = require("cookie-parser");

const app = express();

app.use(cookieParser());  // Add this middleware
app.use(express.static(path.join(__dirname, "views")));

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo_db:27017/data_analytics';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://afd29919d80da4b4c9d92a6219b3f75d-230902164.us-west-2.elb.amazonaws.com:5001/protected';

// Function to establish MongoDB connection with retries
const connectToDatabase = () => {
    let connectionAttempts = 5;
    const delay = 5000; // 5 seconds delay between attempts

    const connect = () => {
        mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
            .then(() => {
                console.log("Connected to MongoDB");
            })
            .catch((err) => {
                if (connectionAttempts > 0) {
                    console.error("MongoDB connection failed:", err.message);
                    console.log(`Retrying in ${delay / 1000} seconds...`);
                    connectionAttempts--;
                    setTimeout(connect, delay); // Retry after delay
                } else {
                    console.error("Failed to connect to MongoDB after several attempts.");
                    process.exit(1); // Exit process if unable to connect after retries
                }
            });
    };

    connect();
};

connectToDatabase(); // Connect to MongoDB with retry logic

// MongoDB Schema and Model
const AnalyticsSchema = new mongoose.Schema({
    max: Number,
    min: Number,
    avg: Number,
    timestamp: String
});
const Analytics = mongoose.model('Analytics', AnalyticsSchema);

// Function to verify JWT token
async function verifyToken(req) {
    let token = req.cookies.token || req.cookies.access_token_cookie;  // Read from both cookies
    if (!token && req.headers.authorization) {
        token = req.headers.authorization.split(' ')[1];  // Fallback to Authorization header
    }

    console.log("Token received:", token); // LOGGING

    if (!token) {
        console.log("No token received.");
        return null;
    }

    try {
        const response = await axios.get(AUTH_SERVICE_URL, { headers: { Authorization: `Bearer ${token}` } });
        console.log("Token verification success:", response.data);
        return response.data;
    } catch (error) {
        console.log("Token verification failed:", error.message);
        return null;
    }
}

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "index.html"));
});

app.get('/results', async (req, res) => {
    //const verified = await verifyToken(req);
    //if (!verified) {
    //    return res.status(401).json({ error: 'Invalid token' });
    //}
    // Fetch the latest analytics data from the database
    const url = process.env.ANALYTICS_SERVICE_URL || 'http://analytics_service:5003/compute_analytics';

    // Send a GET request to the analytics service
    try {
        const response = await axios.get(url);
        console.log(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }

    try {
        // Console.log all of the data in the database
        const analyticsData = await Analytics.find();
        console.log(analyticsData);
        const latestAnalytics = await Analytics.findOne().sort({ timestamp: -1 });
        if (!latestAnalytics) {
            return res.status(404).json({ error: "No analytics data available" });
        }

        res.json({
            max: latestAnalytics.max,
            min: latestAnalytics.min,
            avg: latestAnalytics.avg,
            timestamp: latestAnalytics.timestamp
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 5004;
app.listen(PORT, "0.0.0.0", () => console.log(`Show Results Service running on port ${PORT}`));
