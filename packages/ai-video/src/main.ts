/**
 * Main entry point for testing and development
 */
import * as path from 'path';
import { generatePrompt, scanInputDirectory, formatScanResult } from './utils/generatePrompt.js';

// Default input directory
const DEFAULT_INPUT_DIR = './inputs';

async function main() {
    // Get input directory from command line args or use default
    const inputDir = process.argv[2] || DEFAULT_INPUT_DIR;
    const absolutePath = path.resolve(inputDir);

    console.log('=== AI Video - Input Scanner ===\n');
    console.log(`Scanning directory: ${absolutePath}\n`);

    try {
        // Generate prompt with file list
        const result = generatePrompt(absolutePath);
        console.log(result);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
