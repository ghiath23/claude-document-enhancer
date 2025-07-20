const fs = require('fs');
const path = require('path');

class PDFProcessor {
    constructor(options = {}) {
        this.options = {
            extractTables: true,
            outputFormat: 'enhanced-text',
            ...options
        };
    }

    async processDocument(filePath) {
        try {
            // Dynamic import of pdf-parse (pure JavaScript, no external deps)
            const pdfParse = await import('pdf-parse/lib/pdf-parse.js');
            
            // Read the PDF file
            const buffer = fs.readFileSync(filePath);
            
            // Parse the PDF
            const data = await pdfParse.default(buffer);
            
            // Process the extracted text
            const processedResult = this.enhanceText(data.text, data);
            
            return {
                success: true,
                claudeReady: processedResult,
                metadata: {
                    pages: data.numpages,
                    info: data.info,
                    fileType: 'PDF',
                    tablesFound: this.countTables(data.text)
                }
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                claudeReady: `Error processing PDF: ${error.message}`
            };
        }
    }

    enhanceText(text, metadata) {
        let enhanced = '';
        
        // Add document header
        enhanced += `# Document Analysis\n\n`;
        enhanced += `**Document Type:** PDF\n`;
        enhanced += `**Pages:** ${metadata.numpages}\n`;
        if (metadata.info?.Title) {
            enhanced += `**Title:** ${metadata.info.Title}\n`;
        }
        enhanced += `\n---\n\n`;

        // Detect and format tables
        if (this.options.extractTables) {
            const tablesData = this.detectTables(text);
            if (tablesData.tables.length > 0) {
                enhanced += `## Extracted Tables (${tablesData.tables.length})\n\n`;
                tablesData.tables.forEach((table, index) => {
                    enhanced += `### Table ${index + 1}\n\n`;
                    enhanced += this.formatTable(table);
                    enhanced += `\n\n`;
                });
                enhanced += `## Document Content\n\n`;
                enhanced += tablesData.textWithoutTables;
            } else {
                enhanced += text;
            }
        } else {
            enhanced += text;
        }

        return enhanced;
    }

    detectTables(text) {
        const lines = text.split('\n');
        const tables = [];
        let currentTable = [];
        let textWithoutTables = '';
        let inTable = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Simple table detection: lines with multiple tab-separated or space-separated values
            const hasTableStructure = this.isTableRow(line);
            
            if (hasTableStructure && !inTable) {
                // Start of a new table
                inTable = true;
                currentTable = [line];
            } else if (hasTableStructure && inTable) {
                // Continue current table
                currentTable.push(line);
            } else if (inTable && !hasTableStructure) {
                // End of table
                if (currentTable.length >= 2) { // At least 2 rows to be a table
                    tables.push(currentTable);
                }
                currentTable = [];
                inTable = false;
                textWithoutTables += line + '\n';
            } else {
                // Regular text
                textWithoutTables += line + '\n';
            }
        }

        // Handle table at end of document
        if (inTable && currentTable.length >= 2) {
            tables.push(currentTable);
        }

        return {
            tables: tables.map(table => this.parseTableRows(table)),
            textWithoutTables: textWithoutTables.trim()
        };
    }

    isTableRow(line) {
        if (!line.trim()) return false;
        
        // Check for tab-separated values
        const tabCount = (line.match(/\t/g) || []).length;
        if (tabCount >= 2) return true;
        
        // Check for multiple space-separated numeric or short text values
        const parts = line.split(/\s{2,}/).filter(part => part.trim());
        if (parts.length >= 3) {
            // Check if it looks like tabular data
            const hasNumbers = parts.some(part => /\d/.test(part));
            const averageLength = parts.reduce((sum, part) => sum + part.length, 0) / parts.length;
            return hasNumbers && averageLength < 20; // Short values suggest tabular data
        }
        
        return false;
    }

    parseTableRows(tableLines) {
        return tableLines.map(line => {
            // Split by tabs first, then by multiple spaces
            if (line.includes('\t')) {
                return line.split('\t').map(cell => cell.trim());
            } else {
                return line.split(/\s{2,}/).map(cell => cell.trim()).filter(cell => cell);
            }
        });
    }

    formatTable(tableRows) {
        if (!tableRows || tableRows.length === 0) return '';
        
        // Find the maximum number of columns
        const maxCols = Math.max(...tableRows.map(row => row.length));
        
        // Pad all rows to have the same number of columns
        const normalizedRows = tableRows.map(row => {
            const paddedRow = [...row];
            while (paddedRow.length < maxCols) {
                paddedRow.push('');
            }
            return paddedRow;
        });

        // Calculate column widths
        const colWidths = new Array(maxCols).fill(0);
        normalizedRows.forEach(row => {
            row.forEach((cell, i) => {
                colWidths[i] = Math.max(colWidths[i], cell.length);
            });
        });

        // Generate table
        let table = '';
        
        // Top border
        table += '┌' + colWidths.map(width => '─'.repeat(width + 2)).join('┬') + '┐\n';
        
        // First row (header)
        if (normalizedRows.length > 0) {
            table += '│' + normalizedRows[0].map((cell, i) => ` ${cell.padEnd(colWidths[i])} `).join('│') + '│\n';
            
            if (normalizedRows.length > 1) {
                // Header separator
                table += '├' + colWidths.map(width => '─'.repeat(width + 2)).join('┼') + '┤\n';
                
                // Data rows
                for (let i = 1; i < normalizedRows.length; i++) {
                    table += '│' + normalizedRows[i].map((cell, j) => ` ${cell.padEnd(colWidths[j])} `).join('│') + '│\n';
                }
            }
        }
        
        // Bottom border
        table += '└' + colWidths.map(width => '─'.repeat(width + 2)).join('┴') + '┘';
        
        return table;
    }

    countTables(text) {
        return this.detectTables(text).tables.length;
    }
}

module.exports = PDFProcessor;