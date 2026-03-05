/**
 * Format scan result utility
 */
import { formatSize } from './formatSize.js';
import type { InputScanResult } from './inputScan.types.js';

/**
 * Format scan result to readable string
 * @param result Scan result
 * @returns Formatted string
 */
export function formatScanResult(result: InputScanResult): string {
    const lines: string[] = [];
    const totalFiles = result.images.length + result.excels.length + result.others.length;

    lines.push(`Input Directory: ${result.inputDir}`);
    lines.push(`Total Files: ${totalFiles}`);
    lines.push('');

    if (result.images.length > 0) {
        lines.push(`Images (${result.images.length}):`);
        for (const img of result.images) {
            lines.push(`  - ${img.filename} (${formatSize(img.size)})`);
        }
        lines.push('');
    }

    if (result.excels.length > 0) {
        lines.push(`Excel Files (${result.excels.length}):`);
        for (const excel of result.excels) {
            lines.push(`  - ${excel.filename} (${formatSize(excel.size)})`);
        }
        lines.push('');
    }

    if (result.others.length > 0) {
        lines.push(`Other Files (${result.others.length}):`);
        for (const other of result.others) {
            lines.push(`  - ${other.filename} (${formatSize(other.size)})`);
        }
    }

    return lines.join('\n');
}
