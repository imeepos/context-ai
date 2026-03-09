import type { Application } from "../../tokens.js";
import { DetailFactory, DetailPropsSchema } from "./detail.js";
import { ListFactory, ListPropsSchema } from "./list.js";

export default {
    name: "apps",
    description: "Manages installed applications in the system. Use this when the user asks about available applications, wants to browse the app list, or needs details about a specific application.",
    version: "1.0.0",
    pages: [
        {
            name: 'application-list',
            description: 'Displays all installed applications in a table format. Supports keyword filtering. Use when user asks "what apps are installed", "show me the applications", or wants to search for apps.',
            path: 'apps://list',
            props: ListPropsSchema,
            factory: ListFactory
        },
        {
            name: 'application-detail',
            description: 'Shows detailed information about a specific application including description, version, and available pages. The appName parameter is the application name. Use when user wants to know more about a particular app.',
            path: 'apps://detail/:appName',
            props: DetailPropsSchema,
            factory: DetailFactory
        },
    ],
    providers: [],
} as Application