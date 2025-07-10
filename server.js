require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const bodyParser = require('body-parser');
const mega = require('megajs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// File upload setup
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // serve static files from /public

// 🔵 Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 🟢 Test route (to check if server is alive)
app.get('/test', (req, res) => {
  res.send('✅ Server is running.');
});

// 🔐 Login route
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  try {
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, 'users.json'), 'utf8'));
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
      console.log(`🔓 Login successful for user: ${username}`);
      res.redirect('/upload.html');
    } else {
      console.log(`❌ Login failed for user: ${username}`);
      res.status(401).send('❌ Login failed. <a href="/login.html">Try again</a>');
    }

  } catch (err) {
    console.error('Error reading users.json:', err);
    res.status(500).send('Internal Server Error');
  }
});

// ⬆️ Upload route
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const filePath = req.file.path;
  const fileStream = fs.createReadStream(filePath);

  const storage = mega({
    email: process.env.MEGA_EMAIL,
    password: process.env.MEGA_PASSWORD
  });

  console.log('📡 Connecting to MEGA...');

  storage.on('ready', () => {
    console.log('🟢 MEGA connected. Uploading:', req.file.originalname);

    const upload = storage.upload({
  name: req.file.originalname,
  size: req.file.size, // Add this line!
  allowUploadBuffering: true  // Optional, adds safety
}, fileStream);

    upload.on('complete', file => {
      console.log('✅ File uploaded:', file.downloadLink);

      res.send(`
        <h2>✅ File Uploaded</h2>
        <p><a href="${file.downloadLink}" target="_blank">Download from MEGA</a></p>
        <a href="/upload.html">Upload another file</a>
      `);

      // Safely delete the uploaded file
      fs.unlink(filePath, err => {
        if (err) console.error('Error deleting file:', err);
      });
    });

    upload.on('error', err => {
      console.error('❌ MEGA upload error:', err);
      res.status(500).send('Error uploading file to MEGA.');

      fs.unlink(filePath, err => {
        if (err) console.error('Error deleting file:', err);
      });
    });
  });

  storage.on('error', err => {
    console.error('❌ MEGA login error:', err);
    res.status(500).send('Error connecting to MEGA.');

    fs.unlink(filePath, err => {
      if (err) console.error('Error deleting file:', err);
    });
  });
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
