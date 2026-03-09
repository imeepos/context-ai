import type { Injector, Provider } from "@context-ai/core";
import { PAGES, type Page, type PageFactory } from "./tokens.js";
import type { Static, TSchema } from "@mariozechner/pi-ai";
import { render } from '@context-ai/ctp'

export function createPageFactory<TParameters extends TSchema = TSchema>(page: Page<TParameters>): Provider {
    return {
        provide: PAGES,
        multi: true,
        useValue: {
            path: page.path,
            create: async (props: Static<TParameters>, injector: Injector) => {
                const element = await page.factory(props, injector)
                const ctx = await render(element)
                return ctx;
            }
        } as PageFactory
    }
}