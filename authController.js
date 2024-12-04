// const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require("crypto");
const nodemailer = require("nodemailer");
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




const forgot_password = async (req, res) => {
  try {

    const { email, person } = req.body;


if (person === 'patient'){
try {
  const result = await pooll.query('SELECT * FROM patient WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(404).send("User not found.");

    const user = result.rows[0];

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: "wilfredc685@gmail.com",
        pass: "qdft qyhi wzbr qbig", // Replace with App Password
      },
    });
    

    // Generate a unique 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000); // 6-digit code

    // Save the reset code and its expiry in the mock database
    // user.resetCode = crypto.createHash("sha256").update(String(resetCode)).digest("hex");
    // user.resetCodeExpiry = Date.now() + 15 * 60 * 1000; // Code expires in 15 minutes
    const hashedResetCode = crypto.createHash("sha256").update(String(resetCode)).digest("hex");
    const resetCodeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

     // Update the database with reset code and expiry
     await pooll.query(
      "UPDATE patient SET reset_code = $1, reset_code_expiry = $2 WHERE email = $3",
      [hashedResetCode, resetCodeExpiry, email]
    );

    // Send the code via email
    await transporter.sendMail({
      to: email,
      subject: "Password Reset Request",
      text: `Your password reset code is: ${resetCode}\nThis code is valid for 15 minutes.`,
    }).catch(err => {
      console.error("Error sending email:", err);
      throw err; // Rethrow to trigger the catch block
    });
    
    res.send("Password reset code sent to your email.");

    
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while sending the reset code.");
  }
}
else if(person === 'practitioner'){
  try {
    const result = await pooll.query('SELECT * FROM practitioner WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(404).send("User not found.");

    const user = result.rows[0];

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: "wilfredc685@gmail.com",
        pass: "qdft qyhi wzbr qbig", // Replace with App Password
      },
    });
    

    // Generate a unique 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000); // 6-digit code

    // Save the reset code and its expiry in the mock database
    // user.resetCode = crypto.createHash("sha256").update(String(resetCode)).digest("hex");
    // user.resetCodeExpiry = Date.now() + 15 * 60 * 1000; // Code expires in 15 minutes
    const hashedResetCode = crypto.createHash("sha256").update(String(resetCode)).digest("hex");
    const resetCodeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

     // Update the database with reset code and expiry
     await pooll.query(
      "UPDATE practitioner SET reset_code = $1, reset_code_expiry = $2 WHERE email = $3",
      [hashedResetCode, resetCodeExpiry, email]
    );

    // Send the code via email
    await transporter.sendMail({
      to: email,
      subject: "Password Reset Request",
      text: `Your password reset code is: ${resetCode}\nThis code is valid for 15 minutes.`,
    }).catch(err => {
      console.error("Error sending email:", err);
      throw err; // Rethrow to trigger the catch block
    });
    
    res.send("Password reset code sent to your email.");

    
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while sending the reset code.");
  }

}
    // Check if the user exists
    // const result = await pooll.query('SELECT * FROM patient WHERE email = $1', [email]);
    // if (result.rows.length === 0) return res.status(404).send("User not found.");

    // const user = result.rows[0];

    // const transporter = nodemailer.createTransport({
    //   host: "smtp.gmail.com",
    //   port: 465,
    //   secure: true, // true for 465, false for other ports
    //   auth: {
    //     user: "wilfredc685@gmail.com",
    //     pass: "qdft qyhi wzbr qbig", // Replace with App Password
    //   },
    // });
    

    // // Generate a unique 6-digit code
    // const resetCode = Math.floor(100000 + Math.random() * 900000); // 6-digit code

    // // Save the reset code and its expiry in the mock database
    // // user.resetCode = crypto.createHash("sha256").update(String(resetCode)).digest("hex");
    // // user.resetCodeExpiry = Date.now() + 15 * 60 * 1000; // Code expires in 15 minutes
    // const hashedResetCode = crypto.createHash("sha256").update(String(resetCode)).digest("hex");
    // const resetCodeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    //  // Update the database with reset code and expiry
    //  await pooll.query(
    //   "UPDATE patient SET reset_code = $1, reset_code_expiry = $2 WHERE email = $3",
    //   [hashedResetCode, resetCodeExpiry, email]
    // );

    // // Send the code via email
    // await transporter.sendMail({
    //   to: email,
    //   subject: "Password Reset Request",
    //   text: `Your password reset code is: ${resetCode}\nThis code is valid for 15 minutes.`,
    // }).catch(err => {
    //   console.error("Error sending email:", err);
    //   throw err; // Rethrow to trigger the catch block
    // });
    
    // res.send("Password reset code sent to your email.");

    
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while sending the reset code.");
  }
};



