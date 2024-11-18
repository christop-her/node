// const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pooll = require('./db');
// require('.env').config();


const { OAuth2Client } = require('google-auth-library');
// const jwt = require('jsonwebtoken');
// const pooll = require('./db');
// require('dotenv').config();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google Sign-In Endpoint
const googleSignIn = async (req, res) => {
  const { accessToken } = req.body;

  try {
    // Verify the Google ID Token
    const ticket = await client.verifyIdToken({
      accessToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    // Extract user information
    const { email, name, picture } = payload;

    // Check if user already exists in the "patient" table
    const userExist = await pooll.query('SELECT * FROM patient WHERE email = $1', [email]);

    let user;
    if (userExist.rows.length === 0) {
      // Register a new user if not found
      const insertResult = await pooll.query(
        'INSERT INTO patient (email, userpassword, username, image_01, userrole) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [email, null, name, picture, 'patient']
      );
      user = insertResult.rows[0];
    } else {
      user = userExist.rows[0];
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ token, user });
  } catch (err) {
    console.error('Error during Google Sign-In:', err);
    res.status(500).json({ message: 'Authentication failed' });
  }
};




const register = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Check if user exists
    const userExist = await pooll.query('SELECT * FROM patient WHERE email = $1', [email]);
    if (userExist.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    // const hashedPassword = await bcrypt.hash(password, 10);

    await pooll.query('INSERT INTO patient (email, userpassword) VALUES ($1, $2)', [email, hashedPassword]);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const patient_login = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Find user by email
    const user = await pooll.query('SELECT * FROM patient WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check password (no hashing)
    const storedPassword = user.rows[0].userpassword; // Assume this is plain text

    // Compare the plain text password
    if (password !== storedPassword) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.rows[0].id, email: user.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const practitioner_login = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Find user by email
    const user = await pooll.query(
      'SELECT * FROM practitioner WHERE email = $1 AND userrole = $2',
      [email, 'practitioner']
    );
    if (user.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check password (no hashing)
    const storedPassword = user.rows[0].userpassword; // Assume this is plain text

    // Compare the plain text password
    if (password !== storedPassword) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.rows[0].id, email: user.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// Export the Google Sign-In function
module.exports = { googleSignIn, register, patient_login, practitioner_login };

// module.exports = { register, patient_login, practitioner_login };
