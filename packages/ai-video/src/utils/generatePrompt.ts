/**
 * Generate prompt utility
 */
import { scanInputDirectory } from './scanInputDirectory.js';
import { formatScanResult } from './formatScanResult.js';
import type { InputFileInfo, InputScanResult } from './inputScan.types.js';
import { getImageModels } from './getImageModels.js';
import { getVideoModels } from './getVideoModels.js';
import { getLlmModels } from './getLlmModels.js';
import type { ImageModelInfo, LlmModelInfo, VideoModelInfo } from './models.js';

// Re-export types for convenience
export type { InputFileInfo, InputScanResult };

// Re-export functions for convenience
export { scanInputDirectory } from './scanInputDirectory.js';
export { formatScanResult } from './formatScanResult.js';

/**
 * Format LLM models list
 */
function formatLlmModels(models: LlmModelInfo[]): string {
    const lines: string[] = [];
    lines.push('=== LLM Models (大语言模型) ===\n');

    for (const model of models) {
        lines.push(`## ${model.name}`);
        lines.push(`- **ID**: ${model.id}`);
        lines.push(`- **Provider**: ${model.provider}`);
        lines.push(`- **Description**: ${model.description}`);
        lines.push(
          `- **Supports Image Understanding**: ${model.supportsImageUnderstanding ? 'Yes' : 'No'}`
        );
        if (model.capabilities && model.capabilities.length > 0) {
            lines.push(`- **Capabilities**: ${model.capabilities.join(', ')}`);
        }
        if (model.useCases && model.useCases.length > 0) {
            lines.push(`- **Use Cases**: ${model.useCases.join(', ')}`);
        }
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Format video models list
 */
function formatVideoModels(models: VideoModelInfo[]): string {
    const lines: string[] = [];
    lines.push('=== Video Models (视频生成模型) ===\n');

    for (const model of models) {
        lines.push(`## ${model.name}`);
        lines.push(`- **ID**: ${model.id}`);
        lines.push(`- **Provider**: ${model.provider}`);
        lines.push(`- **Speed**: ${model.speed}`);
        lines.push(`- **Description**: ${model.description}`);
        if (model.capabilities && model.capabilities.length > 0) {
            lines.push(`- **Capabilities**: ${model.capabilities.join(', ')}`);
        }
        if (model.useCases && model.useCases.length > 0) {
            lines.push(`- **Use Cases**: ${model.useCases.join(', ')}`);
        }
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Format image models list
 */
function formatImageModels(models: ImageModelInfo[]): string {
    const lines: string[] = [];
    lines.push('=== Image Models (图像生成模型) ===\n');

    for (const model of models) {
        lines.push(`## ${model.name}`);
        lines.push(`- **ID**: ${model.id}`);
        lines.push(`- **Provider**: ${model.provider}`);
        lines.push(`- **Description**: ${model.description}`);
        if (model.capabilities && model.capabilities.length > 0) {
            lines.push(`- **Capabilities**: ${model.capabilities.join(', ')}`);
        }
        if (model.useCases && model.useCases.length > 0) {
            lines.push(`- **Use Cases**: ${model.useCases.join(', ')}`);
        }
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Generate prompt with input file list and available models
 * @param inputDir Input directory path
 * @returns Prompt string with file list and models
 */
export const generatePrompt = (inputDir: string): string => {
    const prompts: string[] = [];

    // Inject file list
    const scanResult = scanInputDirectory(inputDir);
    const inputScanPrompt = formatScanResult(scanResult);
    prompts.push(inputScanPrompt);
    prompts.push('');

    // Get available models
    const imageModels = getImageModels();
    const videoModels = getVideoModels();
    const llmModels = getLlmModels();

    // Inject model lists
    prompts.push(formatLlmModels(llmModels));
    prompts.push(formatVideoModels(videoModels));
    prompts.push(formatImageModels(imageModels));

    return prompts.join('\n');
};
