import type {
    OSService,
    ServiceRequest,
    ServiceResponse,
    Token,
} from "../types/os.js";

export type { Token } from "../types/os.js";

/**
 * Creates a typed token for a service operation.
 * Tokens are string identifiers that carry type information for request/response pairs.
 */
export const token =
    <Request, Response, Name extends string>(name: Name): Token<Request, Response, Name> =>
        name as Token<Request, Response, Name>;

/**
 * Extracts the request type from a service factory function.
 */
export type RequestOf<TFactory extends (...args: never[]) => OSService<unknown, unknown, string>> = ServiceRequest<ReturnType<TFactory>>;

/**
 * Extracts the response type from a service factory function.
 */
export type ResponseOf<TFactory extends (...args: never[]) => OSService<unknown, unknown, string>> = ServiceResponse<ReturnType<TFactory>>;