const verify_reset_code = async (req, res) => {
  try {
    const { email, resetCode } = req.body;

    // Validate input
    if (!email || !resetCode) {
      return res.status(400).send("Email and reset code are required.");
    }

    // Check if the user exists and retrieve reset code details
    const result = await pooll.query(
      "SELECT reset_code, reset_code_expiry FROM patient WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("User not found.");
    }

    const { reset_code: storedHashedCode, reset_code_expiry: codeExpiry } = result.rows[0];

    // Hash the provided reset code to compare with the stored hashed code
    const hashedCode = crypto.createHash("sha256").update(String(resetCode)).digest("hex");

    // Validate the reset code and check expiry
    if (storedHashedCode !== hashedCode || new Date() > new Date(codeExpiry)) {
      return res.status(400).send("Invalid or expired reset code.");
    }

    // Reset code is valid
    res.send("Reset code verified. You can now reset your password.");
  } catch (error) {
    console.error("Error in verify_reset_code:", error);
    res.status(500).send("An error occurred while verifying the reset code.");
  }
};

const reset_password = async (req, res) => {
  try {

    const { userpassword, email } = req.body;

       // Validate input
       if (!userpassword || !email) {
        return res.status(400).send("Email and password are required.");
      }

     // Update the database
     const result = await pooll.query(
      "UPDATE patient SET userpassword = $1 WHERE email = $2",
      [userpassword, email]
    );

    if (result.rowCount === 0) {
      return res.status(404).send("User with the provided email not found.");
    }

    // Respond with success
    res.status(200).send("Password reset successfully.");
  } catch (error) {
    console.error("Error resetting password:", error.message);
    res.status(500).send("An error occurred while resetting the password.");
  }
};



const submit_datetime = async (req, res) => {
  const { email, dateTimeSelections } = req.body;

  if (!email || !Array.isArray(dateTimeSelections)) {
    return res.status(400).json({ message: 'Invalid data format' });
  }

  const client = await pooll.connect();
  try {
    await client.query('BEGIN');

    // Check if email exists
    const emailExistsQuery = `
      SELECT COUNT(*) FROM schedule WHERE email = $1;
    `;
    const emailExistsResult = await client.query(emailExistsQuery, [email]);

    const emailExists = parseInt(emailExistsResult.rows[0].count) > 0;

    if (emailExists) {
      // Delete existing records for the email
      await client.query(`DELETE FROM schedule WHERE email = $1`, [email]);
    }

    // Insert new date and time pairs for the email
    for (const selection of dateTimeSelections) {
      const { date, times } = selection;

      for (const time of times) {
        await client.query(
          `INSERT INTO schedule (selected_date, selected_time, email) VALUES ($1, $2, $3)`,
          [date, time, email]
        );
      }
    }

    await client.query('COMMIT');
    res.status(200).json({
      message: emailExists
        ? 'Date and time selections updated successfully'
        : 'Date and time selections inserted successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing data:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release();
  }
};

const select_datetime = async (req, res) => {
      try {
      const { email } = req.body;
    
      const response = {};
    
        // Query the database for journals by email, ordered by id in descending order
        const result = await pooll.query(
          "SELECT * FROM schedule WHERE email = $1",
          [email]
        );
    
        if (result.rows.length > 0) {
          response.data = result.rows;
          response.message = "Data retrieved successfully.";
        } else {
          response.message = "No journal entries found.";
        }
    
        res.status(200).json(response);
      } catch (error) {
        console.error("Error fetching journal data:", error);
        res.status(500).json({ message: "An error occurred while fetching the data." });
      }
    };
    


// const pricing = async (req, res) => {
//   try {
//   const { email } = req.body;

//   const response = {};

//     // Query the database for journals by email, ordered by id in descending order
//     const result = await pool.query(
//       "SELECT * FROM journal WHERE email = $1 ORDER BY id DESC",
//       [email]
//     );

//     if (result.rows.length > 0) {
//       response.data = result.rows;
//       response.message = "Data retrieved successfully.";
//     } else {
//       response.message = "No journal entries found.";
//     }

//     res.status(200).json(response);
//   } catch (error) {
//     console.error("Error fetching journal data:", error);
//     res.status(500).json({ message: "An error occurred while fetching the data." });
//   }
// };


// Export the Google Sign-In function
module.exports = { googleSignIn, register, patient_login, practitioner_login, forgot_password, verify_reset_code, reset_password, submit_datetime, select_datetime };

// module.exports = { register, patient_login, practitioner_login };
