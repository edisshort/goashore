# 🌊 GoaShore — Beach Cleanup Impact Platform

> Clean Goa. Prove the impact.

GoaShore is a full-stack web platform that helps communities organize beach cleanups, track volunteer participation, and measure real environmental impact over time.

---

## 🚀 Live Demo

Frontend: https://goashore.vercel.app
Backend: https://your-backend.onrender.com

---

## 🎯 Problem Statement

Goa's beaches face increasing pollution due to tourism, fishing waste, and single-use plastics.
However, there is no centralized system to:

* Organize cleanup drives
* Track volunteer participation
* Measure cleanup impact
* Identify neglected beaches

---

## 💡 Solution

GoaShore provides a structured platform to:

* Organize cleanup events
* Track real volunteer participation
* Monitor beach health dynamically
* Show before vs after impact
* Generate insights for better decision-making

---

## 🔥 Key Features

### 🏖️ Beach-wise Cleanup History

* Filter events by beach
* View completed and upcoming cleanups
* Track long-term progress per location

---

### 📸 Before vs After Comparison

* Upload images before and after cleanup
* Visual proof of environmental impact

---

### 👥 Real Volunteer Tracking

* Users can join/leave events
* Tracks actual participants (not just numbers)

---

### 🧠 AI Cleanliness Detection

* Classifies beach condition based on waste collected
* Example: "Was Dirty" or "Lightly Used"

---

### 🏆 Leaderboard System

* Ranks top contributors
* Encourages community participation

---

### 📊 Insight Carousel

* Highlights:

  * Beaches needing attention
  * Most improved locations
  * Cleanup gaps

---

### 🗺️ Interactive Map

* Visualizes beaches and their status
* Helps users identify problem areas

---

## 🛠️ Tech Stack

### Frontend

* React.js
* CSS3
* Axios
* Leaflet (Maps)

---

### Backend

* Node.js
* Express.js

---

### Database

* MongoDB Atlas
* Mongoose

---

### Authentication

* JSON Web Tokens (JWT)
* bcrypt

---

### Image Storage

* Cloudinary

---

### Deployment

* Frontend: Vercel
* Backend: Render

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the repository

```bash
git clone https://github.com/your-username/goashore.git
cd goashore
```

---

### 2️⃣ Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:

```env
MONGODB_URI=your_mongo_uri
JWT_SECRET=your_secret
CLOUD_NAME=your_cloudinary_name
API_KEY=your_api_key
API_SECRET=your_api_secret
PORT=5000
```

Run backend:

```bash
npm start
```

---

### 3️⃣ Frontend Setup

```bash
cd frontend
npm install
```

Create `.env`:

```env
REACT_APP_API_URL=http://localhost:5000
```

Run frontend:

```bash
npm start
```

---

## 🧠 Challenges & Solutions

* Image persistence fixed using Cloudinary instead of local storage
* Volunteer tracking redesigned using participants array
* Ownership logic added without breaking legacy data
* Stats system converted to real-time aggregation

---

## 📈 Future Improvements

* Real AI image-based cleanliness detection
* QR-based volunteer check-in
* Push notifications for cleanup events
* Mobile app version

---

## 🤝 Contributing

Contributions are welcome!
Feel free to fork and improve the project.

---

## 📜 License

This project is licensed under the MIT License.

---

## 💬 Final Note

GoaShore is not just an event platform —
it’s a system to **measure and prove environmental impact over time**.
