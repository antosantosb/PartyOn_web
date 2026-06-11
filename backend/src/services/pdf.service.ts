import React from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';

/**
 * Redesigned Vertical Concert/Show Ticket - 400 × 800 (Brutalist Theme)
 */
const W = 400;
const H = 800;
const HERO_H = 320;  // altura fija garantizada tras pre-procesado
const SCALE = 3;     // Multiplicador de densidad de píxeles (3x para pantallas de alta resolución)

/**
 * Pre-normaliza la imagen hero a dimensiones exactas antes de pasarla al renderer.
 *
 * USA fit: 'contain' (nunca recorta) — la imagen se escala para caber entera
 * dentro de W × HERO_H. El espacio sobrante (letterbox) se rellena con
 * el color primario del evento, integrándose visualmente con el ticket.
 *
 * NO usar fit: 'cover' — recortaría el flyer, pudiendo eliminar el nombre
 * del artista o elementos clave en los bordes de la imagen.
 */
const processHeroImage = async (buffer: Buffer, bgColor = '#0a0a0a'): Promise<Buffer> => {
  return sharp(buffer)
    .resize(W * SCALE, HERO_H * SCALE, {
      fit: 'contain',      // nunca recorta — escala para que quepa entera
      background: bgColor, // rellena el letterbox con el color del evento
    })
    .jpeg({ quality: 92 })
    .toBuffer();
};

// ─── Types ──────────────────────────────────────────────────────────────────
interface TicketData {
  event: {
    name: string;
    tagline?: string;
    date: string;
    location: string;
    startsAt?: string | null;
    endsAt?: string | null;
  };
  theme: {
    primaryColor?: string;
    backgroundImage?: string;
  };
  ticket: {
    id: string;
    name: string;
    ticketType?: { name: string };
  };
  qrCodeBase64: string;
}

