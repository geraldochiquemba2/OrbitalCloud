import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { z } from "zod";
import { insertUserSchema, insertFileSchema, insertFolderSchema, insertShareSchema } from "@shared/schema";
import crypto from "crypto";
import multer, { type Multer } from "multer";

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB limit
});

// Hash password
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Extend Express Request to include user and file
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      nome: string;
      plano: string;
      storageLimit: number;
      storageUsed: number;
    }
    
    interface Request {
      file?: Multer.File;
    }
  }
}

// Configure passport
passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return done(null, false, { message: "Email ou senha incorretos" });
        }

        const hashedPassword = hashPassword(password);
        if (user.passwordHash !== hashedPassword) {
          return done(null, false, { message: "Email ou senha incorretos" });
        }

        return done(null, {
          id: user.id,
          email: user.email,
          nome: user.nome,
          plano: user.plano,
          storageLimit: user.storageLimit,
          storageUsed: user.storageUsed,
        });
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUser(id);
    if (!user) {
      return done(null, false);
    }
    done(null, {
      id: user.id,
      email: user.email,
      nome: user.nome,
      plano: user.plano,
      storageLimit: user.storageLimit,
      storageUsed: user.storageUsed,
    });
  } catch (error) {
    done(error);
  }
});

// Auth middleware
function requireAuth(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Não autorizado" });
}

