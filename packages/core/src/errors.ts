import { Injectable } from "./injectable";

/**
 * 不可重试的错误
 * 当执行过程中遇到此类错误时，应立即终止并向外抛出，不应进行重试
 */
interface NodeError {
  captureStackTrace(targetObject: object, constructorOpt?: Function): void;
}
const ErrorWithStack = Error as unknown as NodeError & ErrorConstructor;
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    if (typeof ErrorWithStack.captureStackTrace === "function") {
      ErrorWithStack.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      ...(this.meta && { meta: this.meta }),
    };
  }

  static isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
  }
}
export class NoRetryError extends AppError {
  constructor(message: string, readonly cause?: unknown) {
    super(`NoRetryError`, message, 500, { cause });
  }
}


/**
 * Database operation error
 */
export class DatabaseError extends AppError {
  constructor(message: string, operation?: string, originalError?: unknown) {
    const meta: Record<string, unknown> = {};
    if (operation) meta.operation = operation;
    if (originalError) {
      meta.originalError =
        originalError instanceof Error
          ? originalError.message
          : String(originalError);
    }
    super(
      "DATABASE_ERROR",
      message,
      500,
      Object.keys(meta).length > 0 ? meta : undefined,
    );
  }
}

/**
 * External service/API error
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, originalError?: unknown) {
    const meta: Record<string, unknown> = { service };
    if (originalError) {
      meta.originalError =
        originalError instanceof Error
          ? originalError.message
          : String(originalError);
    }
    super("EXTERNAL_SERVICE_ERROR", message, 502, meta);
  }
}

/**
 * Configuration error - missing or invalid configuration
 */
export class ConfigurationError extends AppError {
  constructor(message: string, configKey?: string) {
    super(
      "CONFIGURATION_ERROR",
      message,
      500,
      configKey ? { configKey } : undefined,
    );
  }
}

/**
 * Business rule violation
 */
export class BusinessRuleError extends AppError {
  constructor(message: string, rule?: string, meta?: Record<string, unknown>) {
    super("BUSINESS_RULE_VIOLATION", message, 422, {
      ...(rule && { rule }),
      ...meta,
    });
  }
}



/**
 * 400 Bad Request - Client sent invalid data
 */
export class ValidationError extends AppError {
  constructor(message: string, fields?: Record<string, string>) {
    super("VALIDATION_ERROR", message, 400, fields ? { fields } : undefined);
  }
}

/**
 * 400 Bad Request - 客户端请求错误（通用）
 *
 * 存在即合理：
 * - ValidationError 用于数据验证错误（带字段详情）
 * - BadRequestError 用于通用请求错误（不涉及字段验证）
 *
 * 使用场景：
 * - 参数缺失："工作流名称不能为空"
 * - 逻辑错误："必须提供 workflow 或 ast 字段"
 * - 状态错误："运行实例状态不正确"
 */
export class BadRequestError extends AppError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super("BAD_REQUEST", message, 400, meta);
  }
}

/**
 * 401 Unauthorized - Authentication required
 */
export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super("UNAUTHORIZED", message, 401);
  }
}

/**
 * 403 Forbidden - Authenticated but not authorized
 */
export class ForbiddenError extends AppError {
  constructor(message = "Access forbidden") {
    super("FORBIDDEN", message, 403);
  }
}

/**
 * 404 Not Found - Resource does not exist
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super("NOT_FOUND", message, 404, { resource, identifier });
  }
}

/**
 * 409 Conflict - Resource already exists or conflict with current state
 */
export class ConflictError extends AppError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super("CONFLICT", message, 409, meta);
  }
}

/**
 * 422 Unprocessable Entity - Request well-formed but semantically invalid
 */
export class UnprocessableEntityError extends AppError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super("UNPROCESSABLE_ENTITY", message, 422, meta);
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class RateLimitError extends AppError {
  constructor(message = "Rate limit exceeded", retryAfter?: number) {
    super(
      "RATE_LIMIT_EXCEEDED",
      message,
      429,
      retryAfter ? { retryAfter } : undefined,
    );
  }
}

/**
 * 500 Internal Server Error - Unexpected server error
 */
