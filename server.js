const express = require('express');
const multer = require('multer');
const fs = require('fs');
const bodyParser = require('body-parser');
const mega = require('megajs');
const path = require('path');

const app = express();
const PORT = 3000;

const upload = multer({ dest: 'uploads/' });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Login route
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const users = JSON.parse(fs.readFileSync('users.json', 'utf8'));
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    res.redirect('/upload.html');
  } else {
    res.send('❌ Login failed. <a href="/login.html">Try again</a>');
  }
});

// Upload route
app.post('/upload', upload.single('file'), (req, res) => {
  const filePath = req.file.path;
  const fileStream = fs.createReadStream(filePath);

  const storage = mega({
    email: 'dwindle.tech@gmail.com',
    password: 'Amma@dwindlemega1'
  });

  storage.on('ready', () => {
    const upload = storage.upload(req.file.originalname, fileStream);
    upload.on('complete', file => {
      res.send(`✅ File uploaded! <br> <a href="${file.downloadLink}" target="_blank">Download from MEGA</a>`);
      fs.unlinkSync(filePath); // Delete local file
    });
  });

  storage.on('error', err => {
    console.error(err);
    res.status(500).send('Error uploading to MEGA.');
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
 
