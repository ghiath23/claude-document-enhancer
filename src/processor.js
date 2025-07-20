const mammoth = require('mammoth');
const fs = require('fs-extra');
const path = require('path');
const mime = require('mime');
const { table } = require('table');
const markdownTable = require('markdown-table');
const PDFProcessor = require('./pdf-processor');

class DocumentProcessor {
  constructor(options = {}) {
    this.options = {
      preserveLineBreaks: true,
      preserveOnlyMultipleLineBreaks: false,
      extractTables: true,
      outputFormat: 'enhanced-text', // 'text', 'markdown', 'json', 'enhanced-text'
      ...options
    };
    
    // Initialize PDF processor
    this.pdfProcessor = new PDFProcessor(this.options);
  }

  async processDocument(filePath) {
    const mimeType = mime.getType(filePath);
    const fileExtension = path.extname(filePath).toLowerCase();
    
    console.log(`Processing: ${filePath} (${mimeType})`);

    try {
      let result = {
        originalPath: filePath,
        mimeType,
        extractedText: '',
        tables: [],
        metadata: {},
        processingMethod: 'enhanced-javascript'
      };

      // Choose processing method based on file type
      switch (fileExtension) {
        case '.docx':
          result = await this.processDocx(filePath, result);
          break;
        case '.pdf':
          result = await this.processPdf(filePath, result);
          break;
        case '.txt':
        case '.md':
          result = await this.processText(filePath, result);
          break;
        default:
          throw new Error(`Unsupported file type: ${fileExtension}. Supported types: .pdf, .docx, .txt, .md`);
      }

      // Post-process to enhance for Claude
      result.claudeReady = this.formatForClaude(result);
      
      return result;
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
      throw error;
    }
  }

  async processDocx(filePath, result) {
    try {
      // Use mammoth for better table handling
      const buffer = await fs.readFile(filePath);
      
      // Extract with table-aware style mapping
      const mammothResult = await mammoth.convertToHtml(buffer, {
        styleMap: [
          "p[style-name='Table Grid'] => table > tr > td",
          "table => table:separator('\\n\\n')",
          "tr => tr:separator('\\n')",
          "td => td:separator('\\t')"
        ],
        includeDefaultStyleMap: true,
        preserveEmptyParagraphs: false
      });

      result.extractedText = mammothResult.value;
      result.metadata.warnings = mammothResult.messages;
      result.processingMethod = 'mammoth';

      // Extract tables from HTML
      if (this.options.extractTables) {
        result.tables = this.extractTablesFromHtml(mammothResult.value);
      }

      // Also get plain text version
      const plainTextResult = await mammoth.extractRawText(buffer);
      result.plainText = plainTextResult.value;

      return result;
    } catch (error) {
      console.error('DOCX processing failed:', error);
      throw error;
    }
  }

  async processPdf(filePath, result) {
    try {
      // Use our pure JavaScript PDF processor
      const pdfResult = await this.pdfProcessor.processDocument(filePath);
      
      if (!pdfResult.success) {
        throw new Error(pdfResult.error || 'PDF processing failed');
      }

      result.extractedText = pdfResult.claudeReady;
      result.metadata = pdfResult.metadata;
      result.processingMethod = 'pdf-parse-js';

      return result;
    } catch (error) {
      console.error('PDF processing failed:', error);
      throw error;
    }
  }

  async processText(filePath, result) {
    try {
      const text = await fs.readFile(filePath, 'utf8');
      result.extractedText = text;
      result.processingMethod = 'text-reader';

      // Detect tables in plain text if enabled
      if (this.options.extractTables) {
        result.tables = this.detectTablesInText(text);
      }

      return result;
    } catch (error) {
      console.error('Text processing failed:', error);
      throw error;
    }
  }

  extractTablesFromHtml(htmlContent) {
    const cheerio = require('cheerio');
    const $ = cheerio.load(htmlContent);
    const tables = [];

    $('table').each((index, element) => {
      const table = [];
      
      $(element).find('tr').each((rowIndex, row) => {
        const rowData = [];
        $(row).find('td, th').each((cellIndex, cell) => {
          rowData.push($(cell).text().trim());
        });
        if (rowData.length > 0) {
          table.push(rowData);
        }
      });

      if (table.length > 0) {
        tables.push({
          index: index + 1,
          rows: table.length,
          columns: table[0]?.length || 0,
          data: table
        });
      }
    });

    return tables;
  }