export class InternalError extends AppError {
  constructor(message: string, originalError?: unknown) {
    const meta = originalError
      ? {
        originalError:
          originalError instanceof Error
            ? originalError.message
            : String(originalError),
      }
      : undefined;
    super("INTERNAL_ERROR", message, 500, meta);
  }
}

/**
 * 503 Service Unavailable - Service temporarily unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(
    message = "Service temporarily unavailable",
    retryAfter?: number,
  ) {
    super(
      "SERVICE_UNAVAILABLE",
      message,
      503,
      retryAfter ? { retryAfter } : undefined,
    );
  }
}


@Injectable()
export class ErrorFactory {

  /**
   * Create a validation error (400)
   * @param message - Error message
   * @param fields - Optional field-specific validation errors
   */
  validation(message: string, fields?: Record<string, string>) {
    return new ValidationError(message, fields);
  }

  /**
   * Create an unauthorized error (401)
   * @param message - Optional custom message
   */
  unauthorized(message?: string) {
    return new UnauthorizedError(message);
  }

  /**
   * Create a forbidden error (403)
   * @param message - Optional custom message
   */
  forbidden(message?: string) {
    return new ForbiddenError(message);
  }

  /**
   * Create a not found error (404)
   * @param resource - Resource type (e.g., 'User', 'Post')
   * @param identifier - Optional resource identifier
   */
  notFound(resource: string, identifier?: string) {
    return new NotFoundError(resource, identifier);
  }

  /**
   * Create a conflict error (409)
   * @param message - Error message
   * @param meta - Optional additional context
   */
  conflict(message: string, meta?: Record<string, unknown>) {
    return new ConflictError(message, meta);
  }

  /**
   * Create an unprocessable entity error (422)
   * @param message - Error message
   * @param meta - Optional additional context
   */
  unprocessable(message: string, meta?: Record<string, unknown>) {
    return new UnprocessableEntityError(message, meta);
  }

  /**
   * Create a rate limit error (429)
   * @param message - Optional custom message
   * @param retryAfter - Optional retry after seconds
   */
  rateLimit(message?: string, retryAfter?: number) {
    return new RateLimitError(message, retryAfter);
  }

  /**
   * Create an internal server error (500)
   * @param message - Error message
   * @param originalError - Optional original error that caused this
   */
  internal(message: string, originalError?: unknown) {
    return new InternalError(message, originalError);
  }

  /**
   * Create a service unavailable error (503)
   * @param message - Optional custom message
   * @param retryAfter - Optional retry after seconds
   */
  unavailable(message?: string, retryAfter?: number) {
    return new ServiceUnavailableError(message, retryAfter);
  }

  /**
   * Create a database error (500)
   * @param message - Error message
   * @param operation - Optional database operation
   * @param originalError - Optional original error
   */
  database(message: string, operation?: string, originalError?: unknown) {
    return new DatabaseError(message, operation, originalError);
  }

  /**
   * Create an external service error (502)
   * @param service - Service name
   * @param message - Error message
   * @param originalError - Optional original error
   */
  externalService(
    service: string,
    message: string,
    originalError?: unknown,
  ) {
    return new ExternalServiceError(service, message, originalError);
  }

  /**
   * Create a configuration error (500)
   * @param message - Error message
   * @param configKey - Optional configuration key
   */
  configuration(message: string, configKey?: string) {
    return new ConfigurationError(message, configKey);
  }

  /**
   * Create a business rule violation error (422)
   * @param message - Error message
   * @param rule - Optional rule identifier
   * @param meta - Optional additional context
   */
  businessRule(
    message: string,
    rule?: string,
    meta?: Record<string, unknown>,
  ) {
    return new BusinessRuleError(message, rule, meta);
  }
}

export const errorFactory = new ErrorFactory()

/**
 * 别名导出（兼容 NestJS 习惯）
 *
 * 注意：建议使用 *Error 后缀，但提供别名以兼容现有代码
 */
export const BadRequestException = BadRequestError;
export const NotFoundException = NotFoundError;
export const UnauthorizedException = UnauthorizedError;
export const ForbiddenException = ForbiddenError;
