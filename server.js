const express = require('express');
const multer = require('multer');
const cors = require('cors');
const pdf = require('pdf-parse');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Setup multer for file upload
const storage = multer.memoryStorage();  // Store files in memory
const upload = multer({ storage });

// Store extracted PDF data
let pdfData = { content: '', index: [] };

// Function to extract text from PDF using pdf-parse
const extractTextFromPDF = async (pdfBuffer) => {
  const data = await pdf(pdfBuffer);  // Use the buffer directly
  return data.text;
};

// Function to extract headings and subheadings
const extractHeadingsAndSubheadings = (pdfText) => {
  const headings = [];
  const lines = pdfText.split('\n');
  
  // Regex to match headings and subheadings (e.g., "1.1", "1.1.1")
  const headingRegex = /^\d+(\.\d+)*\s+(.*)$/;

  // Loop through lines to find headings and subheadings
  lines.forEach((line, idx) => {
    const match = line.trim().match(headingRegex);
    if (match) {
      const level = match[0];
      const title = match[2].trim();
      headings.push({ title, page: idx + 1 });
    }
  });

  return headings;
};

// Handle PDF upload and processing
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const pdfBuffer = req.file.buffer;  // Access the uploaded file's buffer
    const fullText = await extractTextFromPDF(pdfBuffer);

    pdfData.content = fullText;

    // Extract headings and subheadings
    const headings = extractHeadingsAndSubheadings(fullText);
    pdfData.index = headings;

    console.log('Extracted Index:', pdfData.index);

    // Respond with both index and full text
    res.json({ message: 'PDF uploaded and analyzed.', index: pdfData.index, text: pdfData.content });
  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).send('Error processing PDF');
  }
});

// Function to extract content based on the matched section (page-based extraction)
const extractSectionContent = (matchedHeading) => {
  // Find the index of the matched heading
  const matchedIndex = pdfData.index.find(item => item.title.toLowerCase() === matchedHeading.toLowerCase());

  if (!matchedIndex) {
    return null;  // No match found
  }

  // Find the next heading to stop the content extraction
  const nextIndex = pdfData.index.find((item, idx) => idx > pdfData.index.indexOf(matchedIndex));

  const sectionStart = pdfData.content.indexOf(matchedIndex.title);
  const sectionEnd = nextIndex ? pdfData.content.indexOf(nextIndex.title, sectionStart) : pdfData.content.length;
  
  const sectionContent = pdfData.content.slice(sectionStart, sectionEnd).trim();

  return sectionContent;
};

// Function to handle direct table lookups for exact matches
const getExactMatchFromTable = (question) => {
  const normalizedQuestion = question.trim().toLowerCase();
  return pdfData.index.find(item => item.title.toLowerCase() === normalizedQuestion);
};

app.post('/ask', (req, res) => {
  const { question } = req.body;

  if (!pdfData.index.length || !pdfData.content) {
    return res.status(400).send('PDF not uploaded or analyzed yet.');
  }

  // Check for an exact match in the table of contents
  const exactMatch = getExactMatchFromTable(question);
  if (exactMatch) {
    return res.json({ answer: `Exact match found: ${exactMatch.title}, Page: ${exactMatch.page}` });
  }

  // Normalize question (trim spaces and convert to lowercase)
  const normalizedQuestion = question.trim().toLowerCase();

  // Try matching the question with the headings based on keywords
  let matchedIndex = pdfData.index.find((indexItem) => 
    normalizedQuestion.includes(indexItem.title.trim().toLowerCase())
  );

  // If no match found, try a more flexible approach: split the question into keywords
  if (!matchedIndex) {
    const keywords = normalizedQuestion.split(' ').filter(word => word.length > 3); // Only consider meaningful words
    matchedIndex = pdfData.index.find(indexItem => {
      return keywords.some(keyword => indexItem.title.toLowerCase().includes(keyword));
    });
  }

  if (!matchedIndex) {
    return res.json({ answer: 'No relevant section found for your question.' });
  }

  // Extract content based on matched index and page numbers
  const sectionContent = extractSectionContent(matchedIndex.title);

  if (!sectionContent) {
    return res.json({ answer: 'No content found for this section.' });
  }

  // Return the extracted content as the answer
  res.json({ answer: sectionContent });
});

// Start the server
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
