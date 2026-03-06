/**
 * 错误序列化器
 *
 * 存在即合理：
 * - 将 Error 对象转换为可 JSON 序列化的结构
 * - 完整保留错误上下文（type, statusCode, response 等）
 * - 深度提取错误链中的关键信息
 *
 * 优雅即简约：
 * - 统一的序列化接口
 * - 智能提取错误原因链
 * - 前后端使用同一种格式
 */

export interface SerializedError {
  message: string
  name: string
  type?: string
  statusCode?: number
  response?: any
  stack?: string
  cause?: SerializedError
  originalError?: any
}

export class ErrorSerializer {
  /**
   * 序列化单个错误对象
   *
   * 提取所有可序列化的属性，包括：
   * - Error 的 message, name, stack
   * - 自定义属性（type, statusCode, response）
   * - 嵌套的 cause 错误链
   */
  static serialize(error: unknown, includeStack = false): SerializedError {
    if (!error) {
      return {
        message: '未知错误',
        name: 'UnknownError',
      }
    }

    if (this.isSerializedError(error)) {
      return error as SerializedError
    }

    if (error instanceof Error) {
      const rawMessage = error.message || error.toString()
      const serialized: SerializedError = {
        message: typeof rawMessage === 'string' ? rawMessage : JSON.stringify(rawMessage),
        name: error.name || 'Error',
        ...(includeStack && error.stack && { stack: error.stack }),
      }

      const errorObj = error as Record<string, any>
      if (errorObj.type) serialized.type = errorObj.type
      if (errorObj.statusCode) serialized.statusCode = errorObj.statusCode
      if (errorObj.response) serialized.response = errorObj.response
      if (errorObj.originalError) serialized.originalError = errorObj.originalError

      if (errorObj.cause) {
        serialized.cause = this.serialize(errorObj.cause, includeStack)
      }

      return serialized
    }

    if (typeof error === 'object') {
      const obj = error as Record<string, any>
      const rawMessage = obj.message || String(error)
      return {
        message: typeof rawMessage === 'string' ? rawMessage : JSON.stringify(rawMessage),
        name: obj.name || 'Error',
        type: obj.type,
        statusCode: obj.statusCode,
        response: obj.response,
      }
    }

    return {
      message: String(error),
      name: 'Error',
    }
  }

  /**
   * 检查是否已经是序列化的错误格式
   */
  private static isSerializedError(obj: any): obj is SerializedError {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.message === 'string' &&
      typeof obj.name === 'string' &&
      !obj.stack
    )
  }

  /**
   * 从错误链中提取最深层的真实错误信息
   *
   * 用途：前端显示时，显示最有用的错误信息
   */
  static extractDeepestError(error: SerializedError): SerializedError {
    if (error.cause) {
      return this.extractDeepestError(error.cause)
    }
    return error
  }

  /**
   * 获取完整的错误描述（包含链）
   *
   * 例如：
   * "NoRetryError: 登录态已过期 (caused by) WeiboError: API 返回错误"
   */
  static getFullDescription(error: SerializedError): string {
    const parts = [error.message]
    if (error.cause) {
      const causeDesc = this.getFullDescription(error.cause)
      parts.push(`caused by: ${causeDesc}`)
    }
    return parts.join(' ')
  }
}
