import type { Application } from "../../tokens.js";
import { DetailFactory, DetailPropsSchema } from "./detail.js";
import { ListFactory, ListPropsSchema } from "./list.js";

export default {
    name: "app",
    description: "OS Applications Manager",
    version: "1.0.0",
    pages: [
        {
            name: 'list',
            description: 'os application list',
            path: 'app://list',
            props: ListPropsSchema,
            factory: ListFactory
        },
        {
            name: 'detail',
            description: 'os application detail',
            path: 'app://detail/:path',
            props: DetailPropsSchema,
            factory: DetailFactory
        },
    ],
    providers: [],
} as Application