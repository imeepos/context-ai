import { Type, type Static } from '@sinclair/typebox';

export type TodoItem = {
  id: number;
  text: string;
  completed: boolean;
};

export const AddTodoParams = Type.Object({
  text: Type.String({ description: 'Todo text' }),
}, { additionalProperties: false });

export const IdParams = Type.Object({
  id: Type.Number({ description: 'Todo ID' }),
}, { additionalProperties: false });

export const EmptyParams = Type.Object({}, { additionalProperties: false });

export type AddTodoParamsType = Static<typeof AddTodoParams>;
export type IdParamsType = Static<typeof IdParams>;
export type EmptyParamsType = Static<typeof EmptyParams>;
