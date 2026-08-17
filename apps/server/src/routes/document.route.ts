import { Router, Response, NextFunction } from "express";
import {
  createDocument,
  getDocumentMeta,
} from "../services/document.service.js";
import type { DocMeta, CreateDocResponse } from "@repo/types";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware.js";
import { AppError } from "../middleware/error.middleware.js";
import bcrypt from "bcrypt";

const router: Router = Router();

router.post("/", async (req, res) => {
  try {
    const { id } = await createDocument();
    const shareUrl = `${process.env.CLIENT_URL ?? "http://localhost:3000"}/doc/${id}`;
    const response: CreateDocResponse = { id, shareUrl };

    res.status(200).json({
      response,
    });
  } catch (error) {
    console.error("POST [/api/docs]", error);
    res.status(500).json({
      message: "Failed to create Document",
    });
  }
});

router.get(
  "/my",
  authMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const docs = await prisma.document.findMany({
        where: { userId: req.user?.userId },
        select: { id: true, title: true, createdAt: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      });

      res.status(200).json({
        docs,
      });
    } catch (error) {
      console.error("GET [/api/docs/my]", error);
      next(error);
    }
  },
);

router.get("/:id", async (req, res) => {
  try {
    const doc = await getDocumentMeta(req.params.id);
    if (!doc) {
      res.status(404).json({
        message: "Document not found",
      });
      return;
    }
    const response: DocMeta = {
      id: doc.id,
      title: doc.title,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt?.toISOString() || "",
      userId: doc.userId || "",
    };
    res.json(response);
  } catch (error) {
    console.error("GET [/api/docs/:id]", error);
    res.status(500).json({
      message: "failed to get document meta",
    });
  }
});

router.patch(
  "/:id/save",
  authMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const docs = await prisma.document.findUnique({
        where: { id: req.params.id },
        select: { userId: true },
      });

      if(!docs) {
        throw new AppError("Document not found", 404);
      }

      if(docs.userId && docs.userId !== req.user?.userId ) {
        throw new AppError("Document already has an owner", 403);
      }

      await prisma.document.update({
        where: { id: req.params.id },
        data: { userId: req.user?.userId },
      })

      res.status(200).json({
        message: "Saved"
      });
    } catch (error) {
      console.error("PATCH [/api/docs/:id/save]", error);
      next(error);
    }
  },
);

router.patch(
  "/:id/title",
  authMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { title } = req.body;
      if (!title) {
        throw new AppError("Title required.", 400);
      }

      const docs = await prisma.document.update({
        where: { id: req.params.id, userId: req.user?.userId },
        data: { title },
        select: { id: true, title: true },
      });

      res.status(200).json({
        docs,
      });
    } catch (error) {
      console.error("PATCH [/api/docs/:id/title]", error);
      next(error);
    }
  },
);

router.patch(
  "/:id/share",
  authMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { shareMode, password } = req.body;

      if (!["EDIT", "VIEW", "PASSWORD"].includes(shareMode)) {
        throw new AppError("Invalid share mode", 400);
      }

      const hashedPassword = shareMode === "PASSWORD" && password 
          ?  await bcrypt.hash(password, 10)
          : null;

      const doc = await prisma.document.update({
        where: { id: req.params.id, userId: req.user?.userId },
        data: {
          shareMode,
          password: shareMode === "PASSWORD" ? hashedPassword : null,
        },
        select: { id: true, shareMode: true },
      });

      res.json({ doc });
    } catch (error) {
      console.error("PATCH [/api/docs/:id/share]", error);
      next(error);
    }
  },
);

router.get("/:id/share", async (req, res, next: NextFunction) => {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: req.params.id },
      select: { shareMode: true },
    });
    if (!doc) {
      res.status(404).json({ message: "Document not found" });
      return;
    }
    res.json({ shareMode: doc.shareMode });
  } catch (err) {
    console.error("GET [/api/docs/:id/share]", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/:id/verify-password", async (req, res, next: NextFunction) => {
  try {
    const { password } = req.body;
    if (!password) {
      throw new AppError("Password required", 400);
    }
    const doc = await prisma.document.findUnique({
      where: { id: req.params.id },
      select: { password: true, shareMode: true },
    });
    if (!doc) {
     throw new AppError("Document not found", 404);
    }
    if (doc.shareMode !== "PASSWORD") {
      throw new AppError("Document is not password protected", 400);
    }

    const isMatch = await bcrypt.compare(password, doc.password!);
    if (!isMatch) {
      throw new AppError("Incorrect password", 401);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("POST [/api/docs/:id/verify-password]", err);
    next(err);
  }
});

router.delete(
  "/:id",
  authMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await prisma.document.delete({
        where: { id: req.params.id, userId: req.user?.userId },
      });

      res.json({
        message: "Deleted",
      });
    } catch (error) {
      console.error("DELETE [/api/docs/:id]", error);
      next(error);
    }
  },
);

export default router;
