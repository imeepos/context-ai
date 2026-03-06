import { Injectable } from "./injectable";
import { createLogger, Logger } from "./logger";

@Injectable()
export class ErrorHandler {
    logger: Logger = createLogger('ErrorHandler')
    handle(error: unknown) {
        this.logger.error(error)
    }
}
