/**
 * Scan input directory utility
 */
import * as fs from 'fs';
import * as path from 'path';
import type { InputFileInfo, InputScanResult } from './inputScan.types.js';

/**
 * Scan input directory and list all files
 * @param inputDir Input directory path
 * @returns Scan result with categorized files
 */
export function scanInputDirectory(inputDir: string): InputScanResult {
    const result: InputScanResult = {
        inputDir,
        images: [],
        excels: [],
        others: [],
    };

    if (!fs.existsSync(inputDir)) {
        console.warn(`[scanInputDirectory] Input directory does not exist: ${inputDir}`);
        return result;
    }

    const files = fs.readdirSync(inputDir);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const excelExtensions = ['.xlsx', '.xls'];

    for (const file of files) {
        const filePath = path.join(inputDir, file);
        const stat = fs.statSync(filePath);

        // Skip directories
        if (stat.isDirectory()) {
            continue;
        }

        const ext = path.extname(file).toLowerCase();
        const fileInfo: InputFileInfo = {
            filename: file,
            path: filePath,
            extension: ext,
            type: 'other',
            size: stat.size,
        };

        // Categorize by extension
        if (imageExtensions.includes(ext)) {
            fileInfo.type = 'image';
            result.images.push(fileInfo);
        } else if (excelExtensions.includes(ext)) {
            fileInfo.type = 'excel';
            result.excels.push(fileInfo);
        } else {
            result.others.push(fileInfo);
        }
    }

    return result;
}
