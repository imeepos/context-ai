/**
 * Format file size to human-readable string
 * @param bytes File size in bytes
 * @returns Formatted size string (e.g., "1.5 MB")
 */
export function formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
}
