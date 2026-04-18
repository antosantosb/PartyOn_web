import QRCode from 'qrcode';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export const generateTicketImage = async (ticketId: string, templatePath?: string): Promise<Buffer> => {
  // 1. Generate QR Code
  // In a real app, this URL should point to your hosted frontend validation page
  const validationUrl = `https://your-domain.com/validate?id=${ticketId}`;
  
  const qrBuffer = await QRCode.toBuffer(validationUrl, {
    color: { dark: '#000000', light: '#FFFFFF' },
    width: 300,
    margin: 2
  });

  // 2. Load Base Template (Use a default if none provided by Theme)
  const defaultTemplate = path.join(process.cwd(), '..', 'base.jpg');
  const templateToUse = templatePath && fs.existsSync(templatePath) ? templatePath : defaultTemplate;

  // 3. Composite Image
  // Adjust top/left to put the QR code where it should go on the base image
  return await sharp(templateToUse)
    .composite([
      { input: qrBuffer, top: 130, left: 450 } 
    ])
    .toFormat('png')
    .toBuffer();
};
