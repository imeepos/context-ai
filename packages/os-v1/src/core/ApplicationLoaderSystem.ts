import type { Application, ApplicationLoader } from "../tokens.js";
import app from '../addons/app/index.js'
import scheduler from '../addons/scheduler/index.js'
import bowong from "../addons/bowong/index.js";
import novel from "../addons/novel/index.js";


export class ApplicationLoaderSystem implements ApplicationLoader {
    async load(): Promise<Application[]> {
        return [app, scheduler, bowong, novel]
    }
}
