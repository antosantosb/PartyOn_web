import { renderToBuffer, Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import React from 'react';

/**
 * Professional Ticket Card — 700 × 280 landscape  (Dark Theme)
 * Design approach:
 *   • Deep charcoal card on a near-black page
 *   • Bold left accent bar carrying the theme's primary colour
 *   • Subtle dark section dividers with low-opacity white text hierarchy
 *   • Micro-label / value rhythm for every data field
 *   • Tear-off stub on the right separated by a dashed perforation
 *   • Decorative half-circle "notches" at the perforation edge
 */

const W = 700;
const H = 280;
const STUB_W = 160;
const ACCENT_W = 8;
const NOTCH_R = 14; // visual notch radius (drawn as circles)

const styles = StyleSheet.create({
  // ─── Page ────────────────────────────────────────────────────────────────
  page: {
    padding: 0,
    backgroundColor: '#0A0A0F',   // near-black background that bleeds behind the card
    position: 'relative',
  },

  // ─── Optional full-bleed background image ────────────────────────────────
  bgImage: {
    position: 'absolute',
    top: 0, left: 0,
    width: '100%', height: '100%',
    objectFit: 'cover',
  },
  bgOverlay: {
    position: 'absolute',
    top: 0, left: 0,
    width: '100%', height: '100%',
    backgroundColor: 'rgba(15,15,25,0.82)',
  },

  // ─── Outer card shell ────────────────────────────────────────────────────
  cardWrapper: {
    position: 'absolute',
    top: 0, left: 0,
    width: '100%', height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: W - 48,
    height: H - 40,
    backgroundColor: '#13131A',   // deep charcoal card
    borderRadius: 12,
    flexDirection: 'row',
    overflow: 'hidden',
  },

  // ─── Accent bar ──────────────────────────────────────────────────────────
  accentBar: {
    width: ACCENT_W,
    backgroundColor: '#6366F1',  // fallback; overridden at runtime with theme.primaryColor
    flexShrink: 0,
  },

  // ─── Main body (left of stub) ─────────────────────────────────────────────
  body: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingTop: 22,
    paddingBottom: 22,
    paddingLeft: 24,
    paddingRight: 20,
  },

  // Header block
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F9FAFB',             // near-white for dark bg
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 3,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgePillText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#6366F1',             // overridden at runtime
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginVertical: 12,
  },

  // Detail grid
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  detailCell: {
    width: '33%',
    marginBottom: 10,
  },
  detailCellWide: {
    width: '66%',
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 6.5,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    color: 'rgba(255,255,255,0.3)',
    marginBottom: 3,
  },
  fieldValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#E5E7EB',             // soft white for dark bg
  },
  fieldValueAccent: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6366F1',             // overridden at runtime
  },

  // ─── Perforation ─────────────────────────────────────────────────────────
  perforation: {
    width: 1,
    flexShrink: 0,
    backgroundColor: 'transparent',
    borderLeft: '1.5px dashed rgba(255,255,255,0.12)',
    marginVertical: 0,
  },
  notchTop: {
    position: 'absolute',
    width: NOTCH_R * 2,
    height: NOTCH_R * 2,
    borderRadius: NOTCH_R,
    backgroundColor: '#0A0A0F',  // matches dark page bg
    top: -NOTCH_R,
    left: -NOTCH_R + 0.5,
  },
  notchBottom: {
    position: 'absolute',
    width: NOTCH_R * 2,
    height: NOTCH_R * 2,
    borderRadius: NOTCH_R,
    backgroundColor: '#0A0A0F',  // matches dark page bg
    bottom: -NOTCH_R,
    left: -NOTCH_R + 0.5,
  },

  // ─── Stub ────────────────────────────────────────────────────────────────
  stub: {
    width: STUB_W,
    flexShrink: 0,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#0D0D14',  // slightly darker than the card
  },
  qrWrapper: {
    padding: 6,
    backgroundColor: '#FFFFFF',
  },
  qrImage: {
    width: 96,
    height: 96,
  },
  scanLabel: {
    marginTop: 10,
    fontSize: 6.5,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
  },
  ticketId: {
    marginTop: 6,
    fontSize: 6,
    color: 'rgba(255,255,255,0.15)',
    letterSpacing: 1,
    textAlign: 'center',
  },
});

// ─── Helper: thin horizontal rule ──────────────────────────────────────────
const Divider = () => React.createElement(View, { style: styles.divider });

