<div align="center">
  <h1>🛡️ SafeHer</h1>
  <p><b>Empowering Women with Comprehensive Safety, Health, and Community Tools</b></p>
  
  <p>
    <img src="https://img.shields.io/badge/React_Native-0.79.2-20232a.svg?style=flat&logo=react" alt="React Native" />
    <img src="https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933.svg?style=flat&logo=nodedotjs" alt="Node.js" />
    <img src="https://img.shields.io/badge/Firebase-Integrated-FFCA28.svg?style=flat&logo=firebase" alt="Firebase" />
    <img src="https://img.shields.io/badge/Socket.io-4.8.1-010101.svg?style=flat&logo=socketdotio" alt="Socket.io" />
    <img src="https://img.shields.io/badge/License-ISC-blue.svg?style=flat" alt="License" />
  </p>
</div>

---

## 🚀 Project Overview

**SafeHer** is a comprehensive, cross-platform mobile application designed to prioritize women's safety and well-being. It seamlessly integrates real-time emergency safety tools with essential health tracking and community support features. SafeHer features a React Native frontend for cross-platform mobile access, a robust Node.js/Express backend for real-time communications, Firebase for scalable cloud functions, and custom Machine Learning (ML) models for advanced geofencing and safety routing.

## ✨ Key Features

### 🚨 Emergency & Safety Tools
- **Emergency SOS & Alerts:** Quick-trigger emergency alerts that send push notifications and SMS via Twilio to trusted contacts.
- **Live Location Tracking:** Real-time location sharing with emergency contacts using WebSockets and React Native Maps.
- **Geofencing & Safety Routing:** ML-powered safe routes and geofencing to alert users when entering unsafe zones.
- **Fake Call Feature:** Discreetly trigger a simulated phone call to escape uncomfortable situations.
- **Bluetooth Device Integration:** Quick activation of emergency features via connected Bluetooth peripherals.

### 💖 Health & Wellness
- **Cycle Tracker:** Comprehensive menstrual cycle logging with predictive insights.
- **Gynecologist Consultations:** Book appointments and conduct seamless video consultations via integrated WebRTC.
- **Stress & Mental Health:** Take interactive quizzes and access wellness resources.

### 🌐 Community & Support
- **Community Forums:** Engage in safe, moderated discussions with other women.
- **Admin Dashboard:** Moderation tools and feature toggles to manage the platform effectively.

---

## 🛠️ Technology Stack

### Mobile Frontend 📱
- **Framework:** React Native (v0.79.2)
- **Navigation:** React Navigation (Stack & Native-Stack)
- **Real-Time Video/Audio:** WebRTC (`react-native-webrtc`), Incall Manager
- **Maps & Location:** React Native Maps, Geolocation
- **BaaS (Backend as a Service):** Firebase App, Auth, Firestore, Messaging, Storage
- **Native Integrations:** Biometrics, Contacts, FS, Vision Camera, Bluetooth Classic, SMS

### Backend API 🔌
- **Environment:** Node.js, Express.js
- **Real-Time Communication:** Socket.io
- **Security & Optimization:** Helmet, Compression, Morgan, CORS
- **External Integrations:** Twilio (SMS), Cloudinary (Media upload), Firebase Admin
- **Task Scheduling:** node-cron

### Cloud & AI ☁️🤖
- **Functions:** Firebase Cloud Functions for serverless execution.
- **ML Models:** Python-based ML utilities and geofencing safety routing algorithms.

---

## 📁 Repository Structure

```graphql
SafeHer/
├── frontend/       # React Native mobile application
├── backend/        # Node.js/Express API server and WebSockets
├── functions/      # Firebase Cloud Functions codebase
├── model/          # Machine learning scripts and model deployment helpers
├── geofencing/     # Mapping utilities and safety route evaluation
└── README.md       # Project documentation
```

---

## ⚙️ Installation & Setup

### Prerequisites
- **Node.js:** v18.0.0 or higher
- **Mobile Development:** Java (Android SDK), Xcode (for iOS on macOS)
- **Package Manager:** `npm` or `yarn`
- **Firebase Project:** Configured with Firestore, Auth, and Messaging enabled.

### 1. Backend Setup

```bash
cd backend
npm install
```
* **Configuration:** Create a `.env` file in the `backend/` directory with your Firebase Admin credentials, Cloudinary, Twilio, and other required API keys.
* **Start Server:**
```bash
npm run dev   # For development (nodemon)
npm start     # For production
```

### 2. Frontend Setup (React Native)

```bash
cd frontend
npm install
```
* **Configuration:** Ensure your `firebase.json` and `.env` files are properly configured with your Firebase project credentials.
* **Run on Android:**
```bash
npx react-native run-android
```
* **Run on iOS:**
```bash
cd ios && pod install && cd ..
npx react-native run-ios
```

### 3. Firebase Functions

```bash
cd functions
npm install
firebase deploy --only functions
```

### 4. Model & Geofencing Deployment
Navigate to the `model/` directory and review the specific `README.md` to set up and deploy the Python ML server.

---

## 🧪 Testing & Deployment

- **Unit Tests:** Run the configured test suites inside the frontend directory:
  ```bash
  cd frontend
  npm test
  ```
- **Android APK Build:** Scripts are provided in the `frontend/` directory (`build-apk.bat`, `build-apk.sh`) to generate debug and release APKs efficiently.

---

## 🤝 Contributing

We welcome contributions to make SafeHer even more secure and feature-rich!
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request and discuss major changes via an Issue first.

---

## 📄 License & Credits

This project is licensed under the **ISC License**.  
It utilizes multiple open-source technologies. Please refer to individual `package.json` files for dependency-specific licensing.

### 👥 The Team:
- **Sunny Radadiya** (Team Leader)
- **Aayush Tilva**
- **Jenil Sutariya**

---
<div align="center">
  <b>Built with ❤️ for a safer tomorrow.</b>
</div>
