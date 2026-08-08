import { verifyAccessToken, TokenPayload } from "../services/auth.service.js";
import { Request, Response, NextFunction } from "express";

/** Extends Express's `Request` with the decoded JWT payload after authentication. */
export interface AuthRequest extends Request {
    user?: TokenPayload;
}

/**
 * Middleware that requires a valid access token.
 *
 * Accepts the token from either the `accessToken` cookie or an
 * `Authorization: Bearer <token>` header. Returns 401 if missing or invalid.
 */
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
    const cookieToken = req.cookies?.accessToken;
    const headers = req.headers.authorization;
    const headerToken = headers?.startsWith("Bearer ") ? headers.split(" ")[1] : null;

    const token = cookieToken ?? headerToken;

    if(!token) {
        res.status(401).json({
            message: "No Token Provided"
        })
        return;
    }

    try {
        const payload = verifyAccessToken(token!);
        req.user = payload;
        next();
    } catch {
        res.status(401).json({
            message: "Invalid or expired token"
        });
    }
}

/**
 * Middleware that attempts to decode an access token but does not block the
 * request if it is absent or invalid. When present and valid, `req.user` is
 * populated so downstream handlers can distinguish authenticated users from
 * anonymous guests.
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
    const headers = req.headers.authorization;

    if(!headers || !headers.startsWith("Bearer ")) {
        next();
        return; 
    }

    const token = headers.split(" ")[1];

    try {
        const payload = verifyAccessToken(token!);
        req.user = payload;
    } catch {
        // Invalid token — continue as unauthenticated.
    }

    next();
}