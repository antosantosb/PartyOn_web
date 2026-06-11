import { Request, Response } from 'express';
import { prisma } from '../index';
import { DiscountCode } from '@prisma/client';

// Helper to normalize codes
export const normalizeCode = (raw: string): string => raw.trim().toUpperCase();

// Helper to calculate discount
export function calculateDiscount(code: DiscountCode, unitPrice: number, quantity: number): number {
  const baseAmount = unitPrice * quantity;
  if (code.type === 'FREE') return baseAmount;                              // 100% discount
  if (code.type === 'FIXED') return Math.min(code.value, baseAmount);      // cannot be negative
  if (code.type === 'PERCENTAGE') return baseAmount * (code.value / 100);  // 0-100%
  return 0;
}

// POST /api/validate-discount
export const validateDiscountCode = async (req: Request, res: Response) => {
  const { code, ticketTypeId, quantity } = req.body;

  if (!code || !ticketTypeId || !quantity) {
    return res.status(400).json({ error: 'Datos incompletos para validar el descuento' });
  }

  const normalized = normalizeCode(code);

  try {
    const discountCode = await prisma.discountCode.findUnique({
      where: { code: normalized },
      include: { promoter: true }
    });

    if (!discountCode) {
      return res.json({ valid: false, reason: 'NOT_FOUND' });
    }

    if (!discountCode.isActive || !discountCode.promoter.isActive) {
      return res.json({ valid: false, reason: 'INACTIVE' });
    }

    const now = new Date();
    if (discountCode.validFrom && now < discountCode.validFrom) {
      return res.json({ valid: false, reason: 'INACTIVE' }); // code not yet active
    }
    if (discountCode.validUntil && now > discountCode.validUntil) {
      return res.json({ valid: false, reason: 'EXPIRED' });
    }

    if (discountCode.maxUses !== null && discountCode.usedCount >= discountCode.maxUses) {
      return res.json({ valid: false, reason: 'EXHAUSTED' });
    }

    // Verify ticket type exists and is for the same event
    const ticketType = await prisma.ticketType.findUnique({
      where: { id: ticketTypeId as string }
    });

    if (!ticketType) {
      return res.status(404).json({ error: 'Tipo de entrada no encontrado' });
    }

    if (ticketType.eventId !== discountCode.promoter.eventId) {
      return res.json({ valid: false, reason: 'NOT_FOUND' });
    }

    const discountAmount = calculateDiscount(discountCode, ticketType.price, Number(quantity));
    const baseAmount = ticketType.price * Number(quantity);
    const finalPrice = Math.max(0, baseAmount - discountAmount);
    const isFree = finalPrice === 0;

    return res.json({
      valid: true,
      codeId: discountCode.id,
      promoterName: discountCode.promoter.name,
      type: discountCode.type,
      value: discountCode.value,
      discountAmount,
      finalPrice,
      isFree
    });

  } catch (error) {
    console.error('[validateDiscountCode] Error:', error);
    res.status(500).json({ error: 'Error al validar el código' });
  }
};

// GET /admin/events/:eventId/promoters
export const getPromoters = async (req: Request, res: Response) => {
  const eventId = req.params.eventId as string;
  try {
    const promoters = await prisma.promoter.findMany({
      where: { eventId },
      include: {
        discountCodes: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(promoters);
  } catch (error) {
    console.error('[getPromoters] Error:', error);
    res.status(500).json({ error: 'Error al obtener promotores' });
  }
};

// POST /admin/events/:eventId/promoters
export const createPromoter = async (req: Request, res: Response) => {
  const eventId = req.params.eventId as string;
  const { name, email, phone, notes } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }

  try {
    const promoter = await prisma.promoter.create({
      data: {
        eventId,
        name,
        email,
        phone,
        notes
      }
    });
    res.status(201).json(promoter);
  } catch (error) {
    console.error('[createPromoter] Error:', error);
    res.status(500).json({ error: 'Error al crear el promotor' });
  }
};

// PUT /admin/promoters/:id
export const updatePromoter = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { name, email, phone, notes, isActive } = req.body;

  try {
    const promoter = await prisma.promoter.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        notes,
        isActive: isActive !== undefined ? !!isActive : undefined
      }
    });
    res.json(promoter);
  } catch (error) {
    console.error('[updatePromoter] Error:', error);
    res.status(500).json({ error: 'Error al actualizar el promotor' });
  }
};

