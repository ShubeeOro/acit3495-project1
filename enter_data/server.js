const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const authenticateToken = require("./middleware");
const path = require("path");
const cookieParser = require("cookie-parser");

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Function to establish MySQL connection with retries
const connectToDatabase = () => {
  let connectionAttempts = 20;
  const delay = 30000; // 30 seconds delay between attempts

  const connect = () => {
    const db = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
    });

    db.connect((err) => {
      if (err) {
        if (connectionAttempts > 0) {
          console.error("Database connection failed: " + err.stack);
          console.log(`Retrying in ${delay / 1000} seconds...`);
          connectionAttempts--;
          setTimeout(connect, delay); // Retry after delay
        } else {
          console.error("Failed to connect to MySQL after several attempts.");
          process.exit(1); // Exit process if unable to connect after retries
        }
      } else {
        console.log("Connected to MySQL2");
      }
    });

    return db;
  };

  return connect();
};

const db = connectToDatabase(); // Connect to MySQL with retry logic

app.get("/", async (req, res) => {
  if (!req.cookies.user) {
    // Check if the user is authenticated with JWT
    await authenticateToken(req, res);
  } else {
    console.log(req.cookies.user);
    res.render("index", { user: req.cookies.user });
  }
});

// Endpoint to submit temperature data
app.post("/submit-temperature", (req, res) => {
  if (!req.cookies.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  console.log(req.body);
  const temperature = req.body.temperature;

  if (!temperature) {
    return res.status(400).json({ error: "Missing temperature" });
  }

  db.query(
    "INSERT INTO temperatures (user_id, temperature, timestamp) VALUES (?, ?, NOW())",
    [req.cookies.user.id, temperature],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: "Database query failed" });
      }
      res.redirect("/");
    }
  );
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Enter Data Service running on port ${PORT}`);
});
