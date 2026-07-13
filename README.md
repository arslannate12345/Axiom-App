# Axiom

**A powerful, mobile-first API client and testing suite built with React Native (Expo) and Supabase.**

Axiom is designed to bring the power of desktop API tools (like Postman or Insomnia) directly to your mobile device. Whether you are debugging endpoints on the go, managing complex request collections, or stress-testing your backend architecture, Axiom provides a sleek, dark-mode native interface to get the job done.

## ✨ Features

- **🚀 Mobile API Client:** Full support for GET, POST, PUT, PATCH, and DELETE requests with dynamic Header, Query Parameter, and Body (JSON/Raw) editors.
- **📂 Collections & Workspaces:** Organize your saved requests into dedicated workspaces and nested collections for easy retrieval.
- **🌍 Dynamic Environments:** Define global variables (e.g., `{{baseUrl}}` or `{{token}}`) that seamlessly interpolate into your URLs, Headers, and Request Bodies on the fly.
- **⏱️ Load Benchmarking:** Stress-test your APIs natively. Run dozens of concurrent batch requests and instantly visualize Average, P95, and P99 latency metrics on a beautiful line chart.
- **📜 Request History:** Automatically logs every executed request (including status codes, latency, and timestamps) so you never lose track of your testing trails.
- **🔒 Secure Authentication:** Powered by Supabase Auth for secure user sessions and isolated database rows.

## 🛠 Tech Stack
- **Frontend:** React Native (Expo), TypeScript, Zustand (State Management)
- **Backend/Database:** Supabase (PostgreSQL, Auth)
- **Navigation:** Expo Router
- **UI/Styling:** Native StyleSheet, Ionicons

## 🚀 Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file based on `.env.example` and add your Supabase keys.
4. Run the app: `npx expo start`
