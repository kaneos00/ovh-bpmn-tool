type ErrorResponse = {
  error: string;
  message: string[] | string;
  statusCode: number;
};

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly errorResponse: ErrorResponse,
  ) {
    super(
      Array.isArray(errorResponse?.message)
        ? errorResponse.message.join(', ')
        : errorResponse?.message ||
            `Request failed with status code ${status} ${statusText}`,
    );
    this.name = 'HttpError';
  }

  static is404(error: Error) {
    return error instanceof HttpError && error.status === 404;
  }
}