// DELETE /admin/promoters/:id
export const deletePromoter = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    await prisma.promoter.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('[deletePromoter] Error:', error);
    res.status(500).json({ error: 'Error al eliminar el promotor' });
  }
};

// POST /admin/promoters/:id/codes
export const createDiscountCode = async (req: Request, res: Response) => {
  const promoterId = req.params.id as string;
  const { code, type, value, maxUses, validFrom, validUntil } = req.body;

  if (!code || !type) {
    return res.status(400).json({ error: 'Código y tipo son obligatorios' });
  }

  const normalized = normalizeCode(code);

  try {
    const existing = await prisma.discountCode.findUnique({
      where: { code: normalized }
    });

    if (existing) {
      return res.status(400).json({ error: 'El código de descuento ya existe' });
    }

    const discountCode = await prisma.discountCode.create({
      data: {
        promoterId,
        code: normalized,
        type,
        value: Number(value || 0),
        maxUses: maxUses !== undefined && maxUses !== '' && maxUses !== null ? Number(maxUses) : null,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null
      }
    });

    res.status(201).json(discountCode);
  } catch (error) {
    console.error('[createDiscountCode] Error:', error);
    res.status(500).json({ error: 'Error al crear el código de descuento' });
  }
};

// PATCH /admin/discount-codes/:id
export const toggleDiscountCode = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { isActive } = req.body;

  if (isActive === undefined) {
    return res.status(400).json({ error: 'Falta campo isActive' });
  }

  try {
    const discountCode = await prisma.discountCode.update({
      where: { id },
      data: { isActive: !!isActive }
    });
    res.json(discountCode);
  } catch (error) {
    console.error('[toggleDiscountCode] Error:', error);
    res.status(500).json({ error: 'Error al cambiar estado del código' });
  }
};

// DELETE /admin/discount-codes/:id
export const deleteDiscountCode = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    await prisma.discountCode.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('[deleteDiscountCode] Error:', error);
    res.status(500).json({ error: 'Error al eliminar el código de descuento' });
  }
};

// GET /admin/events/:eventId/promoters/analytics
export const getPromoterAnalytics = async (req: Request, res: Response) => {
  const eventId = req.params.eventId as string;
  try {
    const promoters = await prisma.promoter.findMany({
      where: { eventId },
      include: {
        discountCodes: true,
        orders: {
          include: {
            tickets: true
          }
        }
      }
    });

    const analytics = promoters.map(promoter => {
      let totalOrders = promoter.orders.length;
      let totalTickets = promoter.orders.reduce((sum: number, order: any) => sum + order.tickets.length, 0);
      let netRevenue = promoter.orders.reduce((sum: number, order: any) => sum + order.totalPaid, 0);
      let totalDiscount = promoter.orders.reduce((sum: number, order: any) => sum + order.discountAmount, 0);
      let grossRevenue = netRevenue + totalDiscount;

      return {
        id: promoter.id,
        name: promoter.name,
        email: promoter.email,
        isActive: promoter.isActive,
        totalOrders,
        totalTickets,
        grossRevenue,
        netRevenue,
        totalDiscount,
        codes: promoter.discountCodes.map((c: any) => ({
          id: c.id,
          code: c.code,
          type: c.type,
          value: c.value,
          usedCount: c.usedCount,
          maxUses: c.maxUses,
          isActive: c.isActive,
          validUntil: c.validUntil
        }))
      };
    });

    res.json({ promoters: analytics });
  } catch (error) {
    console.error('[getPromoterAnalytics] Error:', error);
    res.status(500).json({ error: 'Error al obtener las analíticas' });
  }
};
