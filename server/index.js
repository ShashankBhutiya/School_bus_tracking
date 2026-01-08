const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "*", // In production, restrict this to the client URL
    methods: ["GET", "POST"]
  }
});

// Store io instance in app for use in routes
app.set('socketio', io);

// Simple in-memory store (move to store.js later or keep here for simplicity if small)
global.buses = {}; // busId -> { lat, lng, status, driverId }
global.users = []; // mock users

// Import routes
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const socketHandler = require('./socket');

app.use('/auth', authRoutes);
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.send('BusTrack Server is Running 🚀');
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  socketHandler(io, socket);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