// Get storage limits by plan
function getStorageLimitByPlan(plano: string): number {
  const limits: Record<string, number> = {
    gratis: 15 * 1024 * 1024 * 1024, // 15GB
    plus: 100 * 1024 * 1024 * 1024, // 100GB
    pro: 500 * 1024 * 1024 * 1024, // 500GB
    empresas: Number.MAX_SAFE_INTEGER, // Unlimited
  };
  return limits[plano] || limits.gratis;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Configure session
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "angocloud-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // ========== AUTH ROUTES ==========

  // Register
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(6),
        nome: z.string().min(2),
      });

      const { email, password, nome } = schema.parse(req.body);

      // Check if user exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email já está em uso" });
      }

      // Create user
      const user = await storage.createUser({
        email,
        passwordHash: hashPassword(password),
        nome,
        plano: "gratis",
      });

      // Auto login
      req.login(
        {
          id: user.id,
          email: user.email,
          nome: user.nome,
          plano: user.plano,
          storageLimit: user.storageLimit,
          storageUsed: user.storageUsed,
        },
        (err) => {
          if (err) {
            return res.status(500).json({ message: "Erro ao fazer login" });
          }
          res.json({
            id: user.id,
            email: user.email,
            nome: user.nome,
            plano: user.plano,
            storageLimit: user.storageLimit,
            storageUsed: user.storageUsed,
          });
        }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar conta" });
    }
  });

  // Login
  app.post("/api/auth/login", (req: Request, res: Response, next) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao fazer login" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Credenciais inválidas" });
      }
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Erro ao fazer login" });
        }
        res.json(user);
      });
    })(req, res, next);
  });

  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      res.json({ message: "Logout realizado com sucesso" });
    });
  });

  // Get current user
  app.get("/api/auth/me", requireAuth, (req: Request, res: Response) => {
    res.json(req.user);
  });

  // ========== FILES ROUTES ==========

  // Get all files for current user
  app.get("/api/files", requireAuth, async (req: Request, res: Response) => {
    try {
      const folderId = req.query.folderId as string | undefined;
      const files = await storage.getFilesByFolder(
        folderId || null,
        req.user!.id
      );
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar arquivos" });
    }
  });

  // Search files
  app.get("/api/files/search", requireAuth, async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Query é obrigatório" });
      }
      const files = await storage.searchFiles(req.user!.id, query);
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar arquivos" });
    }
  });

  // Upload file (placeholder - Telegram integration needed)
  app.post("/api/files/upload", requireAuth, upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }

      const user = req.user!;
      const fileSize = req.file.size;

      // Check storage quota
      if (user.storageUsed + fileSize > user.storageLimit) {
        return res.status(400).json({ 
          message: "Quota de armazenamento excedida",
          storageUsed: user.storageUsed,
          storageLimit: user.storageLimit,
        });
      }

      // TODO: Upload to Telegram Bot
      // For now, we'll simulate it
      const telegramFileId = `temp_${Date.now()}_${req.file.originalname}`;

      const folderId = req.body.folderId || null;

      const file = await storage.createFile({
        userId: user.id,
        folderId,
        nome: req.file.originalname,
        tamanho: fileSize,
        tipoMime: req.file.mimetype,
        telegramFileId,
        telegramBotId: "bot_placeholder",
      });

      // Update user storage
      await storage.updateUserStorage(user.id, fileSize);

      res.json(file);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Erro ao fazer upload" });
    }
  });

  // Delete file (move to trash)
  app.delete("/api/files/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const file = await storage.getFile(req.params.id);
      if (!file || file.userId !== req.user!.id) {
        return res.status(404).json({ message: "Arquivo não encontrado" });
      }

      await storage.moveToTrash(req.params.id);
      res.json({ message: "Arquivo movido para a lixeira" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar arquivo" });
    }
  });

  // Rename file
  app.patch("/api/files/:id/rename", requireAuth, async (req: Request, res: Response) => {
    try {
      const file = await storage.getFile(req.params.id);
      if (!file || file.userId !== req.user!.id) {
        return res.status(404).json({ message: "Arquivo não encontrado" });
      }

      const { nome } = z.object({ nome: z.string().min(1) }).parse(req.body);
      await storage.renameFile(req.params.id, nome);
      res.json({ message: "Arquivo renomeado com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao renomear arquivo" });
    }
  });

  // Move file
  app.patch("/api/files/:id/move", requireAuth, async (req: Request, res: Response) => {
    try {
      const file = await storage.getFile(req.params.id);
      if (!file || file.userId !== req.user!.id) {
        return res.status(404).json({ message: "Arquivo não encontrado" });
      }

      const { folderId } = z.object({ folderId: z.string().nullable() }).parse(req.body);
      await storage.moveFile(req.params.id, folderId);
      res.json({ message: "Arquivo movido com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao mover arquivo" });
    }
  });

  // ========== FOLDERS ROUTES ==========

  // Get all folders for current user
  app.get("/api/folders", requireAuth, async (req: Request, res: Response) => {
    try {
      const parentId = req.query.parentId as string | undefined;
      const folders = await storage.getFoldersByParent(
        parentId || null,
        req.user!.id
      );
      res.json(folders);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar pastas" });
    }
  });

  // Create folder
  app.post("/api/folders", requireAuth, async (req: Request, res: Response) => {
    try {
      const { nome, parentId } = z.object({
        nome: z.string().min(1),
        parentId: z.string().nullable().optional(),
      }).parse(req.body);

      const folder = await storage.createFolder({
        userId: req.user!.id,
        nome,
        parentId: parentId || null,
      });

      res.json(folder);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar pasta" });
    }
  });

  // Delete folder
  app.delete("/api/folders/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const folder = await storage.getFolder(req.params.id);
      if (!folder || folder.userId !== req.user!.id) {
        return res.status(404).json({ message: "Pasta não encontrada" });
      }

      await storage.deleteFolder(req.params.id);
      res.json({ message: "Pasta deletada com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar pasta" });
    }
  });

  // Rename folder
  app.patch("/api/folders/:id/rename", requireAuth, async (req: Request, res: Response) => {
    try {
      const folder = await storage.getFolder(req.params.id);
      if (!folder || folder.userId !== req.user!.id) {
        return res.status(404).json({ message: "Pasta não encontrada" });
      }

      const { nome } = z.object({ nome: z.string().min(1) }).parse(req.body);
      await storage.renameFolder(req.params.id, nome);
      res.json({ message: "Pasta renomeada com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao renomear pasta" });
    }
  });

  // ========== SHARES ROUTES ==========

  // Create share link
  app.post("/api/shares", requireAuth, async (req: Request, res: Response) => {
    try {
      const { fileId } = z.object({ fileId: z.string() }).parse(req.body);

      const file = await storage.getFile(fileId);
      if (!file || file.userId !== req.user!.id) {
        return res.status(404).json({ message: "Arquivo não encontrado" });
      }

      // Generate unique link code
      const linkCode = crypto.randomBytes(16).toString("hex");

      const share = await storage.createShare({
        fileId,
        linkCode,
        passwordHash: null,
        expiresAt: null,
      });

      res.json(share);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar link de compartilhamento" });
    }
  });

  // Get share by link code
  app.get("/api/shares/:linkCode", async (req: Request, res: Response) => {
    try {
      const share = await storage.getShareByLinkCode(req.params.linkCode);
      if (!share) {
        return res.status(404).json({ message: "Link não encontrado" });
      }

      // Check expiration
      if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
        return res.status(410).json({ message: "Link expirado" });
      }

      const file = await storage.getFile(share.fileId);
      if (!file) {
        return res.status(404).json({ message: "Arquivo não encontrado" });
      }

      res.json({ share, file });
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar compartilhamento" });
    }
  });

  return httpServer;
}
