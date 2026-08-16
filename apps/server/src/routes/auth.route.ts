import { Request, Response, Router, NextFunction } from "express";
import {
  registerUser,
  loginUser,
  generateAccessToken,
  generateRefreshToken,
  validateRefreshToken,
  deleteRefreshToken,
  saveRefreshToken,
} from "../services/auth.service.js";
import { authRateLimit } from "../middleware/ratelimiter.middleware.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { authSchema } from "../validator/auth.validator.js";
import { AppError } from "../middleware/error.middleware.js";

export const authRouter: Router = Router();

const IS_PROD = process.env.NODE_ENV === "production";

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: IS_PROD ? "none" as const : "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: IS_PROD ? "none" as const : "lax" as const,
  maxAge: 15 * 60 * 1000,
};

authRouter.post(
  "/register",
  authRateLimit,
  validate(authSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      const user = await registerUser(email, password);
      const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
      });
      const refreshToken = generateRefreshToken({
        userId: user.id,
        email: user.email,
      });

      await saveRefreshToken(user.id, refreshToken);

      res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
      res.cookie("accessToken", accessToken, ACCESS_COOKIE_OPTIONS);

      res.status(201).json({
        message: "Register successfully",
        user: { id: user.id, email: user.email },
      });
    } catch (err: any) {
      if (err.message === "EMAIL_TAKEN") {
        return next(new AppError("Email already taken", 409));
      }
      console.error("POST /api/auth/register", err);
      next(err);
    }
  },
);

authRouter.post(
  "/login",
  authRateLimit,
  validate(authSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      const user = await loginUser(email, password);
      const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
      });
      const refreshToken = generateRefreshToken({
        userId: user.id,
        email: user.email,
      });

      await saveRefreshToken(user.id, refreshToken);

      res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
      res.cookie("accessToken", accessToken, ACCESS_COOKIE_OPTIONS);

      res.status(201).json({
        message: "Login successfully",
        user: { id: user.id, email: user.email },
      });
    } catch (err: any) {
      if (err.message === "INVALID_CREDENTIALS") {
        return next(new AppError("Invalid Email or Password", 401));
      }
      console.error("POST /api/auth/login", err);
      next(err);
    }
  },
);

authRouter.post(
  "/refresh",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.refreshToken;

      if (!token) {
        throw new AppError("No Token Provided", 401);
      }

      const user = await validateRefreshToken(token);

      await deleteRefreshToken(token);
      const newToken = generateRefreshToken({
        userId: user.id,
        email: user.email,
      });
      await saveRefreshToken(user.id, newToken);

      const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
      });

      res.cookie("refreshToken", newToken, REFRESH_COOKIE_OPTIONS);
      res.cookie("accessToken", accessToken, ACCESS_COOKIE_OPTIONS);
      
      res.status(200).json({ message: "Token refreshed successfully" });
    } catch (err: any) {
      res.clearCookie("refreshToken");
      res.clearCookie("accessToken");
      if (err.message === "TOKEN_EXPIRED") {
        return next(new AppError("Refresh token expired, please login again", 401));
      }
      return next(new AppError("Invalid refresh token", 401));
    }
  }
);

authRouter.post("/logout", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies?.refreshToken;

        if(token) {
            await deleteRefreshToken(token).catch(() => {});
        }

        res.clearCookie("refreshToken");
        res.clearCookie("accessToken");
        res.status(200).json({ message: "Logout Successfully" });
    } catch (err: any) {
        next(err);
    }

});

authRouter.get("/me", authMiddleware, (req: AuthRequest, res: Response) => {
    res.status(200).json({ user: req.user });
});

