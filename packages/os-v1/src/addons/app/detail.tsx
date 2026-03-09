import { Type, type Static } from '@sinclair/typebox';
import React from 'react';
import type { ComponentFactory } from '../../tokens.js';
export const DetailPropsSchema = Type.Object({
    path: Type.String({ description: '页面路由' })
})
export type DetailProps = Static<typeof DetailPropsSchema>;
export const DetailFactory: ComponentFactory<DetailProps> = async (_props: DetailProps) => {
    return <></>
}