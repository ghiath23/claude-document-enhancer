# Claude Document Enhancer ✨

**Pure JavaScript document processing for Claude - No external dependencies required!**

Enhanced document processing pipeline that converts PDFs and DOCX files with tables into Claude-friendly formats using **100% JavaScript libraries**.

## 🚀 **ZERO EXTERNAL DEPENDENCIES** - Works Out of the Box!

✅ **No poppler/pdftotext required**  
✅ **No tesseract required**  
✅ **No system dependencies**  
✅ **Pure JavaScript solution**  
✅ **Works on any system with Node.js**

## 📁 **Quick Setup** (Fixed - No More Errors!)

### **1. Install Dependencies (Pure JavaScript)**
```cmd
npm install pdf-parse mammoth cheerio commander chalk fs-extra mime table markdown-table
```

### **2. Test Immediately**
```cmd
node src/cli.js process "C:\Users\ghiat\OneDrive\Desktop\Walden\LN002\Instructions & Rubric.pdf" -o ./output
```

## 🎯 **Features**

### **Document Processing**
- ✅ **PDF**: Text extraction with intelligent table detection (pdf-parse)
- ✅ **DOCX**: Table-aware processing with mammoth.js
- ✅ **Tables**: Smart detection and beautiful formatting
- ✅ **Claude-Optimized**: Perfect formatting for AI understanding

### **Table Detection & Extraction**
- 🔍 **Smart Detection**: Identifies tables in various formats automatically
- 📊 **Structure Preservation**: Maintains rows/columns relationships
- 🎨 **Beautiful Output**: ASCII tables with proper borders
- 📈 **Claude-Ready**: Formatted specifically for Claude understanding

### **Output Formats**
- **Enhanced Text**: Beautiful ASCII tables + organized content
- **Markdown**: GitHub-compatible table format
- **JSON**: Structured data with metadata
- **Pure Text**: Clean extracted text

## 📊 **Table Processing Examples**

### **Input: Messy PDF Table Text**
```
Q1   Revenue   100k   Growth  15%
Q2   Revenue   150k   Growth  20%
Q3   Revenue   200k   Growth  25%
```

### **Output: Claude-Ready Format**
```
## Document Analysis
**File:** Instructions & Rubric.pdf
**Type:** application/pdf
**Processing Method:** pdf-parse-js

---

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

## 🔧 **Usage**

### **Command Line Interface**
```cmd
# Process a single document
node src/cli.js process document.pdf

# Process with specific output directory
node src/cli.js process document.docx -o ./results

# Process multiple files
node src/cli.js process *.pdf *.docx

# Specify output format
node src/cli.js process document.pdf -f markdown
```

### **Programmatic Usage**
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

## 🚀 **Perfect for Your Workflow**

This solution is designed for seamless integration where **Claude needs to read PDF and DOCX files** as part of a larger workflow:

```javascript
// Your MCP function can now process any document
async function processDocument(filePath) {
  const processor = new DocumentProcessor();
  const result = await processor.processDocument(filePath);
  return result.claudeReady; // Ready for Claude to understand!
}
```

## 💡 **What Problems This Solves**

**Before (textract + external tools):**
- ❌ Requires poppler installation
- ❌ Requires tesseract for OCR
- ❌ Windows compatibility issues
- ❌ Complex setup process
- ❌ Tables become mangled text

**After (pure JavaScript):**
- ✅ Works immediately after `npm install`
- ✅ No system dependencies
- ✅ Perfect Windows compatibility
- ✅ Clean, simple setup
- ✅ Beautiful table formatting

## 📈 **Technical Stack**

- **PDF Processing**: `pdf-parse` (pure JavaScript PDF parser)
- **DOCX Processing**: `mammoth` (Microsoft Word document parser)
- **Table Detection**: Custom algorithms for intelligent table recognition
- **Output Formatting**: ASCII art tables with proper borders
- **CLI Interface**: `commander` with colored output

## 🎯 **Benefits for Claude Integration**

1. **Better Table Understanding**: Tables are preserved with clear structure
2. **Organized Content**: Metadata and sections clearly separated
3. **Enhanced Formatting**: Headers, borders, and structure for clarity
4. **Zero Setup Friction**: Works immediately without system configuration
5. **Reliable Processing**: No external tool dependencies to break

## ⚡ **Getting Started Right Now**

1. **Use the corrected npm install:**
```cmd
npm install pdf-parse mammoth cheerio commander chalk fs-extra mime table markdown-table
```

2. **Test with your document:**
```cmd
node src/cli.js process "C:\Users\ghiat\OneDrive\Desktop\Walden\LN002\Instructions & Rubric.pdf"
```

3. **Check the output:**
```cmd
# Results will be in ./output/ directory
# Look for *_enhanced.txt files
```

## 🤝 **Integration Ready**

This system is designed to be part of your larger Claude workflow. The enhanced text output is specifically formatted to help Claude better understand document structure, especially tables and grids that were previously problematic.

## 📄 **License**

MIT License - Use freely in your projects!

---

**🎉 No more poppler errors, no more external dependencies - just pure JavaScript document processing that works!**