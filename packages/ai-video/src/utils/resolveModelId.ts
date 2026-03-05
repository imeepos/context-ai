import type { BaseModelInfo } from './models.js';

export function resolveModelId<T extends BaseModelInfo>(
  model: string | undefined,
  models: Record<string, T>,
  fallbackModelId: string
): string {
  if (!model) {
    return fallbackModelId;
  }

  for (const item of Object.values(models) as T[]) {
    if (item.id === model || item.name === model) {
      return item.id;
    }
  }

  return model;
}
