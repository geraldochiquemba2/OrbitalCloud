/**
 * Upgrade Request Routes for Cloudflare Workers
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { createDb } from '../db';
import { authMiddleware, adminMiddleware, JWTPayload } from '../middleware/auth';
import { TelegramService } from '../services/telegram';
import { upgradeRequests, users, PLANS, UpgradeRequest, User } from '../schema';
import { eq, and, desc } from 'drizzle-orm';

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

export const upgradeRoutes = new Hono<{ Bindings: Env }>();
export const userUpgradeRequestsRoutes = new Hono<{ Bindings: Env }>();
export const myUpgradeRequestsRoutes = new Hono<{ Bindings: Env }>();

upgradeRoutes.use('*', authMiddleware);
userUpgradeRequestsRoutes.use('*', authMiddleware);
myUpgradeRequestsRoutes.use('*', authMiddleware);

userUpgradeRequestsRoutes.post('/', async (c) => {
  try {
    const user = c.get('user') as JWTPayload;
    const formData = await c.req.formData();
    
    const rawExtraGB = formData.get('requestedExtraGB');
    const rawTotalPrice = formData.get('totalPrice');
    const proofFile = formData.get('proof') as File | null;
    
    let requestedExtraGB: number | null = null;
    let totalPrice: number | null = null;
    
    if (rawExtraGB) {
      const rawValue = String(rawExtraGB).trim();
      if (!/^-?\d+$/.test(rawValue)) {
        return c.json({ message: 'GB extras deve ser um número inteiro válido' }, 400);
      }
      requestedExtraGB = Number(rawValue);
    }
    
    if (rawTotalPrice) {
      const rawValue = String(rawTotalPrice).trim();
      if (!/^-?\d+$/.test(rawValue)) {
        return c.json({ message: 'Preço total deve ser um número inteiro válido' }, 400);
      }
      totalPrice = Number(rawValue);
    }
    
    if (requestedExtraGB === null || requestedExtraGB <= 0) {
      return c.json({ message: 'GB extras deve ser maior que 0' }, 400);
    }
    
    const expectedPrice = requestedExtraGB * 500;
    if (totalPrice !== null && totalPrice !== expectedPrice) {
      return c.json({ message: 'Preço incorreto para a quantidade de GB solicitada' }, 400);
    }
    
    if (!proofFile) {
      return c.json({ message: 'Comprovativo de pagamento é obrigatório' }, 400);
    }
    
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(proofFile.type)) {
      return c.json({ message: 'Apenas ficheiros PDF ou imagens são aceites' }, 400);
    }
    
    const db = createDb(c.env.DATABASE_URL);
    
    const existingRequests = await db.select().from(upgradeRequests)
      .where(and(
        eq(upgradeRequests.userId, user.id),
        eq(upgradeRequests.status, 'pending')
      ));
    
    if (existingRequests.length > 0) {
      return c.json({ message: 'Já existe uma solicitação pendente' }, 400);
    }
    
    let proofFileName: string | undefined;
    let proofFileSize: number | undefined;
    let proofTelegramFileId: string | undefined;
    let proofTelegramBotId: string | undefined;
    
    const telegram = new TelegramService(c.env);
    if (telegram.isAvailable()) {
      try {
        const fileBuffer = await proofFile.arrayBuffer();
        const uploadResult = await telegram.uploadFile(fileBuffer, proofFile.name);
        proofFileName = proofFile.name;
        proofFileSize = proofFile.size;
        proofTelegramFileId = uploadResult.fileId;
        proofTelegramBotId = uploadResult.botId;
      } catch (uploadError) {
        console.error('Erro ao fazer upload do comprovativo:', uploadError);
        return c.json({ message: 'Erro ao fazer upload do comprovativo' }, 500);
      }
    } else {
      return c.json({ message: 'Sistema de armazenamento indisponível' }, 500);
    }
    
    const [request] = await db.insert(upgradeRequests).values({
      userId: user.id,
      currentPlan: user.plano,
      requestedPlan: 'gratis',
      requestedExtraGB,
      totalPrice: totalPrice ?? requestedExtraGB * 500,
      proofFileName,
      proofFileSize,
      proofTelegramFileId,
      proofTelegramBotId,
    }).returning();
    
    return c.json({ message: 'Solicitação enviada com sucesso! Aguarde aprovação.', request });
  } catch (error) {
    console.error('Create extra storage request error:', error);
    return c.json({ message: 'Erro ao solicitar armazenamento extra' }, 500);
  }
});

myUpgradeRequestsRoutes.get('/', async (c) => {
  try {
    const user = c.get('user') as JWTPayload;
    const db = createDb(c.env.DATABASE_URL);
    
    const requests = await db.select().from(upgradeRequests)
      .where(eq(upgradeRequests.userId, user.id))
      .orderBy(desc(upgradeRequests.createdAt));
    
    return c.json(requests);
  } catch (error) {
    console.error('Get my upgrade requests error:', error);
    return c.json({ message: 'Erro ao buscar solicitações' }, 500);
  }
});

upgradeRoutes.post('/request', async (c) => {
  try {
    const user = c.get('user') as JWTPayload;
    const formData = await c.req.formData();
    
    const requestedPlan = formData.get('requestedPlan') as string;
    const proofFile = formData.get('proof') as File | null;

    if (!requestedPlan || !PLANS[requestedPlan as keyof typeof PLANS]) {
      return c.json({ message: 'Plano inválido' }, 400);
    }

    const db = createDb(c.env.DATABASE_URL);

    const existingRequests = await db.select().from(upgradeRequests)
      .where(and(
        eq(upgradeRequests.userId, user.id),
        eq(upgradeRequests.status, 'pending')
      ));

    if (existingRequests.length > 0) {
      return c.json({ message: 'Já tem um pedido de upgrade pendente' }, 400);
    }

    let proofFileName: string | undefined;
    let proofFileSize: number | undefined;
    let proofTelegramFileId: string | undefined;
    let proofTelegramBotId: string | undefined;

    if (proofFile) {
      const telegram = new TelegramService(c.env);
      
      if (telegram.isAvailable()) {
        const fileBuffer = await proofFile.arrayBuffer();
        const uploadResult = await telegram.uploadFile(fileBuffer, proofFile.name);
        
        proofFileName = proofFile.name;
        proofFileSize = proofFile.size;
        proofTelegramFileId = uploadResult.fileId;
        proofTelegramBotId = uploadResult.botId;
      }
    }

    const [request] = await db.insert(upgradeRequests).values({
      userId: user.id,
      currentPlan: user.plano,
      requestedPlan,
      proofFileName,
      proofFileSize,
      proofTelegramFileId,
      proofTelegramBotId,
    }).returning();

    return c.json(request);
  } catch (error) {
    console.error('Create upgrade request error:', error);
    return c.json({ message: 'Erro ao criar pedido de upgrade' }, 500);
  }
});

upgradeRoutes.get('/my-requests', async (c) => {
  try {
    const user = c.get('user') as JWTPayload;
    const db = createDb(c.env.DATABASE_URL);

    const requests = await db.select().from(upgradeRequests)
      .where(eq(upgradeRequests.userId, user.id))
      .orderBy(desc(upgradeRequests.createdAt));

    return c.json(requests);
  } catch (error) {
    console.error('Get my requests error:', error);
    return c.json({ message: 'Erro ao buscar pedidos' }, 500);
  }
});

upgradeRoutes.get('/pending', adminMiddleware, async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL);

    const requests = await db.select().from(upgradeRequests)
      .where(eq(upgradeRequests.status, 'pending'))
      .orderBy(desc(upgradeRequests.createdAt));

    const enrichedRequests = await Promise.all(
      requests.map(async (req) => {
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
    console.error('Get pending requests error:', error);
    return c.json({ message: 'Erro ao buscar pedidos pendentes' }, 500);
  }
});

upgradeRoutes.get('/all', adminMiddleware, async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL);

    const requests = await db.select().from(upgradeRequests)
      .orderBy(desc(upgradeRequests.createdAt));

    const enrichedRequests = await Promise.all(
      requests.map(async (req) => {
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
    console.error('Get all requests error:', error);
    return c.json({ message: 'Erro ao buscar todos os pedidos' }, 500);
  }
});

upgradeRoutes.post('/:id/approve', adminMiddleware, async (c) => {
  try {
    const requestId = c.req.param('id');
    const { adminNote } = await c.req.json().catch(() => ({}));
    
    const db = createDb(c.env.DATABASE_URL);

    const [request] = await db.select().from(upgradeRequests)
      .where(eq(upgradeRequests.id, requestId));

    if (!request) {
      return c.json({ message: 'Pedido não encontrado' }, 404);
    }

    if (request.status !== 'pending') {
      return c.json({ message: 'Este pedido já foi processado' }, 400);
    }

    const planInfo = PLANS[request.requestedPlan as keyof typeof PLANS];
    if (!planInfo) {
      return c.json({ message: 'Plano inválido' }, 400);
    }

    await db.update(users)
      .set({
        plano: request.requestedPlan,
        uploadLimit: planInfo.uploadLimit,
        storageLimit: planInfo.storageLimit,
      })
      .where(eq(users.id, request.userId));

    await db.update(upgradeRequests)
      .set({
        status: 'approved',
        adminNote,
        processedAt: new Date(),
      })
      .where(eq(upgradeRequests.id, requestId));

    return c.json({ message: 'Upgrade aprovado com sucesso' });
  } catch (error) {
    console.error('Approve upgrade error:', error);
    return c.json({ message: 'Erro ao aprovar upgrade' }, 500);
  }
});

upgradeRoutes.post('/:id/reject', adminMiddleware, async (c) => {
  try {
    const requestId = c.req.param('id');
    const { adminNote } = await c.req.json().catch(() => ({}));
    
    const db = createDb(c.env.DATABASE_URL);

    const [request] = await db.select().from(upgradeRequests)
      .where(eq(upgradeRequests.id, requestId));

    if (!request) {
      return c.json({ message: 'Pedido não encontrado' }, 404);
    }

    if (request.status !== 'pending') {
      return c.json({ message: 'Este pedido já foi processado' }, 400);
    }

    await db.update(upgradeRequests)
      .set({
        status: 'rejected',
        adminNote,
        processedAt: new Date(),
      })
      .where(eq(upgradeRequests.id, requestId));

    return c.json({ message: 'Upgrade rejeitado' });
  } catch (error) {
    console.error('Reject upgrade error:', error);
    return c.json({ message: 'Erro ao rejeitar upgrade' }, 500);
  }
});
