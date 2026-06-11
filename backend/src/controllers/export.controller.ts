import { Request, Response } from 'express';
import { prisma } from '../index';
import { format } from 'date-fns';

/**
 * Sanitiza un valor de celda para mitigar la inyección de CSV (fórmulas macro).
 * Si comienza con '=', '+', '-', o '@', se le añade un espacio inicial.
 * Envuelve todo en comillas dobles y duplica las comillas internas.
 */
function sanitizeCSVField(val: any): string {
  if (val === null || val === undefined) return '""';
  let str = String(val).trim();
  
  if (str.startsWith('=') || str.startsWith('+') || str.startsWith('-') || str.startsWith('@')) {
    str = ' ' + str;
  }
  
  // Duplicar comillas dobles internas y envolver en comillas dobles
  return `"${str.replace(/"/g, '""')}"`;
}

export const exportTicketsCSV = async (req: Request, res: Response) => {
  const eventId = req.params.eventId as string;

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        tickets: {
          include: {
            ticketType: true,
            scannedBy: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }

    // Cabeceras del CSV
    const headers = [
      "ID Entrada",
      "Nombre Cliente",
      "Email Cliente",
      "Tipo de Entrada",
      "Precio Pagado",
      "Estado",
      "Fecha de Compra",
      "Fecha de Acceso",
      "Validador"
    ];

    // TODO: Implementar streams o cursor pagination para eventos masivos
    // Para conjuntos de datos muy grandes (miles de filas), es mejor hacer res.write() línea por línea
    // para evitar el heap out-of-memory o el bloqueo del bucle de eventos.
    
    let csvContent = headers.join(",") + "\n";

    for (const ticket of event.tickets) {
      const row = [
        sanitizeCSVField(ticket.id),
        sanitizeCSVField(ticket.name),
        sanitizeCSVField(ticket.email),
        sanitizeCSVField(ticket.ticketType?.name || "N/A"),
        sanitizeCSVField(ticket.pricePaid),
        sanitizeCSVField(ticket.status),
        sanitizeCSVField(format(new Date(ticket.createdAt), 'yyyy-MM-dd HH:mm:ss')),
        sanitizeCSVField(ticket.scannedAt ? format(new Date(ticket.scannedAt), 'yyyy-MM-dd HH:mm:ss') : ""),
        sanitizeCSVField(ticket.scannedBy?.name || ticket.scannedBy?.email || "")
      ];
      csvContent += row.join(",") + "\n";
    }

    const userId = (req as any).user?.userId;
    await prisma.auditLog.create({
      data: {
        severity: 'INFO',
        action: 'TICKETS_EXPORTED_CSV',
        details: `Lista de entradas del evento '${event.name}' exportada en CSV por ${userId}`,
        userId
      }
    });

    // Envío del archivo para descarga
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=entradas-${event.name.replace(/\s+/g, '_')}.csv`);
    res.send(csvContent);

  } catch (error) {
    console.error("[exportTicketsCSV] Error:", error);
    res.status(500).json({ error: "Error al exportar las entradas" });
  }
};

export const exportMarketingEmailsCSV = async (req: Request, res: Response) => {
  try {
    const tickets = await prisma.ticket.findMany({
      where: {
        marketingConsent: true
      },
      select: {
        name: true,
        email: true
      },
      orderBy: { name: 'asc' }
    });

    // Deduplicate by email
    const uniqueBuyers = new Map<string, string>();
    for (const t of tickets) {
      if (t.email) {
        uniqueBuyers.set(t.email.toLowerCase().trim(), t.name.trim());
      }
    }

    const headers = ["Nombre", "Email"];
    let csvContent = headers.join(",") + "\n";

    for (const [email, name] of uniqueBuyers.entries()) {
      csvContent += `${sanitizeCSVField(name)},${sanitizeCSVField(email)}\n`;
    }

    const userId = (req as any).user?.userId;
    await prisma.auditLog.create({
      data: {
        severity: 'INFO',
        action: 'MARKETING_EMAILS_EXPORTED_CSV',
        details: `Lista global de correos de marketing exportada en CSV por ${userId}`,
        userId
      }
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=marketing-global.csv`);
    res.send(csvContent);

  } catch (error) {
    console.error("[exportMarketingEmailsCSV] Error:", error);
    res.status(500).json({ error: "Error al exportar los correos de marketing" });
  }
};
