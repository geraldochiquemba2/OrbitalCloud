/**
 * Admin Routes for Cloudflare Workers
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { createDb } from '../db';
import { authMiddleware, adminMiddleware, JWTPayload } from '../middleware/auth';
import { TelegramService } from '../services/telegram';
import { users, files, folders, upgradeRequests, PLANS } from '../../../shared/schema';
import { eq, desc, sql, ne, and, inArray } from 'drizzle-orm';

interface Env {
  DATABASE_URL: string;
  JWT_SECRET: string;
  TELEGRAM_BOT_1_TOKEN?: string;
  TELEGRAM_BOT_2_TOKEN?: string;
  TELEGRAM_BOT_3_TOKEN?: string;
  TELEGRAM_BOT_4_TOKEN?: string;
  TELEGRAM_BOT_5_TOKEN?: string;
  TELEGRAM_STORAGE_CHAT_ID?: string;
}

export const adminRoutes = new Hono<{ Bindings: Env }>();

adminRoutes.use('*', authMiddleware, adminMiddleware);

adminRoutes.get('/stats', async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL);

    const [userCount] = await db.select({ count: sql`count(*)` }).from(users);
    const [fileCount] = await db.select({ count: sql`count(*)` }).from(files);

    return c.json({
      totalUsers: Number(userCount?.count || 0),
      totalFiles: Number(fileCount?.count || 0),
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return c.json({ message: 'Erro ao buscar estatísticas' }, 500);
  }
});

adminRoutes.get('/users', async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL);

    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));

    const safeUsers = allUsers.map(user => ({
      id: user.id,
      email: user.email,
      nome: user.nome,
      plano: user.plano,
      storageLimit: Number(user.storageLimit),
      storageUsed: Number(user.storageUsed),
      uploadsCount: user.uploadsCount,
      uploadLimit: user.uploadLimit,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
    }));

    return c.json(safeUsers);
  } catch (error) {
    console.error('Get users error:', error);
    return c.json({ message: 'Erro ao buscar utilizadores' }, 500);
  }
});

adminRoutes.patch('/users/:id/admin', async (c) => {
  try {
    const currentUser = c.get('user') as JWTPayload;
    const userId = c.req.param('id');
    const { isAdmin } = await c.req.json();

    if (userId === currentUser.id) {
      return c.json({ message: 'Não pode alterar os seus próprios privilégios' }, 400);
    }

    const db = createDb(c.env.DATABASE_URL);

    await db.update(users)
      .set({ isAdmin: !!isAdmin })
      .where(eq(users.id, userId));

    return c.json({ message: 'Privilégios atualizados' });
  } catch (error) {
    console.error('Update admin error:', error);
    return c.json({ message: 'Erro ao atualizar privilégios' }, 500);
  }
});

adminRoutes.patch('/users/:id/plan', async (c) => {
  try {
    const userId = c.req.param('id');
    const { plano } = await c.req.json();

    if (!plano || !PLANS[plano as keyof typeof PLANS]) {
      return c.json({ message: 'Plano inválido' }, 400);
    }

    const planInfo = PLANS[plano as keyof typeof PLANS];
    
    const db = createDb(c.env.DATABASE_URL);

    await db.update(users)
      .set({ 
        plano,
        uploadLimit: planInfo.uploadLimit,
        storageLimit: planInfo.storageLimit,
      })
      .where(eq(users.id, userId));

    return c.json({ message: 'Plano atualizado' });
  } catch (error) {
    console.error('Update plan error:', error);
    return c.json({ message: 'Erro ao atualizar plano' }, 500);
  }
});

adminRoutes.delete('/users/:id', async (c) => {
  try {
    const currentUser = c.get('user') as JWTPayload;
    const userId = c.req.param('id');

    if (userId === currentUser.id) {
      return c.json({ message: 'Não pode eliminar a sua própria conta' }, 400);
    }

    const db = createDb(c.env.DATABASE_URL);

    await db.delete(users).where(eq(users.id, userId));

    return c.json({ message: 'Utilizador eliminado' });
  } catch (error) {
    console.error('Delete user error:', error);
    return c.json({ message: 'Erro ao eliminar utilizador' }, 500);
  }
});

adminRoutes.get('/upgrade-requests', async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL);

    const requests = await db.select().from(upgradeRequests)
      .orderBy(desc(upgradeRequests.createdAt));

    const enrichedRequests = await Promise.all(
      requests.map(async (req: any) => {
        const [user] = await db.select().from(users).where(eq(users.id, req.userId));
        return {
          ...req,
          userName: user?.nome || 'Desconhecido',
          userEmail: user?.email || '',
        };
      })
    );

    return c.json(enrichedRequests);
  } catch (error) {
    console.error('Get upgrade requests error:', error);
    return c.json({ message: 'Erro ao buscar solicitações' }, 500);
  }
});

adminRoutes.patch('/upgrade-requests/:id', async (c) => {
  try {
    const requestId = c.req.param('id');
    const { status, adminNote } = await c.req.json();

    if (!status || !['approved', 'rejected'].includes(status)) {
      return c.json({ message: 'Status inválido' }, 400);
    }

    const db = createDb(c.env.DATABASE_URL);

    const [request] = await db.select().from(upgradeRequests)
      .where(eq(upgradeRequests.id, requestId));

    if (!request) {
      return c.json({ message: 'Solicitação não encontrada' }, 404);
    }

    if (request.status !== 'pending') {
      return c.json({ message: 'Esta solicitação já foi processada' }, 400);
    }

    if (status === 'approved') {
      const extraGB = (request as any).requestedExtraGB;
      const isExtraStorageRequest = typeof extraGB === 'number' && Number.isFinite(extraGB) && extraGB > 0;

      if (isExtraStorageRequest) {
        const additionalBytes = BigInt(extraGB) * BigInt(1024 * 1024 * 1024);
        const [currentUser] = await db.select().from(users).where(eq(users.id, request.userId));
        if (currentUser) {
          const newLimit = BigInt(currentUser.storageLimit) + additionalBytes;
          await db.update(users)
            .set({ storageLimit: newLimit.toString() })
            .where(eq(users.id, request.userId));
        }
      } else {
        const planInfo = PLANS[request.requestedPlan as keyof typeof PLANS];
        if (planInfo) {
          await db.update(users)
            .set({
              plano: request.requestedPlan,
              uploadLimit: planInfo.uploadLimit,
              storageLimit: planInfo.storageLimit,
            })
            .where(eq(users.id, request.userId));
        }
      }

      await db.execute(
        sql`UPDATE upgrade_requests SET status = 'cancelled' WHERE user_id = ${request.userId} AND id != ${requestId} AND status = 'pending'`
      );
    }

    await db.update(upgradeRequests)
      .set({
        status,
        adminNote: adminNote || null,
        processedAt: new Date(),
      })
      .where(eq(upgradeRequests.id, requestId));

    return c.json({ message: status === 'approved' ? 'Solicitação aprovada' : 'Solicitação rejeitada' });
  } catch (error) {
    console.error('Process upgrade request error:', error);
    return c.json({ message: 'Erro ao processar solicitação' }, 500);
  }
});

// Helper to get all folder IDs under a public folder (including descendants)
async function getAllPublicFolderIds(db: any): Promise<string[]> {
  // Get all public root folders
  const publicFolders = await db.select({ id: folders.id })
    .from(folders)
    .where(eq(folders.isPublic, true));
  
  if (publicFolders.length === 0) {
    return [];
  }
  
  const publicFolderIds = new Set<string>(publicFolders.map((f: any) => f.id));
  
  // Get all folders to build a parent-child map
  const allFolders = await db.select({ id: folders.id, parentId: folders.parentId })
    .from(folders);
  
  // Build a map of parentId -> children
  const childrenMap = new Map<string, string[]>();
  for (const folder of allFolders) {
    if (folder.parentId) {
      if (!childrenMap.has(folder.parentId)) {
        childrenMap.set(folder.parentId, []);
      }
      childrenMap.get(folder.parentId)!.push(folder.id);
    }
  }
  
  // BFS to find all descendants of public folders
  const queue = [...publicFolderIds];
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = childrenMap.get(currentId) || [];
    for (const childId of children) {
      if (!publicFolderIds.has(childId)) {
        publicFolderIds.add(childId);
        queue.push(childId);
      }
    }
  }
  
  return Array.from(publicFolderIds);
}

// Fix encrypted files in public folders - they should not be encrypted
adminRoutes.post('/fix-public-folder-files', async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL);
    
    // Get all folder IDs that are public or descendants of public folders
    const allPublicFolderIds = await getAllPublicFolderIds(db);
    
    if (allPublicFolderIds.length === 0) {
      return c.json({ 
        message: 'Nenhuma pasta pública encontrada',
        fixed: 0 
      });
    }
    
    // Find files in public folders (including descendants) that are marked as encrypted
    const encryptedFilesInPublic = await db.select({ 
      id: files.id,
      nome: files.nome,
      folderId: files.folderId 
    })
      .from(files)
      .where(and(
        inArray(files.folderId, allPublicFolderIds),
        eq(files.isEncrypted, true),
        eq(files.isDeleted, false)
      ));
    
    if (encryptedFilesInPublic.length === 0) {
      return c.json({ 
        message: 'Nenhum ficheiro encriptado em pastas públicas',
        fixed: 0,
        scannedFolders: allPublicFolderIds.length
      });
    }
    
    // Update files to remove encryption flag
    const fileIds = encryptedFilesInPublic.map((f: any) => f.id);
    await db.update(files)
      .set({ isEncrypted: false })
      .where(inArray(files.id, fileIds));
    
    console.log(`Fixed ${encryptedFilesInPublic.length} files in ${allPublicFolderIds.length} public folders`);
    
    return c.json({ 
      message: `Corrigidos ${encryptedFilesInPublic.length} ficheiros em pastas públicas`,
      fixed: encryptedFilesInPublic.length,
      scannedFolders: allPublicFolderIds.length,
      files: encryptedFilesInPublic.map((f: any) => ({ id: f.id, nome: f.nome }))
    });
  } catch (error) {
    console.error('Fix public folder files error:', error);
    return c.json({ message: 'Erro ao corrigir ficheiros' }, 500);
  }
});

adminRoutes.get('/upgrade-requests/:id/proof', async (c) => {
  try {
    const requestId = c.req.param('id');
    const db = createDb(c.env.DATABASE_URL);

    const [request] = await db.select().from(upgradeRequests)
      .where(eq(upgradeRequests.id, requestId));

    if (!request) {
      return c.json({ message: 'Solicitação não encontrada' }, 404);
    }

    const proofFileId = (request as any).proofTelegramFileId;
    const proofBotId = (request as any).proofTelegramBotId;

    if (!proofFileId || !proofBotId) {
      return c.json({ message: 'Comprovativo não disponível' }, 404);
    }

    const telegram = new TelegramService(c.env);
    if (!telegram.isAvailable()) {
      return c.json({ message: 'Sistema de armazenamento não configurado' }, 503);
    }
    
    try {
      const downloadUrl = await telegram.getDownloadUrl(proofFileId, proofBotId);
      return c.redirect(downloadUrl);
    } catch (telegramError) {
      console.error('Telegram download error:', telegramError);
      return c.json({ message: 'Erro ao obter URL de download' }, 500);
    }
  } catch (error) {
    console.error('Get proof error:', error);
    return c.json({ message: 'Erro ao buscar comprovativo' }, 500);
  }
});
