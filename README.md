# 🚌 BusTrack - Advanced School Bus Tracking System

**BusTrack** is a production-grade, real-time fleet management solution designed for schools. It orchestrates a seamless flow of data between **Drivers (App)**, **Admins (Dashboard)**, and **Parents (Tracking)**, ensuring student safety through live location updates and instant breakdown reporting.

---

## 🏗️ Technical Architecture

BusTrack operates on a **Client-Server-Database** architecture powered by a persistent **Real-Time Event Bus**.

```mermaid
graph TD
    subgraph Client_Side
        Driver[📱 Driver App]
        Admin[💻 Admin Dashboard]
        Parent[👪 Parent Portal]
    end

    subgraph Server_Side
        LB[Express API Gateway]
        Socket[🔌 Socket.io Server]
        Auth[🔐 JWT Auth Middleware]
    end

    subgraph Data_Layer
        Postgres[(🐘 PostgreSQL DB)]
    end

    Driver -->|Emits: Location/Status| Socket
    Socket -->|Broadcasts: Bus Updates| Admin
    Socket -->|Broadcasts: Bus Updates| Parent
    Socket -->|Persists Data| Postgres
    
    Admin -->|REST API| LB
    Driver -->|REST API| LB
    LB -->|Query| Postgres
```

---

## 🛠️ Technology Stack

### **Frontend (Client)**
Built with performance and component reusability in mind.
| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Core Framework** | **Next.js** | `16.1` | App Router, Server Components, SSR/CSR |
| **Language** | **TypeScript** | `5.x` | Type Safety & Developer Experience |
| **UI Library** | **React** | `19.2` | Component Architecture |
| **Styling** | **TailwindCSS** | `4.0` | Utility-first responsive design |
| **Maps** | **React-Leaflet** | `5.0` | Interactive maps & markers |
| **Real-Time** | **Socket.io-client**| `4.8` | Websocket connection management |

### **Backend (Server)**
A robust Node.js runtime focusing on event-driven architecture.
| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Runtime** | **Node.js** | `20+` | JavaScript Runtime |
| **Server** | **Express.js** | `5.2` | REST API Routing |
| **Real-Time** | **Socket.io** | `4.8` | Bi-directional Event Bus |
| **Database** | **PostgreSQL** | `16.x` | Relational Data Persistence (via Supabase) |
| **DB Client** | **pg** | `8.16` | Native Postgres Driver |
| **Auth** | **JWT** | `9.0` | Stateless Authentication Tokens |
| **Security** | **Bcrypt.js** | `3.0` | Password Hashing |

---

## ⚡ Key Technical Implementations

### 1. The Real-Time Location Engine
We bypassed traditional HTTP polling in favor of a **Websocket-first approach**.
*   **Driver Emission:** The driver app continually calculates GPS coordinates and speed.
*   **Server Processing:** 
    *   Validates the incoming socket payload.
    *   **Persists** the location snapshot to PostgreSQL (`live_locations` table).
    *   **Broadcasts** the update immediately to `admin` and `parent` rooms.
*   **Optimistic UI:** The specific bus marker on the map updates instantly via React state, maintaining 60fps animations without page reloads.

### 2. Physics-Based Route Simulation ("Cruise Mode")
To facilitate testing without physical driving, the Driver App includes a custom simulation engine:
*   **Algorithm:** Uses the **Haversine Formula** to calculate precise distances between waypoints.
*   **Interpolation:** Linear interpolation (LERP) generates intermediate coordinates between route nodes to simulate smooth movement at variable speeds (e.g., 40km/h).
*   **State Machine:** Handles `Start`, `Stop`, and `Pause` states relative to the route geometry.

### 3. Repository/Store Pattern (Backend)
The codebase strictly separates "Business Logic" from "Data Access".
*   **`store.js`**: A centralized repository file containing all SQL queries. Any change in the database technology (e.g., to MongoDB) would only require changes in this one file, leaving `index.js` (API routes) untouched.

### 4. Breakdown Handling System
A critical safety feature implemented with high priority events:
*   **Schema:** `buses` table has a `current_status` ENUM ('MOVING', 'STOPPED', 'BREAKDOWN').
*   **Event Flow:** Driver toggles status -> Socket Event `status-change` -> Server Updates DB -> Broadcasts Alert.
*   **Visuals:** Maps automatically swap the green Bus Icon for a specialized **Alert Icon**, and parents receive immediate Toast Notifications.

---

## 🗄️ Database Schema (PostgreSQL)

The relational schema is designed for data integrity and quick lookups.

*   **`users`**: Stores credentials and role (`admin` | `driver` | `parent`).
*   **`buses`**: Core fleet entity, linked to `driver_id` and `route_name`.
*   **`live_locations`**: fast-access table keyed by `bus_id` for the latest GPS ping.
*   **`students`**: Linked to `parent_id` and assigned `bus_id`.
*   **`attendance`**: Daily log of student boarding status.

---

## 🚀 Installation & Setup

### Prerequisites
*   Node.js (v18+)
*   NPM or Yarn
*   PostgreSQL Database (Local or Cloud like Supabase)

### 1. Server Setup
1.  Navigate to `server`:
    ```bash
    cd server
    npm install
    ```
2.  Configure `.env`:
    ```env
    DATABASE_URL=postgresql://user:pass@host:5432/db
    JWT_SECRET=your_secret_key
    ```
3.  Start backend:
    ```bash
    npm run dev
    # Server runs on http://localhost:3001
    ```

### 2. Client Setup
1.  Navigate to `client`:
    ```bash
    cd client
    npm install
    ```
2.  Start frontend:
    ```bash
    npm run dev
    # App runs on http://localhost:3000
    ```

---

## 📂 Project Structure

```bash
bustrack/
├── client/                 # Next.js Frontend
│   ├── app/                # App Router Pages
│   │   ├── admin/          # Admin Dashboard
│   │   ├── driver/         # Driver Mobile App
│   │   └── parent/         # Parent Portal
│   ├── components/         # Shared Components (Map.tsx)
│   └── public/             # Static Assets (Icons)
│
├── server/                 # Express Backend
│   ├── index.js            # API Routes & Socket Setup
│   ├── store.js            # Database Queries (Repository)
│   ├── db.js               # Postgres Connection Pool
│   └── scripts/            # Database Seeding & Utilities
│
└── README.md               # Documentation
```
