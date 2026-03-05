#!/usr/bin/env node
/**
 * AI Video CLI Entry Point
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import * as path from 'path';
import * as fs from 'fs';
import { VideoAgent } from '../agent/index.js';
import type { CLIOptions } from '../types.js';

const program = new Command();

interface RuntimeConfig {
  apiKey?: string;
  baseURL?: string;
  chatModel?: string;
  outputDir?: string;
  prompt?: string;
  videoConfig?: {
    model?: string;
    resolution?: string;
    duration?: number;
  };
}

function parseEnvContent(content: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^"(.*)"$/, '$1');
    parsed[key] = value;
  }
  return parsed;
}

function loadEnvFile(filePath: string): number {
  if (!fs.existsSync(filePath)) {
    return 0;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const envMap = parseEnvContent(content);
  let appliedCount = 0;
  for (const [key, value] of Object.entries(envMap)) {
    process.env[key] = value;
    appliedCount++;
  }
  return appliedCount;
}

function applyRuntimeEnv(config: RuntimeConfig): void {
  if (config.apiKey) {
    process.env.API_KEY = config.apiKey;
    process.env.AI_VIDEO_API_KEY = config.apiKey;
  }
  if (config.baseURL) {
    process.env.BASE_URL = config.baseURL;
    process.env.API_BASE_URL = config.baseURL;
    process.env.AI_VIDEO_BASE_URL = config.baseURL;
  }
  if (config.chatModel) {
    process.env.CHAT_MODEL = config.chatModel;
  }
}

function loadRuntimeConfig(inputDir: string, configFile?: string): RuntimeConfig {
  if (configFile) {
    const resolved = path.resolve(configFile);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Config file not found: ${resolved}`);
    }

    if (resolved.toLowerCase().endsWith('.env')) {
      loadEnvFile(resolved);
      return {};
    }

    const raw = fs.readFileSync(resolved, 'utf8').replace(/^\uFEFF/, '');
    const json = JSON.parse(raw) as Record<string, unknown>;
    const config: RuntimeConfig = {
      apiKey: (json.apiKey || json.API_KEY) as string | undefined,
      baseURL: (json.baseURL || json.baseUrl || json.API_BASE_URL || json.BASE_URL) as string | undefined,
      chatModel: (json.chatModel || json.CHAT_MODEL) as string | undefined,
      outputDir: (json.outputDir || json.output) as string | undefined,
      prompt: json.prompt as string | undefined,
      videoConfig: (json.videoConfig || json.video) as RuntimeConfig['videoConfig'],
    };
    applyRuntimeEnv(config);
    return config;
  }

  const autoEnvFiles = Array.from(new Set([path.resolve('.env'), path.resolve(path.dirname(inputDir), '.env')]));
  for (const envFile of autoEnvFiles) {
    loadEnvFile(envFile);
  }
  return {};
}

program
  .name('ai-video')
  .description('AI Video Generation Tool - Automatically generate videos from storyboard files and reference images')
  .version('1.0.0');

program
  .command('start <input>')
  .description('Start video generation')
  .option('-o, --output <dir>', 'Output directory', './outputs')
  .option('-c, --config <file>', 'Config file path')
  .option('-m, --model <name>', 'Video generation model')
  .option('-r, --resolution <resolution>', 'Resolution (e.g. 1920x1080)', '1920x1080')
  .option('-d, --duration <seconds>', 'Video duration (seconds)', '5')
  .option('-v, --verbose', 'Show verbose logs', false)
  .option('--prompt <text>', 'Custom prompt')
  .action(async (input: string, options: CLIOptions) => {
    await runVideoGeneration(input, options);
  });

program
  .command('models')
  .description('List available video generation models')
  .action(async () => {
    await listModels();
  });

/**
 * Run video generation
 */
async function runVideoGeneration(input: string, options: CLIOptions): Promise<void> {
  console.log(chalk.blue.bold('\n🎬 AI Video Generator\n'));

  // Parse paths
  const inputDir = path.resolve(input);
  const runtimeConfig = loadRuntimeConfig(inputDir, options.config);
  const outputDir = path.resolve(options.output || runtimeConfig.outputDir || './outputs');

  // Validate input directory
  if (!fs.existsSync(inputDir)) {
    console.error(chalk.red(`Error: Input directory does not exist: ${inputDir}`));
    process.exit(1);
  }

  // Display configuration
  console.log(chalk.gray('Input directory:'), inputDir);
  console.log(chalk.gray('Output directory:'), outputDir);
  console.log();

  // Create spinner
  let spinner: Ora | null = null;

  try {
    // Create Agent
    const agent = new VideoAgent({
      inputDir,
      outputDir,
      videoConfig: {
        model: options.model || runtimeConfig.videoConfig?.model,
        resolution: options.resolution || runtimeConfig.videoConfig?.resolution,
        duration: options.duration
          ? parseInt(String(options.duration))
          : runtimeConfig.videoConfig?.duration || 5,
      },
      callbacks: {
        onStream: (text) => {
          if (spinner) {
            spinner.clear();
          }
          process.stdout.write(text);
        },
        onToolCall: (toolName, args) => {
          if (options.verbose) {
            console.log(chalk.gray(`\n[Tool Call] ${toolName}`));
            if (args && Object.keys(args).length > 0) {
              console.log(chalk.gray(JSON.stringify(args, null, 2)));
            }
          }
        },
        onProgress: (message) => {
          if (spinner) {
            spinner.text = message;
          } else {
            spinner = ora(message).start();
          }
        },
        onError: (error) => {
          if (spinner) {
            spinner.fail(error);
            spinner = null;
          } else {
            console.error(chalk.red(`Error: ${error}`));
          }
        },
        onComplete: (outputPath) => {
          if (spinner) {
            spinner.succeed('Video generation completed!');
            spinner = null;
          }

          if (outputPath) {
            console.log(chalk.green(`\n✅ Video saved: ${outputPath}`));
          }
        },
      },
    });

    // Start generation
    spinner = ora('Initializing...').start();

    const customPrompt = options.prompt || runtimeConfig.prompt;
    const outputPath = await agent.generateVideo(customPrompt);

    if (outputPath) {
      console.log(chalk.green(`\n🎉 Video generation successful!`));
      console.log(chalk.gray(`Output path: ${outputPath}`));
    } else {
      console.log(chalk.yellow('\n⚠️ Video generation completed, but no output path obtained'));
    }
  } catch (error: any) {
    if (spinner) {
      spinner.fail('Generation failed');
    }
    console.error(chalk.red(`\n❌ Error: ${error.message}`));

    if (options.verbose && error.stack) {
      console.error(chalk.gray(error.stack));
    }

    process.exit(1);
  }
}

/**
 * List available models
 */
async function listModels(): Promise<void> {
  console.log(chalk.blue.bold('\n📋 Available Video Generation Models\n'));

  const { getVideoModels } = await import('../agent/tools/video/index.js');

  try {
    const models = await getVideoModels();

    if (models.length === 0) {
      console.log(chalk.yellow('No available video generation models'));
      console.log(chalk.gray('Please check network connection or API configuration'));
      return;
    }

    console.log(chalk.gray('Model Name'.padEnd(30)), chalk.gray('Speed'));
    console.log(chalk.gray('─'.repeat(50)));

    for (const model of models) {
      console.log(model.name.padEnd(30), chalk.cyan(model.speed || 'unknown'));
    }

    console.log();
    console.log(chalk.gray(`Total ${models.length} models available`));
  } catch (error: any) {
    console.error(chalk.red(`Failed to get model list: ${error.message}`));
    process.exit(1);
  }
}

// Parse command line arguments
program.parse();
