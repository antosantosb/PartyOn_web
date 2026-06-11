import { Request, Response } from 'express';
import { prisma } from '../index';
import { ExpenseSchema } from '@partyon/schemas';

export const createExpense = async (req: Request, res: Response) => {
  try {
    const validation = ExpenseSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Datos inválidos", details: validation.error.format() });
    }

    const { name, amount, category, eventId } = validation.data;
    const userId = (req as any).user?.userId;

    const expense = await prisma.expense.create({
      data: {
        name,
        amount,
        category: category.toUpperCase(),
        eventId
      }
    });

    await prisma.auditLog.create({
      data: {
        severity: 'INFO',
        action: 'EXPENSE_CREATED',
        details: `Gasto '${name}' por valor de ${amount} registrado por ${userId}`,
        userId
      }
    });

    res.json({ success: true, expense });
  } catch (error) {
    console.error("[createExpense] Error:", error);
    res.status(500).json({ error: "Error al registrar el gasto" });
  }
};

export const updateExpense = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    const validation = ExpenseSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Datos inválidos", details: validation.error.format() });
    }

    const { name, amount, category } = validation.data;
    const userId = (req as any).user?.userId;

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Gasto no encontrado" });
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        name,
        amount,
        category: category.toUpperCase()
      }
    });

    await prisma.auditLog.create({
      data: {
        severity: 'INFO',
        action: 'EXPENSE_UPDATED',
        details: `Gasto '${name}' modificado de ${existing.amount} a ${amount} por ${userId}`,
        userId
      }
    });

    res.json({ success: true, expense });
  } catch (error) {
    console.error("[updateExpense] Error:", error);
    res.status(500).json({ error: "Error al actualizar el gasto" });
  }
};

export const deleteExpense = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    const userId = (req as any).user?.userId;

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Gasto no encontrado" });
    }

    await prisma.expense.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        severity: 'INFO',
        action: 'EXPENSE_DELETED',
        details: `Gasto '${existing.name}' por valor de ${existing.amount} eliminado por ${userId}`,
        userId
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error("[deleteExpense] Error:", error);
    res.status(500).json({ error: "Error al eliminar el gasto" });
  }
};
