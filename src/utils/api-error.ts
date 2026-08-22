export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }

  static badRequest(code: string, message: string): ApiError {
    return new ApiError(400, code, message);
  }

  static unauthorized(message = "Authentication is required"): ApiError {
    return new ApiError(401, "UNAUTHENTICATED", message);
  }

  static notFound(code: string, message: string): ApiError {
    return new ApiError(404, code, message);
  }
}