// ─── Helper: labelled field ─────────────────────────────────────────────────
const Field = ({
  label,
  value,
  accent = false,
  accentColor = '#6366F1',
  wide = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  accentColor?: string;
  wide?: boolean;
}) =>
  React.createElement(
    View,
    { style: wide ? styles.detailCellWide : styles.detailCell },
    React.createElement(Text, { style: styles.fieldLabel }, label),
    React.createElement(Text, {
      style: accent
        ? { ...styles.fieldValueAccent, color: accentColor }
        : styles.fieldValue,
    }, value)
  );

// ─── Types ──────────────────────────────────────────────────────────────────
interface TicketData {
  event: {
    name: string;
    tagline?: string;
    date: string;
    location: string;
    time?: string;
    gate?: string;
    seat?: string;
    section?: string;
  };
  theme: {
    primaryColor?: string;
    backgroundImage?: string;
  };
  ticket: {
    id: string;
    name: string;
    ticketType?: { name: string };
    orderRef?: string;
  };
  qrCodeBase64: string;
}

// ─── Main export ────────────────────────────────────────────────────────────
export const generateTicketPDF = async (data: TicketData): Promise<Buffer> => {
  const { event, theme, ticket, qrCodeBase64 } = data;

  const primary = theme.primaryColor || '#6366F1';

  console.log('[PDF Service] Ticket ID:', ticket.id);
  console.log('[PDF Service] QR Base64 Start:', qrCodeBase64.substring(0, 50));

  const MyDocument = () =>
    React.createElement(
      Document,
      {},
      React.createElement(
        Page,
        { size: [W, H], style: styles.page },

        // ── Background ──────────────────────────────────────────────────────
        theme.backgroundImage
          ? React.createElement(Image, { src: theme.backgroundImage, style: styles.bgImage })
          : null,
        theme.backgroundImage
          ? React.createElement(View, { style: styles.bgOverlay })
          : null,

        // ── Card ────────────────────────────────────────────────────────────
        React.createElement(
          View,
          { style: styles.cardWrapper },
          React.createElement(
            View,
            { style: styles.card },

            // Accent bar
            React.createElement(View, {
              style: { ...styles.accentBar, backgroundColor: primary },
            }),

            // ── Body ──────────────────────────────────────────────────────
            React.createElement(
              View,
              { style: styles.body },

              // Header row: event name + ticket type badge
              React.createElement(
                View,
                { style: styles.headerRow },
                React.createElement(
                  View,
                  {},
                  React.createElement(Text, { style: styles.eventName }, event.name),
                  event.tagline
                    ? React.createElement(Text, { style: styles.tagline }, event.tagline)
                    : null
                ),
                React.createElement(
                  View,
                  { style: styles.badgePill },
                  React.createElement(Text, {
                    style: { ...styles.badgePillText, color: primary },
                  }, ticket.ticketType?.name || 'GENERAL ADMISSION')
                )
              ),

              React.createElement(Divider),

              // Detail grid
              React.createElement(
                View,
                { style: styles.detailGrid },
                React.createElement(Field, { label: 'Fecha', value: event.date }),
                React.createElement(Field, { label: 'Lugar', value: event.location, wide: true }),
              ),

              React.createElement(Divider),

              // Footer row: buyer + order ref
              React.createElement(
                View,
                { style: { flexDirection: 'row', justifyContent: 'space-between' } },
                React.createElement(Field, {
                  label: 'Comprador',
                  value: ticket.name,
                  accent: true,
                  accentColor: primary,
                }),
                ticket.orderRef
                  ? React.createElement(Field, { label: 'Ref. de pedido', value: ticket.orderRef })
                  : null
              )
            ),

            // ── Perforation + notches ──────────────────────────────────────
            React.createElement(
              View,
              { style: { position: 'relative' } },
              React.createElement(View, { style: styles.perforation }),
              React.createElement(View, { style: styles.notchTop }),
              React.createElement(View, { style: styles.notchBottom })
            ),

            // ── Stub ──────────────────────────────────────────────────────
            React.createElement(
              View,
              { style: styles.stub },
              React.createElement(
                View,
                { style: styles.qrWrapper },
                React.createElement(Image, {
                  src: qrCodeBase64,
                  style: styles.qrImage,
                })
              ),
              React.createElement(Text, { style: styles.scanLabel }, 'Escanear entrada'),
              React.createElement(Text, { style: styles.ticketId }, `ID: ${ticket.id.toUpperCase()}`)
            )
          )
        )
      )
    );

  return await renderToBuffer(React.createElement(MyDocument));
};