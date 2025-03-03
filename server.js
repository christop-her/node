const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const { googleSignIn, register, patient_login, practitioner_login, forgot_password, verify_reset_code, reset_password, submit_datetime, select_datetime, send_email_code, verify_code } = require('./authController');
// require('.env').config();

// Initialize Express
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Create HTTP server and initialize Socket.io
const server = http.createServer(app);
const io = socketIo(server);

// PostgreSQL connection pool
const pool = new Pool({
  user: 'root', // Replace with your PostgreSQL username
  host: 'oregon-postgres.render.com', // PostgreSQL host on Render
  database: 'expire_db', // Replace with your PostgreSQL database name
  password: 'NIY1E9RRsthFXggmw5qvsYA266GIyIed', // Replace with your PostgreSQL password
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

  socket.on('reload_register', (email) => {
    userSockets[email] = socket.id;
    console.log(`Userr registered: ${email}`);
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
        socket.emit('chat message', data); // Send back to patient (optional)
      }
    } catch (err) {
      console.error('Error inserting message into database:', err);
    }
  });



  socket.on('reload message', async (data) => {
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
    console.log('Receivedd message data:', messageData);

      // Emit the message to the intended recipient
      if (userSockets[doctoremail]) {
        socket.to(userSockets[doctoremail]).emit('reload message', data); // Send to doctor
      }
      
      if (userSockets[email]) {
        socket.emit('reload message', data); // Send back to patient (optional)
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




app.post('/googleSignIn', googleSignIn);
app.post('/register', register);
app.post('/patient_login', patient_login);
app.post('/practitioner_login', practitioner_login);
app.post('/forgot_password', forgot_password);
app.post('/verify_reset_code', verify_reset_code);
app.post('/reset_password', reset_password);
app.post('/submit_datetime', submit_datetime);
app.post('/select_datetime', select_datetime);
app.post('/send_email_code', send_email_code);
app.post('/verify_code', verify_code);



// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
