#!/usr/bin/env node

const { Command } = require('commander');
const DocumentProcessor = require('./processor');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

const program = new Command();

program
  .name('claude-doc-processor')
  .description('Enhanced document processing for Claude')
  .version('1.0.0');

program
  .command('process')
  .description('Process documents for Claude')
  .argument('<files...>', 'Files to process')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('-f, --format <type>', 'Output format (text|markdown|json)', 'text')
  .option('--no-tables', 'Skip table extraction')
  .option('--preserve-breaks', 'Preserve line breaks')
  .action(async (files, options) => {
    try {
      console.log(chalk.blue('🔍 Starting document processing...'));
      
      const processor = new DocumentProcessor({
        extractTables: options.tables,
        outputFormat: options.format,
        preserveLineBreaks: options.preserveBreaks
      });

      // Validate files exist
      const validFiles = [];
      for (const file of files) {
        if (await fs.pathExists(file)) {
          validFiles.push(file);
          console.log(chalk.green(`✓ Found: ${file}`));
        } else {
          console.log(chalk.red(`✗ Not found: ${file}`));
        }
      }

      if (validFiles.length === 0) {
        console.log(chalk.red('❌ No valid files found!'));
        return;
      }

      // Process documents
      console.log(chalk.blue(`📄 Processing ${validFiles.length} document(s)...`));
      const results = await processor.processMultipleFiles(validFiles);

      // Save results
      await processor.saveResults(results, options.output);

      // Show summary
      const successful = results.filter(r => !r.error).length;
      const failed = results.length - successful;

      console.log(chalk.green(`\n✅ Processing complete!`));
      console.log(chalk.green(`📊 ${successful} successful, ${failed} failed`));
      console.log(chalk.blue(`📁 Results saved to: ${options.output}`));

      // Show table stats
      const totalTables = results.reduce((sum, r) => sum + (r.tables?.length || 0), 0);
      if (totalTables > 0) {
        console.log(chalk.yellow(`🔢 Found ${totalTables} tables across all documents`));
      }

    } catch (error) {
      console.error(chalk.red('❌ Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('test')
  .description('Test with sample documents')
  .action(async () => {
    console.log(chalk.blue('🧪 Running tests...'));
    
    // Check if sample files exist
    const sampleDir = path.join(__dirname, '..', 'test', 'samples');
    
    if (!(await fs.pathExists(sampleDir))) {
      console.log(chalk.yellow('📁 Creating sample directory...'));
      await fs.ensureDir(sampleDir);
      
      console.log(chalk.blue(`Please add sample PDF/DOCX files to: ${sampleDir}`));
      console.log(chalk.blue('Then run: node src/cli.js test'));
      return;
    }

    const files = await fs.readdir(sampleDir);
    const docFiles = files.filter(f => /\.(pdf|docx|xlsx?)$/i.test(f));
    
    if (docFiles.length === 0) {
      console.log(chalk.yellow(`No sample documents found in ${sampleDir}`));
      console.log(chalk.blue('Add some PDF/DOCX files and try again!'));
      return;
    }

    console.log(chalk.green(`Found ${docFiles.length} sample document(s)`));
    
    const fullPaths = docFiles.map(f => path.join(sampleDir, f));
    
    // Process using the same logic as main command
    const processor = new DocumentProcessor();
    const results = await processor.processMultipleFiles(fullPaths);
    await processor.saveResults(results, './test-output');
    
    console.log(chalk.green('✅ Test complete! Check ./test-output for results'));
  });

program
  .command('setup')
  .description('Setup and verify dependencies')
  .action(async () => {
    console.log(chalk.blue('🔧 Checking dependencies...'));
    
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    const checks = [
      { name: 'Node.js', cmd: 'node --version' },
      { name: 'NPM', cmd: 'npm --version' },
      { name: 'pdftotext', cmd: 'pdftotext -v 2>&1' },
      { name: 'tesseract', cmd: 'tesseract --version 2>&1' }
    ];
    
    for (const check of checks) {
      try {
        const result = await execAsync(check.cmd);
        console.log(chalk.green(`✓ ${check.name}: Available`));
      } catch (error) {
        console.log(chalk.red(`✗ ${check.name}: Not found`));
        
        if (check.name === 'pdftotext') {
          console.log(chalk.yellow('  Install with: choco install poppler'));
        } else if (check.name === 'tesseract') {
          console.log(chalk.yellow('  Install with: choco install tesseract'));
        }
      }
    }
    
    console.log(chalk.blue('\n📦 Checking npm packages...'));
    
    const requiredPackages = [
      'textract', 'mammoth', 'cheerio', 'commander', 
      'chalk', 'fs-extra', 'mime', 'table', 'markdown-table'
    ];
    
    for (const pkg of requiredPackages) {
      try {
        require.resolve(pkg);
        console.log(chalk.green(`✓ ${pkg}: Installed`));
      } catch (error) {
        console.log(chalk.red(`✗ ${pkg}: Missing`));
      }
    }
    
    console.log(chalk.blue('\n🎯 Setup complete!'));
  });

// Handle no command
if (process.argv.length <= 2) {
  console.log(chalk.blue('🚀 Claude Document Enhancer'));
  console.log(chalk.yellow('Usage examples:'));
  console.log('  node src/cli.js process document.pdf');
  console.log('  node src/cli.js test');
  console.log('  node src/cli.js setup');
  console.log('  node src/cli.js --help');
}

program.parse();