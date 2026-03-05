/**
 * Model configuration definitions
 * Consistent with models.json
 */

/** Video generation model configuration */
export const VIDEO_MODELS = {
  veo3: {
    id: 'google-vertex-ai/veo-3.1-generate-001',
    name: 'Veo 3.1',
    description: 'Google latest video generation model, high quality output',
    speed: 'slow',
  },
  veo3Fast: {
    id: 'google-vertex-ai/veo-3.1-fast-generate-001',
    name: 'Veo 3.1 Fast',
    description: 'Google fast video generation model',
    speed: 'fast',
  },
  seedance15: {
    id: 'volcengine/doubao-seedance-1-5-pro-251215',
    name: 'Seedance 1.5 Pro',
    description: 'Volcengine latest video generation model',
    speed: 'medium',
  },
  seedance10Fast: {
    id: 'volcengine/doubao-seedance-1-0-pro-fast-251015',
    name: 'Seedance 1.0 Fast',
    description: 'Volcengine fast video generation model',
    speed: 'fast',
  },
  seedance10: {
    id: 'volcengine/doubao-seedance-1-0-pro-250528',
    name: 'Seedance 1.0 Pro',
    description: 'Volcengine video generation model',
    speed: 'medium',
  },
};

/** Image generation model configuration */
export const IMAGE_MODELS = {
  gemini25Image: {
    id: 'google-vertex-ai/gemini-2.5-flash-image',
    name: 'Gemini 2.5 Flash Image',
    description: 'Google image generation model',
  },
  gemini31Image: {
    id: 'google-vertex-ai/gemini-3.1-flash-image-preview',
    name: 'Gemini 3.1 Flash Image',
    description: 'Google latest image generation model (preview)',
  },
  seedream50: {
    id: 'volcengine/doubao-seedream-5-0-260128',
    name: 'Seedream 5.0',
    description: 'Volcengine image generation model',
  },
  seedream50Lite: {
    id: 'volcengine/doubao-seedream-5-0-lite-260128',
    name: 'Seedream 5.0 Lite',
    description: 'Volcengine lightweight image generation model',
  },
  seedream45: {
    id: 'volcengine/doubao-seedream-4-5-251128',
    name: 'Seedream 4.5',
    description: 'Volcengine image generation model',
  },
  seedream40: {
    id: 'volcengine/doubao-seedream-4-0-250828',
    name: 'Seedream 4.0',
    description: 'Volcengine image generation model',
  },
};

export type VideoModelKey = keyof typeof VIDEO_MODELS;
export type ImageModelKey = keyof typeof IMAGE_MODELS;

export interface VideoModelInfo {
  id: string;
  name: string;
  description: string;
  speed: string;
}

export interface ImageModelInfo {
  id: string;
  name: string;
  description: string;
}
