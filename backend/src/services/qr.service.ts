import QRCode from 'qrcode';

/**
 * generateTicketQR
 * ----------------
 * Generates a high-resolution QR code for the ticket as a Base64 Data URL.
 * matches the theme's primaryColor for a branded look.
 *
 * @param ticketId - The unique ID of the ticket for validation
 * @param primaryColor - The Hex color code from the theme (e.g. #00ffcc)
 * @returns Promise<string> - A Base64 string (data:image/png;base64,...)
 */
export const generateTicketQR = async (ticketId: string, primaryColor: string): Promise<string> => {
  // We embed ONLY the plain string of the ticket ID to keep the QR matrix sparse
  // We use toDataURL instead of toBuffer so it can be directly embedded in PDF/HTML
  return await QRCode.toDataURL(ticketId, {
    color: {
      dark: primaryColor, // The QR dots will match the brand color
      light: '#FFFFFF',   // Keeping light background for high contrast
    },
    width: 600,          // High res for printing
    margin: 1,
    errorCorrectionLevel: 'H' // High error correction so it works even if slightly damaged
  });
};
