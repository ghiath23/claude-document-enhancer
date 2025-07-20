const textract = require('textract');
const mammoth = require('mammoth');
const fs = require('fs-extra');
const path = require('path');
const mime = require('mime');
const { table } = require('table');
const markdownTable = require('markdown-table');

class DocumentProcessor {
  constructor(options = {}) {
    this.options = {
      preserveLineBreaks: true,
      preserveOnlyMultipleLineBreaks: false,
      extractTables: true,
      outputFormat: 'enhanced-text', // 'text', 'markdown', 'json', 'enhanced-text'
      ...options
    };
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
        processingMethod: 'textract'
      };

      // Choose processing method based on file type
      switch (fileExtension) {
        case '.docx':
          result = await this.processDocx(filePath, result);
          break;
        case '.pdf':
          result = await this.processPdf(filePath, result);
          break;
        case '.xlsx':
        case '.xls':
          result = await this.processSpreadsheet(filePath, result);
          break;
        default:
          result = await this.processGeneric(filePath, result);
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

      // Fallback to textract for plain text
      const textractText = await this.textractExtract(filePath);
      result.fallbackText = textractText;

      return result;
    } catch (error) {
      console.warn('Mammoth failed, falling back to textract:', error.message);
      return await this.processGeneric(filePath, result);
    }
  }

  async processPdf(filePath, result) {
    try {
      // Use textract with PDF-specific options
      const text = await this.textractExtract(filePath, {
        pdftotextOptions: {
          layout: 'raw', // Preserve layout for table detection
          bbox: true,    // Include bounding box info
          nopgbrk: true  // No page breaks
        }
      });

      result.extractedText = text;
      result.processingMethod = 'textract-pdf';

      // Detect and extract tables from raw text
      if (this.options.extractTables) {
        result.tables = this.detectTablesInText(text);
      }

      return result;
    } catch (error) {
      console.error('PDF processing failed:', error);
      throw error;
    }
  }

  async processSpreadsheet(filePath, result) {
    try {
      const text = await this.textractExtract(filePath);
      result.extractedText = text;
      result.processingMethod = 'textract-spreadsheet';

      // For spreadsheets, the entire content is essentially a table
      if (this.options.extractTables) {
        result.tables = this.parseSpreadsheetText(text);
      }

      return result;
    } catch (error) {
      console.error('Spreadsheet processing failed:', error);
      throw error;
    }
  }

  async processGeneric(filePath, result) {
    const text = await this.textractExtract(filePath);
    result.extractedText = text;
    result.processingMethod = 'textract-generic';
    return result;
  }

  async textractExtract(filePath, options = {}) {
    return new Promise((resolve, reject) => {
      const extractOptions = {
        preserveLineBreaks: this.options.preserveLineBreaks,
        preserveOnlyMultipleLineBreaks: this.options.preserveOnlyMultipleLineBreaks,
        ...options
      };

      textract.fromFileWithPath(filePath, extractOptions, (error, text) => {
        if (error) {
          reject(error);
        } else {
          resolve(text || '');
        }
      });
    });
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
    // Simple table detection for PDF text
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

  parseSpreadsheetText(text) {
    // For spreadsheet text, split by commas and newlines
    const lines = text.split('\n').filter(line => line.trim());
    const table = lines.map(line => 
      line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
    );

    return [{
      index: 1,
      rows: table.length,
      columns: Math.max(...table.map(row => row.length)),
      data: table
    }];
  }

  formatForClaude(result) {
    let output = '';

    // Add document metadata
    output += `## Document Analysis\n`;
    output += `**File:** ${path.basename(result.originalPath)}\n`;
    output += `**Type:** ${result.mimeType}\n`;
    output += `**Processing Method:** ${result.processingMethod}\n\n`;

    // Add tables in readable format
    if (result.tables && result.tables.length > 0) {
      output += `## Extracted Tables (${result.tables.length})\n\n`;
      
      result.tables.forEach((table, index) => {
        output += `### Table ${table.index} (${table.rows} rows × ${table.columns} columns)\n\n`;
        
        if (this.options.outputFormat === 'markdown') {
          output += markdownTable(table.data) + '\n\n';
        } else {
          // Enhanced text format
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
      output += `## Document Content\n\n`;
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

      console.log(`Saved: ${textPath}`);
      console.log(`Saved: ${jsonPath}`);
    }
  }
}

module.exports = DocumentProcessor;