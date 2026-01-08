# BusTrack - School Bus Tracking System

**BusTrack** is a real-time fleet management and tracking solution designed specifically for school transportation. It ensures student safety and operational efficiency by connecting Admins, Drivers, and Parents in a unified ecosystem. The system provides live location updates, route management, and role-specific interfaces to streamline school bus operations.

---

# Project Status & Installation Guide

## Installation & Setup

### Prerequisites
- Node.js (v18+ recommended)
- NPM or Yarn

### 1. Server Setup
The server handles API requests and real-time socket connections.

1.  Navigate to the server directory:
    ```bash
    cd server
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  (Optional) Create a `.env` file in the `server` directory with the following content (defaults are provided in code for development):
    ```env
    PORT=3001
    JWT_SECRET=your_super_secret_key
    ```
4.  Start the development server:
    ```bash
    npm run dev
    ```
    *Server will start on `http://localhost:3001`*

### 2. Client Setup
The client is a Next.js application for Admin, Driver, and Parent interfaces.

1.  Open a new terminal and navigate to the client directory:
    ```bash
    cd client
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
    *Client will start on `http://localhost:3000`*

---

## Implemented Features (Done Till Now)

### Backend (Server)
*   **Tech Stack:** Node.js, Express, Socket.io, In-Memory Store (simulating DB).
*   **Authentication:**
    *   JWT-based authentication (`/auth/login`).
    *   Role-based access control Middleware (`requireRole` for 'admin', 'driver', 'parent').
*   **API Endpoints (`/api`):**
    *   **Fleet Management:** Add/Remove Buses, Assign Drivers to Buses.
    *   **User Management:** Register/Remove Drivers and Students.
    *   **Routes:** Define bus routes with waypoints.
    *   **History:** Log trip history and events.
*   **Real-Time Logic:**
    *   Socket.io integration for bi-directional communication.
    *   Events for `update-location`, `bus-update`, `trip-start`, `trip-end`.

### Frontend (Client)
*   **Tech Stack:** Next.js (App Router), TailwindCSS, React-Leaflet.
*   **Shared Components:**
    *   `Map.tsx`: Reusable Leaflet map component with custom markers and auto-centering logic.
*   **Admin Dashboard (`/admin`):**
    *   **Live Map:** Visualizes all active buses moving in real-time.
    *   **Management:** Interfaces for adding buses and viewing fleet status.
*   **Driver App (`/driver`):**
    *   **Interactive Controls:** buttons to "Start Trip" and "Stop Trip".
    *   **Simulation:** "Cruise Mode" to simulate movement along a route for testing.
    *   **Live Tracking:** Transmits current location to server.
*   **Parent/Student View:**
    *   **My Bus:** Dedicated view to track the specific bus assigned to a student/parent.

### Current Status
*   Application is functional with simulated data (stored in-memory on server).
*   Real-time updates are working for location tracking.
*   Basic authentication flow is complete for all roles.
