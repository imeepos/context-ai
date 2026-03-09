import React from 'react';
import type { ComponentFactory } from '../../tokens.js';
import { Type, type Static } from '@sinclair/typebox';
export const ListPropsSchema = Type.Object({
    keywords: Type.String({ description: '检索关键字' })
})
export type ListProps = Static<typeof ListPropsSchema>;
export const ListFactory: ComponentFactory<ListProps> = async (_props: ListProps) => {
    return <></>
}