const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 5000;

const corsOptions = {
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // Allow all methods
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'], // Specify any headers if needed
};

app.use(cors(corsOptions));  // Apply this configuration globally
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// Set up storage for file uploads using multer
// const upload = multer({ dest: 'uploads/' });
// Multer setup for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Handle file upload
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const pdfBuffer = req.file.buffer;
    const data = await pdfParse(pdfBuffer);

    // Extracted text from the PDF
    const extractedText = data.text;

    // Return the extracted text
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

  

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