// ─── Main export ────────────────────────────────────────────────────────────
export const generateTicketPDF = async (data: TicketData): Promise<Buffer> => {
  const { event, theme, ticket, qrCodeBase64 } = data;

  // 1. Load @react-pdf/renderer dynamically (Required for CommonJS/ESM Interop)
  const { renderToBuffer, Page, Text, View, Document, StyleSheet, Image } = await import('@react-pdf/renderer');

  // 2. Load the flyer image (either locally or asynchronously from remote)
  let flyerSrc: Buffer | null = null;
  console.log(`[PDF Service] Resolving flyer image. URL provided: "${theme.backgroundImage}"`);
  if (theme.backgroundImage) {
    try {
      if (theme.backgroundImage.includes('/uploads/')) {
        const parts = theme.backgroundImage.split('/uploads/');
        const filename = parts[parts.length - 1];
        const localPath = path.resolve(__dirname, '..', '..', 'uploads', filename);
        console.log(`[PDF Service] Checking local path for upload: "${localPath}"`);
        if (fs.existsSync(localPath)) {
          flyerSrc = await fs.promises.readFile(localPath);
          console.log(`[PDF Service] Successfully read local file: "${localPath}"`);
        } else {
          console.log(`[PDF Service] Local file does not exist: "${localPath}"`);
        }
      } else if (theme.backgroundImage.startsWith('/')) {
        // It's a relative path, likely from the frontend's public folder (like /hero.jpg)
        const filename = theme.backgroundImage.startsWith('/') ? theme.backgroundImage.slice(1) : theme.backgroundImage;
        const frontendPath = path.resolve(__dirname, '..', '..', '..', 'frontend', 'public', filename);
        console.log(`[PDF Service] Checking frontend public path for fallback: "${frontendPath}"`);
        if (fs.existsSync(frontendPath)) {
          flyerSrc = await fs.promises.readFile(frontendPath);
          console.log(`[PDF Service] Successfully read image from frontend public: "${frontendPath}"`);
        } else {
          console.log(`[PDF Service] Frontend public file does not exist: "${frontendPath}"`);
        }
      }

      if (!flyerSrc && (theme.backgroundImage.startsWith('http://') || theme.backgroundImage.startsWith('https://'))) {
        console.log(`[PDF Service] Attempting remote fetch of: "${theme.backgroundImage}"`);
        const response = await fetch(theme.backgroundImage);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          flyerSrc = Buffer.from(arrayBuffer);
          console.log(`[PDF Service] Successfully fetched remote image.`);
        } else {
          console.warn(`[PDF Service] Failed to fetch remote image: status ${response.status}`);
        }
      }
    } catch (error) {
      console.error('[PDF Service] Error loading flyer image:', error);
    }
  } else {
    console.log('[PDF Service] No flyer URL provided in theme.');
  }

  // Después de cargar flyerSrc exitosamente:
  // Se pasa el primaryColor del evento para que el letterbox sea invisible
  if (flyerSrc) {
    try {
      flyerSrc = await processHeroImage(flyerSrc, theme.primaryColor ?? '#0a0a0a');
      console.log(`[PDF Service] Hero image pre-processed to ${W}x${HERO_H}px (contain + bg fill)`);
    } catch (sharpError) {
      console.error('[PDF Service] sharp pre-processing failed, using raw buffer:', sharpError);
      // Continuamos con el buffer original — la Capa 2 (flex) minimizará el daño
    }
  }
  
  // 3. Define Styles inside the function so they use the correct StyleSheet instance
  const styles = StyleSheet.create({
    page: {
      padding: 0,
      margin: 0,
      backgroundColor: '#ffffff',
      flexDirection: 'column',
    },
    // Top section: flyer or fallback banner
    flyerContainer: {
      width: '100%',
      height: HERO_H,   // 320px — siempre coincide con el buffer pre-procesado
      backgroundColor: '#f0ede8',
      alignItems: 'center',
      justifyContent: 'center',
    },
    flyerImage: {
      width: '100%',
      height: '100%',
      // objectFit no es problema aquí porque sharp ya entregó un buffer
      // exactamente de W × HERO_H — la imagen siempre llena el contenedor.
      objectFit: 'cover',  // fill el contenedor (el buffer ya tiene las dims exactas)
    },
    fallbackBanner: {
      width: W,
      height: HERO_H,
      backgroundColor: '#0a0a0a',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    fallbackText: {
      color: '#ffffff',
      fontSize: 28,
      fontWeight: 'bold',
      textAlign: 'center',
      textTransform: 'uppercase',
    },
    
    // Middle section: Event Details (off-white, high contrast, clean black text)
    detailsSection: {
      minHeight: 190,         // mínimo garantizado, no desborda la página
      backgroundColor: '#f0ede8',
      paddingHorizontal: 24,
      paddingVertical: 18,
      flexDirection: 'column',
      justifyContent: 'space-between',
    },
    eventLabel: {
      fontSize: 8,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      color: '#000000',
      letterSpacing: 1.5,
      marginBottom: 4,
    },
    eventName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#000000',
      textTransform: 'uppercase',
      letterSpacing: 1,
      lineHeight: 1.1,
    },
    infoGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
    },
    infoCell: {
      flex: 1,
    },
    infoLabel: {
      fontSize: 8,
      fontWeight: 'bold',
      color: '#000000',
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginBottom: 2,
    },
    infoValue: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#000000',
      textTransform: 'uppercase',
    },
    
    // Brutalist separator line
    separator: {
      height: 4,
      backgroundColor: '#000000',
      width: '100%',
    },
    
    // Bottom section: Buyer details and QR code
    bottomSection: {
      flex: 1,
      minHeight: 250,         // garantiza espacio suficiente para el QR (110px) + márgenes
      backgroundColor: '#ffffff',
      paddingHorizontal: 24,
      paddingVertical: 18,
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    buyerContainer: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    buyerLabel: {
      fontSize: 7,
      fontWeight: 'bold',
      color: '#000000',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 2,
    },
    buyerValue: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#000000',
      textTransform: 'uppercase',
    },
    ticketTypePill: {
      backgroundColor: '#000000',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 0,
    },
    ticketTypeText: {
      fontSize: 9,
      fontWeight: 'bold',
      color: '#ffffff',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    qrContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      backgroundColor: '#ffffff',
      borderWidth: 2,
      borderColor: '#000000',
      marginTop: 10,
      marginBottom: 4,
    },
    qrImage: {
      width: 110,
      height: 110,
    },
    ticketIdText: {
      fontSize: 7,
      color: '#333333',
      letterSpacing: 1,
      textAlign: 'center',
      marginTop: 4,
      textTransform: 'uppercase',
    },
  });

  const formattedTime = [
    event.startsAt ? `Apertura: ${formatInTimeZone(new Date(event.startsAt), 'Europe/Lisbon', 'HH:mm')}` : '',
    event.endsAt ? `Cierre: ${formatInTimeZone(new Date(event.endsAt), 'Europe/Lisbon', 'HH:mm')}` : ''
  ].filter(Boolean).join(' — ');

  const MyDocument = () =>
    React.createElement(
      Document,
      {},
      React.createElement(
        Page,
        { size: [W, H], style: styles.page },
        // Top Section: Flyer Image or Fallback
        flyerSrc
          ? React.createElement(
              View,
              { style: styles.flyerContainer },
              React.createElement(Image, { src: flyerSrc, style: styles.flyerImage })
            )
          : React.createElement(
              View,
              { style: styles.fallbackBanner },
              React.createElement(Text, { style: styles.fallbackText }, event.name)
            ),
        
        // Middle Section: Event Details
        React.createElement(
          View,
          { style: styles.detailsSection },
          React.createElement(
            View,
            {},
            React.createElement(Text, { style: styles.eventLabel }, 'Evento'),
            React.createElement(Text, { style: styles.eventName }, event.name)
          ),
          React.createElement(
            View,
            { style: styles.infoGrid },
            React.createElement(
              View,
              { style: styles.infoCell },
              React.createElement(Text, { style: styles.infoLabel }, 'Fecha'),
              React.createElement(Text, { style: styles.infoValue }, event.date),
              formattedTime
                ? React.createElement(Text, { style: { ...styles.infoValue, fontSize: 9, marginTop: 4 } }, formattedTime)
                : null
            ),
            React.createElement(
              View,
              { style: { ...styles.infoCell, paddingLeft: 10 } },
              React.createElement(Text, { style: styles.infoLabel }, 'Lugar'),
              React.createElement(Text, { style: styles.infoValue }, event.location)
            )
          )
        ),
        
        // Separator
        React.createElement(View, { style: styles.separator }),
        
        // Bottom Section: Buyer & QR
        React.createElement(
          View,
          { style: styles.bottomSection },
          React.createElement(
            View,
            { style: styles.buyerContainer },
            React.createElement(
              View,
              {},
              React.createElement(Text, { style: styles.buyerLabel }, 'Comprador'),
              React.createElement(Text, { style: styles.buyerValue }, ticket.name)
            ),
            React.createElement(
              View,
              { style: styles.ticketTypePill },
              React.createElement(Text, { style: styles.ticketTypeText }, ticket.ticketType?.name || 'GENERAL')
            )
          ),
          React.createElement(
            View,
            { style: styles.qrContainer },
            React.createElement(Image, { src: qrCodeBase64, style: styles.qrImage })
          ),
          React.createElement(
            View,
            {},
            React.createElement(Text, { style: styles.ticketIdText }, `ID: ${ticket.id.toUpperCase()}`)
          )
        )
      )
    );

  return await renderToBuffer(React.createElement(MyDocument));
};