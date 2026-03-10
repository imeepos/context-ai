import type { Injector, Provider } from "@context-ai/core";
import { PAGES, type Page, type PageFactory } from "./tokens.js";
import type { Static, TSchema } from "@mariozechner/pi-ai";
import { render } from '@context-ai/ctp'
import type { RenderedContext } from '@context-ai/ctp'

export function createPageFactory<TParameters extends TSchema = TSchema>(page: Page<TParameters>): Provider {
    return {
        provide: PAGES,
        multi: true,
        useValue: {
            path: page.path,
            create: async (props: Static<TParameters>, injector: Injector): Promise<RenderedContext> => {
                const element = await page.factory(props, injector);

                // 处理字符串返回值（测试场景）
                if (typeof element === 'string') {
                    return {
                        name: page.name,
                        description: page.description,
                        prompt: element,
                        tools: [],
                        dataViews: [],
                        metadata: {}
                    } as RenderedContext;
                }

                // 处理 JSXElement 返回值（正常场景）
                return await render(element);
            }
        } as PageFactory
    }
}