import { Resend } from 'resend';
// import { marked } from 'marked'; // ESM only, using dynamic import instead

/**
 * email.service.ts
 * ----------------
 * Responsible for delivering ticket emails to buyers.
 * Supports Markdown in the message body and PDF attachments.
 */

let resendInstance: Resend | null = null;

const getResend = () => {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      console.error('[Email Service] ❌ MISSING API KEY: Resend will not be able to send emails.');
      return null;
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
};

interface TicketAttachment {
  pdfBuffer: Buffer;
  ticketId: string;
}

interface SendTicketEmailParams {
  to: string;
  subject: string;
  bodyMarkdown: string;
  eventName: string;
  tickets: TicketAttachment[]; // Support for multiple tickets
}

/**
 * sendTicketEmail
 * ---------------
 * Sends a clean, responsive HTML email with all ticket PDFs attached.
 */
export const sendTicketEmail = async (params: SendTicketEmailParams) => {
  const { to, subject, bodyMarkdown, eventName, tickets } = params;

  try {
    // 1. Parse Markdown to HTML for the email content
    const { marked } = await import('marked');
    const messageHtml = await marked.parse(bodyMarkdown.trim());
    const isMultiple = tickets.length > 1;

    // 2. Prepare the HTML template (Preserving your original professional style)
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; background-color: #ffffff; color: #333333; padding: 0; margin: 0; -webkit-font-smoothing: antialiased; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { margin-bottom: 30px; }
            .header h1 { font-size: 24px; color: #111111; margin: 0; font-weight: 700; }
            .content { line-height: 1.6; font-size: 16px; }
            .content p { margin-bottom: 20px; white-space: pre-wrap; color: #444444; }
            .content b, .content strong { color: #111111; }
            .ticket-info { background-color: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #eeeeee; margin: 30px 0; }
            .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #eeeeee; font-size: 12px; color: #999999; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${eventName}</h1>
            </div>
            
            <div class="content">
              ${messageHtml}
              
              <div class="ticket-info">
                <p style="margin:0;">
                  ${isMultiple 
                    ? `Tus <b>${tickets.length} entradas digitales</b> han sido generadas correctamente y se encuentran adjuntas a este correo como archivos PDF.`
                    : 'Tu entrada digital ha sido generada correctamente y se encuentra adjunta a este correo como un archivo PDF.'
                  }
                </p>
                <div style="margin-top: 15px; font-size: 12px; color: #666;">
                  IDs: ${tickets.map(t => t.ticketId.split('_')[0]).join(', ')}
                </div>
              </div>
            </div>

            <div class="footer">
              <p>Este correo ha sido enviado automáticamente por PartyOn. Conserva este mensaje para tu referencia.</p>
              <p>&copy; ${new Date().getFullYear()} PartyOn — La plataforma oficial de eventos.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // 3. Prepare multi-attachments for Resend
    const attachments = tickets.map((t, index) => ({
      filename: `Ticket_${eventName.replace(/\s+/g, '_')}_${index + 1}.pdf`,
      content: t.pdfBuffer,
    }));

    const resend = getResend();
    if (!resend) {
      throw new Error('Resend service not initialized (Missing API Key)');
    }

    const { data, error } = await resend.emails.send({
      from: 'PartyOn Tickets <onboarding@resend.dev>',
      to: [to],
      subject: subject || (isMultiple ? `Tus entradas para ${eventName}` : `Tu entrada para ${eventName}`),
      html: emailHtml,
      attachments: attachments,
    });

    if (error) throw error;
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('[sendTicketEmail] Error sending email:', error);
    throw error;
  }
};

