import { Request, Response } from 'express';
import { prisma } from '../index';

export const getDatabaseStats = async (req: Request, res: Response) => {
  try {
    const [totalEvents, totalTickets, totalExpenses, totalUsers] = await Promise.all([
      prisma.event.count(),
      prisma.ticket.count(),
      prisma.expense.count(),
      prisma.user.count()
    ]);

    const recentTickets = await prisma.ticket.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        ticketType: true,
        event: true
      }
    });

    res.json({
      counts: {
        events: totalEvents,
        tickets: totalTickets,
        expenses: totalExpenses,
        users: totalUsers
      },
      recentTickets
    });
  } catch (error) {
    console.error('[dev.controller] Error fetching database stats:', error);
    res.status(500).json({ error: 'Failed to fetch database stats' });
  }
};

export const getSystemLogs = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 50
    });
    res.json({ logs });
  } catch (error) {
    console.error('[dev.controller] Error fetching system logs:', error);
    res.status(500).json({ error: 'Failed to fetch system logs' });
  }
};

export const searchTickets = async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    
    if (!query) {
      return res.json({ tickets: [] });
    }

    const tickets = await prisma.ticket.findMany({
      where: {
        OR: [
          { id: query }, // Exact match on QR ID
          { name: { contains: query, mode: 'insensitive' } }, // Case-insensitive contains
          { email: { contains: query, mode: 'insensitive' } } // Case-insensitive contains
        ]
      },
      include: {
        event: true,
        ticketType: true
      },
      take: 20 // Limit to 20 to avoid huge payloads if query is generic
    });

    res.json({ tickets });
  } catch (error) {
    console.error('[dev.controller] Error searching tickets:', error);
    res.status(500).json({ error: 'Failed to search tickets' });
  }
};
