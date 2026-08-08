import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { AppError } from "./error.middleware.js";

/**
 * Returns Express middleware that validates `req.body` against a Zod schema.
 *
 * On success, replaces `req.body` with the parsed (and coerced) data.
 * On failure, passes a 400 `AppError` to the next error handler with a
 * human-readable summary of every validation issue.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return next(new AppError(message, 400));
    }
    req.body = result.data;
    next();
  };
}
