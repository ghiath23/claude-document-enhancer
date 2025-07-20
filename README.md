# Claude Document Enhancer

Enhanced document processing pipeline for Claude - converts PDFs and DOCX with tables into Claude-friendly formats.

## 🚀 Quick Setup for Windows

### Step 1: Install Node.js Dependencies (Fixed Commands!)
```cmd
npm install textract mammoth pdf2pic cheerio commander chalk fs-extra mime table markdown-table
```

### Step 2: Install Python Dependencies (Optional - for advanced table extraction)
```cmd
pip install tabula-py pdfplumber camelot-py pandas
```

### Step 3: Install System Dependencies
**Option A: Using Chocolatey (Recommended)**
```cmd
REM Install chocolatey first if you don't have it
REM Open PowerShell as Administrator and run:
REM Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

REM Then install dependencies:
choco install poppler tesseract
```

**Option B: Manual Installation**
1. Download poppler: https://github.com/oschwartz10612/poppler-windows/releases/
2. Download tesseract: https://github.com/UB-Mannheim/tesseract/wiki
3. Add both to your PATH environment variable

## 📁 Project Structure
```
claude-document-enhancer/
├── src/
│   ├── processor.js     # Main processing engine
│   ├── cli.js          # Command line interface
│   └── utils/          # Helper utilities
├── test/               # Test files and examples
├── output/             # Processed documents
└── docs/               # Documentation
```

## 🔧 Usage

### Command Line
```cmd
REM Process a single document
node src/cli.js process document.pdf

REM Process multiple documents
node src/cli.js process *.docx *.pdf

REM Specify output directory and format
node src/cli.js process document.docx -o ./results -f markdown
```

### Programmatic Usage
```javascript
const DocumentProcessor = require('./src/processor');

const processor = new DocumentProcessor({
  extractTables: true,
  outputFormat: 'enhanced-text'
});

// Process a document
const result = await processor.processDocument('./document.pdf');
console.log(result.claudeReady);

// Process multiple files
const results = await processor.processMultipleFiles(['doc1.pdf', 'doc2.docx']);
await processor.saveResults(results, './output');
```

## 🎯 Features

### Document Processing
- ✅ **PDF**: Text extraction with layout preservation
- ✅ **DOCX**: Table-aware processing with mammoth.js
- ✅ **XLS/XLSX**: Spreadsheet data extraction
- ✅ **Images**: OCR text extraction (requires tesseract)

### Table Detection & Extraction
- 🔍 **Smart Detection**: Identifies tables in various formats
- 📊 **Structure Preservation**: Maintains rows/columns relationships
- 🎨 **Multiple Formats**: Output as text tables, markdown, or JSON
- 📈 **Claude-Optimized**: Formatted specifically for Claude understanding

### Output Formats
- **Enhanced Text**: Beautiful ASCII tables + content
- **Markdown**: GitHub-compatible table format
- **JSON**: Structured data with metadata
- **Raw**: Original extracted text

## 📊 Table Processing Examples

### Input: Messy PDF Table Text
```
Q1   Revenue   100k   Growth  15%
Q2   Revenue   150k   Growth  20%
Q3   Revenue   200k   Growth  25%
```

### Output: Claude-Ready Format
```
## Extracted Tables (1)

### Table 1 (3 rows × 4 columns)

┌─────┬─────────┬──────┬────────┐
│ Q1  │ Revenue │ 100k │ Growth │
├─────┼─────────┼──────┼────────┤
│ Q2  │ Revenue │ 150k │ Growth │
├─────┼─────────┼──────┼────────┤
│ Q3  │ Revenue │ 200k │ Growth │
└─────┴─────────┴──────┴────────┘

## Document Content
[Rest of document text...]
```

## 🚨 Troubleshooting

### Common Issues

**"pdftotext not found"**
- Install poppler using chocolatey or manual download
- Add to PATH environment variable

**"tesseract not found"** 
- Install tesseract OCR engine
- Add to PATH environment variable

**"Permission denied"**
- Run cmd as Administrator for system installations
- Use `npm install --global` for global packages

### Verification Commands
```cmd
REM Check if tools are installed
pdftotext -v
tesseract --version
node --version
npm --version
```

## ⚡ Getting Started Right Now

1. **Clone/Download this repository:**
```cmd
git clone https://github.com/ghiath23/claude-document-enhancer.git
cd claude-document-enhancer
```

2. **Install just the Node.js packages (skip tabula-py for now):**
```cmd
npm install textract mammoth pdf2pic cheerio commander chalk fs-extra mime table markdown-table
```

3. **Test with a simple document:**
```cmd
REM Create a test script
echo const DocumentProcessor = require('./src/processor'); > test.js
echo const processor = new DocumentProcessor(); >> test.js
echo processor.processDocument('./your-document.pdf').then(result => console.log(result.claudeReady)); >> test.js

REM Run it
node test.js
```

## 🤝 Next Steps

Once you have this working:
1. **Test it with your problematic PDFs/DOCX files**
2. **Report results** - what works, what doesn't
3. **I'll enhance it** based on your specific document types
4. **Add Python integration** for advanced table extraction if needed

## 📄 License

MIT License - see LICENSE file for details