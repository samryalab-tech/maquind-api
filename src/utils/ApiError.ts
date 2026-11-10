/** Error de aplicación con código HTTP y código de negocio opcional. */
export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message = 'Solicitud inválida', details?: unknown) {
    return new ApiError(400, message, 'BAD_REQUEST', details);
  }
  static unauthorized(message = 'No autenticado') {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }
  static forbidden(message = 'No tienes permisos para esta acción') {
    return new ApiError(403, message, 'FORBIDDEN');
  }
  static notFound(message = 'Recurso no encontrado') {
    return new ApiError(404, message, 'NOT_FOUND');
  }
  static conflict(message = 'Conflicto con el estado actual del recurso') {
    return new ApiError(409, message, 'CONFLICT');
  }
  static tooMany(message = 'Demasiadas solicitudes, intenta más tarde') {
    return new ApiError(429, message, 'TOO_MANY_REQUESTS');
  }
  static internal(message = 'Error interno del servidor') {
    return new ApiError(500, message, 'INTERNAL_ERROR');
  }
}
