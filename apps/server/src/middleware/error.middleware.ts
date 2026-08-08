import { Request, Response, NextFunction } from "express";

/**
 * A typed application error that carries an HTTP status code alongside the
 * message. Throw this anywhere in the request lifecycle to produce a
 * structured JSON error response via `errorHandler`.
 */
export class AppError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
    }
}

/**
 * Global Express error-handling middleware.
 *
 * `AppError` instances are serialized with their own status code. All other
 * unexpected errors fall through to a generic 500 response so internal
 * details are never leaked to the client.
 */
export function errorHandler(
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    if(err instanceof AppError) {
        res.status(err.statusCode).json({
            message: err.message
        });
        return;
    }

    console.log(err);
    res.status(500).json({
        message: "INTERNAL_SERVER_ERROR"
    });
}