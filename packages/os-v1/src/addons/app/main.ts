import { Type } from "@mariozechner/pi-ai";
import type { Page } from "../../tokens.js";

export default [
    {
        name: 'list',
        description: 'os application list',
        path: './application/list',
        props: Type.Object({
            keywords: Type.String({ title: 'Keywords', description: 'Search keywords' }),
        })
    },
    {
        name: 'detail',
        description: 'os application detail',
        path: './application/detail',
        props: Type.Object({
            name: Type.String({ title: 'Application Name', description: 'Name of the application' }),
        })
    },
] as Page[];