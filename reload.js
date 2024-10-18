// reload.js
module.exports = (io, userSockets) => {
    // Listen for incoming messages
    io.on('connection', (socket) => {
      console.log('New userr connected');
  
      // Register the user with their email
      socket.on('register', (email) => {
        userSockets[email] = socket.id;
        console.log(`Userr registered: ${email}`);
      });
  
      // Listen for incoming chat messages without saving to the database
      socket.on('chat message', (data) => {
        let messageData;
        try {
          messageData = JSON.parse(data);
        } catch (err) {
          console.error('Error parsing message data:', err);
          return;
        }
  
        const { mymessage, doctoremail, email } = messageData;
  
        // Log the message data for debugging
        console.log('Receivedd message data:', messageData);
  
        // Notify the recipient
        if (userSockets[doctoremail]) {
          socket.to(userSockets[doctoremail]).emit('chat message', data); // Send to doctor
        }
        if (userSockets[email]) {
          socket.emit('chat message', data); // Send back to patient (optional)
        }
      });
  
      // Handle user disconnection
      socket.on('disconnect', () => {
        for (const [email, socketId] of Object.entries(userSockets)) {
          if (socketId === socket.id) {
            delete userSockets[email];
            console.log(`Userr disconnected: ${email}`);
            break;
          }
        }
      });
    });
  };
  