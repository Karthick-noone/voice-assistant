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
  console.log('File upload received');
  try {
    const pdfBuffer = req.file.buffer;
    console.log('PDF buffer received:', pdfBuffer);
    
    // Parse the PDF
    const data = await pdfParse(pdfBuffer);
    console.log('PDF parsed:', data);

    // Extracted text from PDF
    const extractedText = data.text;
    console.log('Extracted text:', extractedText);

    // Send the extracted text as the response
    res.json({ text: extractedText });
  } catch (error) {
    console.error('Error parsing PDF:', error);
    res.status(500).send('Error parsing PDF');
  }
});

app.post('/ask', (req, res) => {
  const { question, text } = req.body;

  if (!question || !text) {
    return res.status(400).send('Question or PDF text is missing');
  }

  // Normalize question to lowercase for better matching
  const lowerCaseQuestion = question.toLowerCase();

  // Extract paragraphs
  const paragraphs = text.split('\n\n').map(p => p.trim()).filter(p => p.length > 0);

  let foundContent = '';

  // Search through paragraphs and match keywords/phrases more efficiently
  paragraphs.forEach((paragraph) => {
    const lowerCaseParagraph = paragraph.toLowerCase();

    // Check if the paragraph contains words or parts of the question
    if (lowerCaseParagraph.includes(lowerCaseQuestion)) {
      // If the question is found, split the paragraph into sentences
      const sentences = paragraph.split('.').map(sentence => sentence.trim());

      // Find the sentence that contains the specific part related to the query
      sentences.forEach(sentence => {
        if (sentence.toLowerCase().includes(lowerCaseQuestion)) {
          foundContent = sentence.trim();
        }
      });
    }
  });

  // If content is found, return it; else return a default response
  if (foundContent) {
    res.json({ answer: `\n\n"${foundContent}"` });
  } else {
    res.json({ answer: 'Sorry, I could not find an answer to your question in the document.' });
  }
});

app.get("/", (req, res) => {
  res.send("Hello, World!");
});
// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
