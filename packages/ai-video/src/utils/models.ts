export interface BaseModelInfo {
    id: string;
    name: string;
    description: string;
    provider: string;
    capabilities?: string[];
    useCases?: string[];
}

export interface LlmModelInfo extends BaseModelInfo {
    supportsImageUnderstanding?: boolean;
}

export interface VideoModelInfo extends BaseModelInfo {
    speed: string;
}

export interface ImageModelInfo extends BaseModelInfo { }

/** LLM model configuration */
export const LLM_MODELS = {
    gpt52Chat: {
        id: 'azure/gpt-5.2-chat',
        name: 'GPT-5.2 Chat',
        description: 'Azure OpenAI GPT-5.2, high quality chat model',
        provider: 'azure',
        capabilities: ['chat', 'reasoning'],
        useCases: ['planning', 'analysis'],
        supportsImageUnderstanding: false,
    },
    gemini3Pro: {
        id: 'google-vertex-ai/gemini-3-pro-preview',
        name: 'Gemini 3 Pro',
        description: 'Google Gemini 3 Pro, latest multimodal model (preview)',
        provider: 'google-vertex-ai',
        capabilities: ['multimodal', 'reasoning'],
        useCases: ['script-writing', 'vision-understanding'],
        supportsImageUnderstanding: true,
    },
} as const satisfies Record<string, LlmModelInfo>;

/** Video model configuration */
export const VIDEO_MODELS = {
    veo3: {
        id: 'google-vertex-ai/veo-3.1-generate-001',
        name: 'Veo 3.1',
        description: 'Google latest video generation model, high quality output',
        speed: 'slow',
        provider: 'google-vertex-ai',
        capabilities: ['text-to-video'],
        useCases: ['high-fidelity scenes'],
    },
    veo3Fast: {
        id: 'google-vertex-ai/veo-3.1-fast-generate-001',
        name: 'Veo 3.1 Fast',
        description: 'Google fast video generation model',
        speed: 'fast',
        provider: 'google-vertex-ai',
        capabilities: ['text-to-video'],
        useCases: ['rapid iteration'],
    }
} as const satisfies Record<string, VideoModelInfo>;

/** Image model configuration */
export const IMAGE_MODELS = {
    seedream50: {
        id: 'volcengine/doubao-seedream-5-0-260128',
        name: 'Seedream 5.0',
        description: 'Volcengine image generation model, high quality',
        provider: 'volcengine',
        capabilities: ['text-to-image'],
        useCases: ['style references'],
    },
    seedream50Lite: {
        id: 'volcengine/doubao-seedream-5-0-lite-260128',
        name: 'Seedream 5.0 Lite',
        description: 'Volcengine lightweight image generation model, fast',
        provider: 'volcengine',
        capabilities: ['text-to-image'],
        useCases: ['quick previews'],
    },
    gemini25Image: {
        id: 'google-vertex-ai/gemini-2.5-flash-image',
        name: 'Gemini 2.5 Flash Image',
        description: 'Google image generation model',
        provider: 'google-vertex-ai',
        capabilities: ['text-to-image'],
        useCases: ['concept art'],
    },
} as const satisfies Record<string, ImageModelInfo>;
