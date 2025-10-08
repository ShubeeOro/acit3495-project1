from flask import Flask, request, jsonify, render_template, redirect, make_response
from flask_jwt_extended import create_access_token, jwt_required, JWTManager, get_jwt_identity
import pymysql
import os
import time
from dotenv import load_dotenv
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure JWT
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "supersecretkey")

app.config['JWT_TOKEN_LOCATION'] = ['headers', 'cookies']  # Accept JWT from both headers and cookies
app.config['JWT_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
app.config['JWT_COOKIE_CSRF_PROTECT'] = False  # Disable CSRF protection for now (optional)

ENTER_DATA = os.getenv("ENTER_DATA", "localhost:5002")

jwt = JWTManager(app)

# Function to establish MySQL connection with retries
def get_db_connection():
    db = None
    retries = 5
    delay = 5  # seconds between retries
    for attempt in range(retries):
        try:
            db = pymysql.connect(
                host=os.getenv("DB_HOST"),
                user=os.getenv("DB_USER"),
                password=os.getenv("DB_PASSWORD"),
                database=os.getenv("DB_NAME"),
                cursorclass=pymysql.cursors.DictCursor
            )
            print("✅ MySQL connection established")
            break
        except pymysql.MySQLError as e:
            print(f"❌ Attempt {attempt + 1} failed to connect to MySQL: {e}")
            if attempt < retries - 1:
                print(f"⏳ Retrying in {delay} seconds...")
                time.sleep(delay)
            else:
                print("🚨 MySQL connection failed after multiple attempts")
                raise e
    return db


@app.route("/")
def home():
    return jsonify({"message": "Auth Service is running! Available routes: /register, /login, /protected"})


@app.route("/register", methods=["POST", "GET"])
def register():
    if request.method == "GET":
        return render_template("register.html")  # Serve the HTML form

    print("Headers:", request.headers)  # Log request headers
    print("Request data:", request.data)  # Log raw request data
    print("Form data:", request.form)  # Log form data

    # Check if request is from API (JSON) or from an HTML form (Form Data)
    if request.is_json:
        data = request.json
        print("Detected JSON request")
    else:
        data = request.form  # Handles data from an HTML form
        print("Detected Form request")

    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    try:
        db = get_db_connection()
        with db.cursor() as cursor:
            cursor.execute("INSERT INTO users (username, password) VALUES (%s, %s)", (username, password))
            db.commit()

        if request.is_json:
            return jsonify({"message": "User registered successfully"}), 201
        else:
            return redirect("/login")
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/login", methods=["POST", "GET"])
def login():
    if request.method == "GET":
        return render_template("login.html", enter_data=ENTER_DATA)

    data = request.json if request.is_json else request.form
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    try:
        db = get_db_connection()
        with db.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE username = %s AND password = %s", (username, password))
            user = cursor.fetchone()

        if not user:
            return jsonify({"error": "Invalid credentials"}), 401

        print("User:", user)
        print("User ID:", user.get("id"))
        access_token = create_access_token(identity=str(user.get("id")))

        response = jsonify({"token": access_token})  # Return token instead of redirecting
        response.set_cookie("token", access_token, httponly=True, samesite="None", secure=False)

        return response
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/protected", methods=["GET"])
@jwt_required(locations=["cookies", "headers"])
def protected():
    user = get_jwt_identity()
    return jsonify({"message": "Access granted", "user": user})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