  detectTablesInText(text) {
    // Simple table detection for plain text
    const lines = text.split('\n');
    const tables = [];
    let currentTable = [];
    let inTable = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detect table-like patterns (multiple spaces/tabs)
      const hasMultipleSpaces = /\s{3,}/.test(line);
      const hasTabsOrPipes = /[\t|]/.test(line);
      const isTableLike = hasMultipleSpaces || hasTabsOrPipes;

      if (isTableLike && line.length > 10) {
        if (!inTable) {
          inTable = true;
          currentTable = [];
        }
        
        // Split by multiple spaces, tabs, or pipes
        const cells = line.split(/\s{3,}|\t+|\|+/).map(cell => cell.trim()).filter(cell => cell);
        if (cells.length > 1) {
          currentTable.push(cells);
        }
      } else {
        if (inTable && currentTable.length > 1) {
          tables.push({
            index: tables.length + 1,
            rows: currentTable.length,
            columns: Math.max(...currentTable.map(row => row.length)),
            data: currentTable
          });
        }
        inTable = false;
        currentTable = [];
      }
    }

    // Catch table at end of document
    if (inTable && currentTable.length > 1) {
      tables.push({
        index: tables.length + 1,
        rows: currentTable.length,
        columns: Math.max(...currentTable.map(row => row.length)),
        data: currentTable
      });
    }

    return tables;
  }

  formatForClaude(result) {
    let output = '';

    // Add document metadata
    output += `## Document Analysis\n`;
    output += `**File:** ${path.basename(result.originalPath)}\n`;
    output += `**Type:** ${result.mimeType}\n`;
    output += `**Processing Method:** ${result.processingMethod}\n`;
    
    if (result.metadata?.pages) {
      output += `**Pages:** ${result.metadata.pages}\n`;
    }
    
    output += `\n---\n\n`;

    // Add tables in readable format
    if (result.tables && result.tables.length > 0) {
      output += `## Extracted Tables (${result.tables.length})\n\n`;
      
      result.tables.forEach((table, index) => {
        output += `### Table ${table.index} (${table.rows} rows × ${table.columns} columns)\n\n`;
        
        if (this.options.outputFormat === 'markdown') {
          output += markdownTable(table.data) + '\n\n';
        } else {
          // Enhanced text format with nice borders
          const config = {
            border: {
              topBody: '─',
              topJoin: '┬',
              topLeft: '┌',
              topRight: '┐',
              bottomBody: '─',
              bottomJoin: '┴',
              bottomLeft: '└',
              bottomRight: '┘',
              bodyLeft: '│',
              bodyRight: '│',
              bodyJoin: '│',
              joinBody: '─',
              joinLeft: '├',
              joinRight: '┤',
              joinJoin: '┼'
            }
          };
          
          try {
            output += table(table.data, config) + '\n\n';
          } catch (e) {
            // Fallback to simple format
            output += table.data.map(row => row.join(' | ')).join('\n') + '\n\n';
          }
        }
      });
    }

    // Add extracted text
    if (result.extractedText) {
      if (result.tables && result.tables.length > 0) {
        output += `## Document Content\n\n`;
      }
      output += result.extractedText;
    }

    return output;
  }

  async processMultipleFiles(filePaths) {
    const results = [];
    
    for (const filePath of filePaths) {
      try {
        const result = await this.processDocument(filePath);
        results.push(result);
      } catch (error) {
        results.push({
          originalPath: filePath,
          error: error.message,
          success: false
        });
      }
    }

    return results;
  }

  async saveResults(results, outputDir = './output') {
    await fs.ensureDir(outputDir);

    for (const result of results) {
      if (result.error) continue;

      const baseName = path.basename(result.originalPath, path.extname(result.originalPath));
      
      // Save enhanced text
      const textPath = path.join(outputDir, `${baseName}_enhanced.txt`);
      await fs.writeFile(textPath, result.claudeReady);

      // Save JSON with all data
      const jsonPath = path.join(outputDir, `${baseName}_data.json`);
      await fs.writeFile(jsonPath, JSON.stringify(result, null, 2));

      console.log(`✅ Saved: ${textPath}`);
      console.log(`📊 Saved: ${jsonPath}`);
    }
  }
}

module.exports = DocumentProcessor;