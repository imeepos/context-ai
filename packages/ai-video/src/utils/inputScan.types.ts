/**
 * Input scan types
 */

export interface InputFileInfo {
    /** File name */
    filename: string;
    /** File path */
    path: string;
    /** File extension */
    extension: string;
    /** File type category */
    type: 'image' | 'excel' | 'other';
    /** File size in bytes */
    size: number;
}

export interface InputScanResult {
    /** Input directory path */
    inputDir: string;
    /** Image files */
    images: InputFileInfo[];
    /** Excel files */
    excels: InputFileInfo[];
    /** Other files */
    others: InputFileInfo[];
}
