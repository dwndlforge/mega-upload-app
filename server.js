const express = require('express');
const multer = require('multer');
const fs = require('fs');
const bodyParser = require('body-parser');
const mega = require('megajs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({ dest: 'uploads/' });

app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Root route serves login.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Login route
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  try {
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, 'users.json'), 'utf8'));
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      res.redirect('/upload.html');
    } else {
      res.status(401).send('❌ Login failed. <a href="/login.html">Try again</a>');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// Upload route
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }

  const filePath = req.file.path;
  const fileStream = fs.createReadStream(filePath);

  const storage = mega({
    email: process.env.MEGA_EMAIL,
    password: process.env.MEGA_PASSWORD
  });

  storage.on('ready', () => {
    const upload = storage.upload(req.file.originalname, fileStream);
    upload.on('complete', file => {
      res.send(`✅ File uploaded! <br> <a href="${file.downloadLink}" target="_blank">Download from MEGA</a>`);
      fs.unlinkSync(filePath);
    });
    upload.on('error', err => {
      console.error(err);
      res.status(500).send('Error uploading file to MEGA.');
      fs.unlinkSync(filePath);
    });
  });

  storage.on('error', err => {
    console.error(err);
    res.status(500).send('Error connecting to MEGA.');
    fs.unlinkSync(filePath);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
