const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Pool } = require('pg');
const cors = require('cors');

// Initialize Express
const app = express();
app.use(cors());

// Create HTTP server and initialize Socket.io
const server = http.createServer(app);
const io = socketIo(server);

// PostgreSQL connection pool
const pool = new Pool({
  user: 'root', // Replace with your PostgreSQL username
  host: 'oregon-postgres.render.com', // PostgreSQL host on Render
  database: 'test_yvhj', // Replace with your PostgreSQL database name
  password: 'pB8U8bTRKMDUaBs600vj774gcSHvTFoE', // Replace with your PostgreSQL password
  port: 5432, // PostgreSQL port
  ssl: {
    rejectUnauthorized: false, // This allows SSL without verifying the certificate
  }
});


// Store socket connections
const userSockets = {}; // Map to store user email and socket ID

// Handle WebSocket connections
io.on('connection', (socket) => {
  console.log('New user connected');

  // Register the user with their email
  socket.on('register', (email) => {
    userSockets[email] = socket.id; // Map email to socket ID
    console.log(`User registered: ${email}`);
  });

  // Listen for incoming messages
  socket.on('chat message', async (data) => {
    let messageData;

    // Parse message data
    try {
      messageData = JSON.parse(data);
    } catch (err) {
      console.error('Error parsing message data:', err);
      return; // Exit if parsing fails
    }

    const { mymessage, doctoremail, email } = messageData;

    // Log the received message data to verify
    console.log('Received message data:', messageData);

    // Save message to PostgreSQL
    const query = 'INSERT INTO chats (doctoremail, email, mymessage) VALUES ($1, $2, $3)';
    try {
      await pool.query(query, [doctoremail, email, mymessage]);
      console.log('Message saved to database successfully.');

      // Emit the message to the intended recipient
      if (userSockets[doctoremail]) {
        socket.to(userSockets[doctoremail]).emit('chat message', data); // Send to doctor
      }
      if (userSockets[email]) {
        socket.to(userSockets[email]).emit('chat message', data); // Send back to patient (optional)
      }
    } catch (err) {
      console.error('Error inserting message into database:', err);
    }
  });

  socket.on('disconnect', () => {
    // Remove user from the map when they disconnect
    for (const [email, socketId] of Object.entries(userSockets)) {
      if (socketId === socket.id) {
        delete userSockets[email];
        console.log(`User disconnected: ${email}`);
        break;
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
