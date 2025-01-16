const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const cors = require('cors');

const app = express();
const port = 5000;

const corsOptions = {
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // Allow all methods
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'], // Allow necessary headers
  exposedHeaders: ['Content-Type', 'Authorization'], // Expose specific headers
  credentials: true, // Allow credentials if necessary
};

// Enable CORS globally
app.use(cors(corsOptions));

// Log incoming headers and response headers
app.use((req, res, next) => {
  console.log("Request Headers:", req.headers);
  console.log("Response Headers:", res.getHeaders());
  next();
});

// Handle OPTIONS preflight request
app.options('*', cors(corsOptions));

// Other configurations and routes

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Handle file upload
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const pdfBuffer = req.file.buffer;
    const data = await pdfParse(pdfBuffer);
    const extractedText = data.text;

    res.json({ text: extractedText });
  } catch (error) {
    console.error('Error parsing PDF:', error);
    res.status(500).send('Error parsing PDF');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
