# PartyOn — Implementation Plan v2
## PDF Fix · Promotores · i18n

> Fecha: 11 de Junio 2026 | Estado: **Decisiones cerradas — Listo para ejecución**

---

## Decisiones de Arquitectura (Cerradas)

| # | Pregunta | Decisión |
|---|---|---|
| 1 | ¿Promotores con login o código de seguimiento? | **Sólo código de seguimiento (MVP).** El admin crea el perfil y el código; la liquidación de comisiones es manual vía analytics. Portal de lectura para V2. |
| 2 | ¿Tipo de descuento? | **PERCENTAGE + FIXED + 100% gratuito.** Si el precio final es 0€ tras aplicar el código, se omite Stripe completamente y el sistema emite el ticket directamente. |
| 3 | ¿Detección de idioma automática o manual? | **Automática (navegador) + conmutador manual en el header del storefront.** Fallback a ES o PT según el navegador. |

---

## 1. Bug Fix — PDF Layout

### Diagnóstico

El archivo [`pdf.service.ts`](file:///c:/Users/Antonio/Desktop/PartyOn_web/backend/src/services/pdf.service.ts) usa alturas fijas que deben sumar exactamente `H = 800px`:

| Sección | Altura actual | Problema |
|---|---|---|
| `flyerContainer` | `height: 420` fijo | Una imagen portrait puede desbordar |
| `detailsSection` | `height: 200` fijo | Se empuja si la sección anterior se desborda |
| `separator` | `height: 4` fijo | — |
| `bottomSection` | `flex: 1` | Recibe lo que sobra — puede ser negativo |

**Causa raíz**: `objectFit: 'contain'` en `@react-pdf/renderer` **no recorta** la imagen a su contenedor. Si la imagen tiene un aspect-ratio más vertical que `400×420`, el renderer la expande más allá de los 420px asignados, empujando todo el layout hacia abajo y sacando el QR de la página.

### Solución — dos capas de defensa

**Capa 1 — Pre-procesar la imagen con `sharp`**

Antes de pasarla al renderer, normalizar la imagen a dimensiones exactas fijas: `400×320px` con `fit: 'contain'` + relleno de fondo con el color primario del evento. `contain` garantiza que la imagen **nunca se recorta** — se escala para caber entera y el espacio sobrante (letterbox) se rellena con el color del evento, que visualmente se integra con el diseño del ticket.

> **¿Por qué no `cover`?** Con `cover`, sharp recortaría la imagen para llenar los 320px exactos. Para un flyer de evento donde el nombre del artista o el logo puede estar en los bordes, recortar es inaceptable.

**Capa 2 — Eliminar alturas fijas del layout PDF**

Convertir el layout a proporciones con `flex` para que el documento sea resiliente incluso si por algún motivo el pre-procesado fallara.

### Archivos a modificar

---

#### [MODIFY] [pdf.service.ts](file:///c:/Users/Antonio/Desktop/PartyOn_web/backend/src/services/pdf.service.ts)

**Cambio 1 — Añadir función `processHeroImage` con `sharp`**

```typescript
import sharp from 'sharp';

// Constantes de layout del ticket
const W = 400;
const HERO_H = 320;  // altura fija garantizada tras pre-procesado

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
    .resize(W, HERO_H, {
      fit: 'contain',      // nunca recorta — escala para que quepa entera
      background: bgColor, // rellena el letterbox con el color del evento
    })
    .jpeg({ quality: 85 })
    .toBuffer();
};
```

Llamar a esta función después de cargar `flyerSrc` (sea de disco local o remoto):

```typescript
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
```

**Cambio 2 — Layout con alturas controladas (Capa 2)**

```diff
 flyerContainer: {
   width: '100%',
-  height: 420,
+  height: HERO_H,   // 320px — siempre coincide con el buffer pre-procesado
   backgroundColor: '#f0ede8',
   alignItems: 'center',
   justifyContent: 'center',
 },
 flyerImage: {
   width: '100%',
   height: '100%',
   // objectFit no es problema aquí porque sharp ya entregó un buffer
   // exactamente de W × HERO_H — la imagen siempre llena el contenedor.
+  objectFit: 'cover',  // fill el contenedor (el buffer ya tiene las dims exactas)
 },
 fallbackBanner: {
   width: W,
-  height: 420,
+  height: HERO_H,
   ...
 },
 detailsSection: {
-  height: 200,
+  minHeight: 190,         // mínimo garantizado, no desborda la página
   backgroundColor: '#f0ede8',
   ...
 },
 bottomSection: {
   flex: 1,
+  minHeight: 250,         // garantiza espacio suficiente para el QR (110px) + márgenes
   backgroundColor: '#ffffff',
   ...
 },
```

**Cambio 3 — Nota sobre la altura de la página**

La altura `H = 800` queda intacta. Con `HERO_H = 320` + `detailsSection minHeight 190` + `separator 4` + `bottomSection minHeight 250` = 764px mínimo garantizado. El `flex: 1` del bottomSection absorbe los 36px restantes.

---

#### [MODIFY] [backend/package.json](file:///c:/Users/Antonio/Desktop/PartyOn_web/backend/package.json)

```diff
 "dependencies": {
+  "sharp": "^0.33.4",
   ...
 }
```

> [!WARNING]
> **Sharp y Docker**: `sharp` compila binarios nativos de C++. El `node_modules` del contenedor Docker **no debe compartirse** con el host. Verificar que el `docker-compose.yml` usa un volumen anónimo para `backend/node_modules` (aislando los binarios del contenedor) antes de hacer `npm install`. Si ya está configurado así (como en el setup del frontend), basta con reconstruir la imagen: `docker-compose up -d --build`.

---

## 2. Sistema de Promotores + Códigos de Descuento

### Modelo de negocio (MVP)

```
Admin                   Promotor externo             Comprador
  │                          │                           │
  │ Crea perfil "DJ Álvaro"  │                           │
  │ + código "MUNDOALVARO"   │                           │
  │──────────────────────────▶│                           │
  │                          │ Comparte el código        │
  │                          │──────────────────────────▶│
  │                          │                           │ Introduce código
  │                          │                           │ en el checkout
  │                          │                 ┌─────────┤
  │                          │                 │ Descuento│
  │                          │                 │ aplicado │
  │                          │                 └─────────┤
  │ Consulta analytics        │                           │
  │ "MUNDOALVARO: 47 ventas"  │                           │
  │◀──────────────────────────│                           │
  │ Liquida comisión manual   │                           │
```

No hay portal de promotor, no hay login externo. El promotor sólo recibe su código y el admin revisa las analytics.

---

### 2.1 Schema de Prisma

#### [MODIFY] [schema.prisma](file:///c:/Users/Antonio/Desktop/PartyOn_web/backend/prisma/schema.prisma)

**Nuevos modelos:**

```prisma
model Promoter {
  id        String   @id @default(cuid())
  eventId   String
  event     Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  name      String          // "DJ Álvaro", "Lista VIP Fila"
  email     String?         // Contacto del promotor (solo para el admin, no visible en storefront)
  phone     String?
  notes     String?         // Notas internas del admin
  isActive  Boolean  @default(true)
  
  discountCodes DiscountCode[]
  orders        Order[]        @relation("PromoterOrders")
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model DiscountCode {
  id         String   @id @default(cuid())
  promoterId String
  promoter   Promoter @relation(fields: [promoterId], references: [id], onDelete: Cascade)
  
  // El código se almacena SIEMPRE en mayúsculas (normalizado en el controlador)
  code       String   @unique
  
  // type: "PERCENTAGE" (value = 0-100%) | "FIXED" (value = euros) | "FREE" (value ignorado, siempre 100%)
  type       String   @default("PERCENTAGE")
  value      Float    @default(0)
  
  maxUses    Int?     // null = ilimitado
  usedCount  Int      @default(0)
  isActive   Boolean  @default(true)
  
  // Restricciones opcionales
  validFrom   DateTime?
  validUntil  DateTime?
  
  orders     Order[]  @relation("DiscountCodeOrders")
  
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

**Modificaciones en modelos existentes:**

```prisma
model Order {
  // ... campos existentes ...
  
  // Nuevos campos de promotor y descuento
  promoterId     String?
  promoter       Promoter?     @relation("PromoterOrders", fields: [promoterId], references: [id])
  discountCodeId String?
  discountCode   DiscountCode? @relation("DiscountCodeOrders", fields: [discountCodeId], references: [id])
  discountAmount Float         @default(0)  // Importe descontado en €, para el registro histórico
}

model Event {
  // ... campos existentes ...
  promoters Promoter[]
}
```

**Migración requerida:**

```bash
cd backend
npx prisma migrate dev --name add_promoter_discount_system
```

---

### 2.2 Endpoint público — Validar código de descuento

#### [NEW] ruta pública en [api.route.ts](file:///c:/Users/Antonio/Desktop/PartyOn_web/backend/src/routes/api.route.ts)

```typescript
// POST /api/validate-discount
// Llamado desde el storefront antes de crear el PaymentIntent
router.post('/validate-discount', validateDiscountCode);
```

**Contrato de la respuesta:**

```typescript
// Request body
{ code: string; ticketTypeId: string; quantity: number }

// Response (éxito)
{
  valid: true;
  codeId: string;
  promoterName: string;
  type: 'PERCENTAGE' | 'FIXED' | 'FREE';
  value: number;
  discountAmount: number;  // euros descontados (calculado por el backend)
  finalPrice: number;      // precio final total para `quantity` tickets
  isFree: boolean;         // true si finalPrice === 0
}

// Response (fallo)
{ valid: false; reason: 'NOT_FOUND' | 'EXPIRED' | 'EXHAUSTED' | 'INACTIVE' }
```

---

### 2.3 Lógica de normalización de códigos

> **Regla de oro**: el código se normaliza a `UPPERCASE + TRIM` en **todos** los puntos de entrada: al crear, al actualizar y al validar. Esto evita colisiones entre `djvip`, `DJVIP` y `DjVip`.

```typescript
// En promoter.controller.ts — helper
const normalizeCode = (raw: string): string => raw.trim().toUpperCase();

// Al crear/actualizar un código:
const code = normalizeCode(req.body.code);
// → Se guarda en BD siempre normalizado

// Al validar en el checkout:
const code = normalizeCode(req.body.code);
const discountCode = await prisma.discountCode.findUnique({ where: { code } });
```

---

### 2.4 Lógica de checkout con descuento — Bypass de Stripe para precio 0

#### [MODIFY] [checkout.controller.ts](file:///c:/Users/Antonio/Desktop/PartyOn_web/backend/src/controllers/checkout.controller.ts)

**En `createPaymentIntent`:**

```typescript
export const createPaymentIntent = async (req: Request, res: Response) => {
  const { ticketId, quantity, buyerName, buyerEmail, discountCodeId } = req.body;
  
  // ... validaciones existentes ...
  
  let discountAmount = 0;
  let resolvedCode: DiscountCode | null = null;
  
  if (discountCodeId) {
    resolvedCode = await prisma.discountCode.findUnique({ where: { id: discountCodeId } });
    // ... validar que sigue activo, no expirado, no agotado ...
    discountAmount = calculateDiscount(resolvedCode, ticketType.price, quantity);
  }
  
  const baseAmount = ticketType.price * quantity;
  const finalAmount = Math.max(0, baseAmount - discountAmount);
  
  // ── BYPASS DE STRIPE PARA PRECIO 0 ──────────────────────────────────────
  // Stripe no permite PaymentIntents de 0 céntimos.
  // Si el código de descuento hace que el precio final sea 0, respondemos
  // con una señal especial que el frontend usará para ir directamente
  // al endpoint /checkout sin pasar por el formulario de pago de Stripe.
  if (finalAmount === 0) {
    return res.json({ 
      clientSecret: null, 
      isFree: true,
      // Pasamos los datos necesarios para que el frontend llame directamente a /checkout
      freeOrderData: { ticketId, quantity, buyerName, buyerEmail, discountCodeId }
    });
  }
  
  const amountInCents = Math.round(finalAmount * 100);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: 'eur',
    automatic_payment_methods: { enabled: true },
    metadata: {
      eventId: ticketType.eventId,
      ticketTypeId: ticketId,
      quantity: String(quantity),
      buyerName,
      buyerEmail,
      discountCodeId: discountCodeId ?? '',
      discountAmount: String(discountAmount),
    },
  });
  
  res.json({ clientSecret: paymentIntent.client_secret, isFree: false });
};
```

**En `processCheckout` — flujo gratuito:**

```typescript
export const processCheckout = async (req: Request, res: Response) => {
  const { buyerName, buyerEmail, ticketId, quantity, paymentIntentId, 
          marketingConsent, discountCodeId, isFreeOrder } = req.body;
  
  // Si es un pedido gratuito, saltamos la verificación de Stripe
  if (!isFreeOrder) {
    // ... verificación de Stripe existente ...
  }
  
  // Dentro de la transacción, si discountCodeId:
  // 1. Verificar que el código sigue válido (re-check atómico)
  // 2. Incrementar usedCount
  // 3. Asociar promoterId y discountCodeId al Order
  // 4. Registrar discountAmount en el Order
  
  const { tickets, order } = await prisma.$transaction(async (tx) => {
    // ... lógica existente ...
    
    let promoterId: string | null = null;
    let resolvedDiscountAmount = 0;
    
    if (discountCodeId) {
      const code = await tx.discountCode.findUnique({
        where: { id: discountCodeId },
        include: { promoter: true }
      });
      
      if (!code || !code.isActive) throw new Error('Código de descuento ya no es válido');
      if (code.maxUses && code.usedCount >= code.maxUses) throw new Error('Código agotado');
      
      resolvedDiscountAmount = calculateDiscount(code, ticketType.price, quantity);
      promoterId = code.promoterId;
      
      await tx.discountCode.update({
        where: { id: discountCodeId },
        data: { usedCount: { increment: 1 } }
      });
    }
    
    const totalPaid = Math.max(0, ticketType.price * quantity - resolvedDiscountAmount);
    
    const order = await tx.order.create({
      data: {
        // ... campos existentes ...
        totalPaid,
        promoterId,
        discountCodeId: discountCodeId ?? null,
        discountAmount: resolvedDiscountAmount,
      }
    });
    
    // ... crear tickets ...
    return { tickets, order };
  });
  
  // Para pedidos gratuitos: enviar el email/PDF de forma inmediata
  // (no es async fire-and-forget, es un await directo porque no hay 
  // riesgo de timeout — el usuario ya "pagó" con 0€)
  if (isFreeOrder) {
    await deliverTickets(tickets, ticketId); // función extraída del IIFE actual
  } else {
    // El fire-and-forget asíncrono existente
    (async () => { await deliverTickets(tickets, ticketId); })();
  }
  
  res.json({ success: true, orderId: order.id, tickets });
};
```

**Helper de cálculo de descuento (reutilizable):**

```typescript
function calculateDiscount(code: DiscountCode, unitPrice: number, quantity: number): number {
  const baseAmount = unitPrice * quantity;
  if (code.type === 'FREE') return baseAmount;                              // 100% gratuito
  if (code.type === 'FIXED') return Math.min(code.value, baseAmount);      // no puede ser negativo
  if (code.type === 'PERCENTAGE') return baseAmount * (code.value / 100);  // 0-100%
  return 0;
}
```

---

### 2.5 Controlador de Promotores

#### [NEW] [promoter.controller.ts](file:///c:/Users/Antonio/Desktop/PartyOn_web/backend/src/controllers/promoter.controller.ts)

Endpoints CRUD:

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/admin/events/:eventId/promoters` | Listar promotores con sus códigos y conteo de ventas |
| `POST` | `/admin/events/:eventId/promoters` | Crear promotor |
| `PUT` | `/admin/promoters/:id` | Editar datos del promotor |
| `DELETE` | `/admin/promoters/:id` | Eliminar promotor (cascade a sus códigos) |
| `POST` | `/admin/promoters/:id/codes` | Crear código de descuento (normaliza a UPPERCASE) |
| `PATCH` | `/admin/discount-codes/:id` | Activar/desactivar código |
| `DELETE` | `/admin/discount-codes/:id` | Eliminar código |
| `GET` | `/admin/events/:eventId/promoters/analytics` | Ventas, revenue e ingresos netos por promotor |

**Estructura de la respuesta de analytics por promotor:**

```typescript
{
  promoters: [
    {
      id: string;
      name: string;
      totalOrders: number;      // pedidos con su código
      totalTickets: number;     // tickets emitidos
      grossRevenue: number;     // ingresos brutos (sin descuento)
      netRevenue: number;       // ingresos reales cobrados
      totalDiscount: number;    // total descontado por sus códigos
      codes: [
        { code: string; usedCount: number; maxUses: number | null; isActive: boolean }
      ]
    }
  ]
}
```

---

### 2.6 Frontend — Panel de Admin

#### [NEW] página [Promotores.tsx](file:///c:/Users/Antonio/Desktop/PartyOn_web/frontend/src/pages/admin/Promotores.tsx)

UI con dos secciones colapsables por promotor:
- **Header del promotor**: nombre, email, estado (activo/inactivo), botón editar/eliminar
- **Tabla de códigos**: código, tipo, valor, usos actuales / máximo, válido hasta, estado, botón eliminar
- **Métricas rápidas**: pedidos, tickets, revenue bruto vs neto
- **Botón**: "+ Añadir código" → modal inline
- **Botón**: "+ Nuevo promotor" → modal de creación

#### [MODIFY] [AdminSidebar.tsx](file:///c:/Users/Antonio/Desktop/PartyOn_web/frontend/src/components/admin/AdminSidebar.tsx)

Añadir entrada "Promotores" visible para `ADMIN` y `DEV`:

```typescript
{ icon: <Tag />, label: 'Promotores', path: '/admin/promotores', roles: ['ADMIN', 'DEV'] }
```

#### [MODIFY] [App.tsx](file:///c:/Users/Antonio/Desktop/PartyOn_web/frontend/src/App.tsx)

Registrar la ruta `/admin/promotores` protegida con `RoleGuard`.

---

### 2.7 Frontend — Storefront (Checkout)

#### [MODIFY] [StripeCheckout.tsx](file:///c:/Users/Antonio/Desktop/PartyOn_web/frontend/src/components/StripeCheckout.tsx)

Añadir sección de código de descuento entre los campos de datos personales y el botón de pago:

```
┌─────────────────────────────────────────┐
│ ¿Tienes un código de descuento?         │
│ ┌─────────────────────┐ ┌────────────┐  │
│ │  MUNDOALVARO        │ │  Aplicar   │  │
│ └─────────────────────┘ └────────────┘  │
│                                         │
│  ✅ ¡Descuento aplicado! -5€            │
│     (código de DJ Álvaro)               │
└─────────────────────────────────────────┘
```

**Flujo con `isFree: true`:**

```
Usuario aplica código FREE
→ Frontend llama a /validate-discount → recibe { isFree: true }
→ Frontend llama a /create-payment-intent → recibe { clientSecret: null, isFree: true }
→ Frontend OMITE el formulario de tarjeta de Stripe
→ Frontend muestra "Tu entrada es gratuita — confirma tu email"
→ Frontend llama directamente a /checkout con { isFreeOrder: true, discountCodeId }
→ Backend genera ticket + email de forma síncrona
→ Frontend muestra pantalla de éxito
```

---

## 3. Internacionalización (i18n)

### Arquitectura

- **Librería**: `react-i18next` + `i18next-browser-languagedetector`
- **Alcance**: solo el **storefront** (`Customer.tsx` y sus sub-componentes). El panel de admin permanece en español.
- **Idiomas**: `es` (español, fallback) y `pt` (portugués).
- **Detección**: idioma del navegador → si no coincide, fallback a `es`.
- **Conmutador**: botón `ES | PT` visible en el header del storefront.

---

### 3.1 Instalación

```bash
cd frontend
npm install react-i18next i18next i18next-browser-languagedetector
```

---

### 3.2 Archivos a crear

#### [NEW] [frontend/src/i18n/index.ts](file:///c:/Users/Antonio/Desktop/PartyOn_web/frontend/src/i18n/index.ts)

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import es from './locales/es.json';
import pt from './locales/pt.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { es: { translation: es }, pt: { translation: pt } },
    fallbackLng: 'es',
    supportedLngs: ['es', 'pt'],
    detection: {
      order: ['localStorage', 'navigator'],  // localStorage primero para respetar la selección manual
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
```

#### [NEW] [frontend/src/i18n/locales/es.json](file:///c:/Users/Antonio/Desktop/PartyOn_web/frontend/src/i18n/locales/es.json)

```json
{
  "nav": {
    "buyTickets": "COMPRAR ENTRADA"
  },
  "checkout": {
    "title": "Comprar Entrada",
    "nameLabel": "Tu Nombre",
    "namePlaceholder": "Nombre Apellido",
    "emailLabel": "Tu Email",
    "emailPlaceholder": "tu@email.com",
    "quantityLabel": "Cantidad",
    "discountCode": "¿Tienes un código de descuento?",
    "discountPlaceholder": "Ej: MUNDOALVARO",
    "applyCode": "Aplicar",
    "discountApplied": "¡Descuento aplicado!",
    "discountBy": "código de {{name}}",
    "total": "Total",
    "freeEntry": "Tu entrada es gratuita",
    "freeConfirm": "Confirma tu email para recibir tu entrada",
    "buyButton": "COMPRAR",
    "confirmFreeButton": "CONFIRMAR ENTRADA GRATUITA",
    "processing": "Procesando...",
    "marketingConsent": "Acepto recibir comunicaciones de marketing sobre próximos eventos"
  },
  "success": {
    "title": "¡Tu entrada está en camino!",
    "message": "Te hemos enviado un email con tu(s) entrada(s) en PDF. Revisa también la carpeta de spam."
  },
  "errors": {
    "stockInsufficient": "Stock insuficiente",
    "paymentFailed": "El pago no se pudo completar. Inténtalo de nuevo.",
    "invalidCode": "Código de descuento inválido o expirado",
    "codeExhausted": "Este código ya ha alcanzado su límite de usos",
    "genericError": "Algo salió mal. Por favor, contacta con el organizador."
  },
  "storefront": {
    "lineup": "LINEUP",
    "gallery": "GALERÍA",
    "newsletter": {
      "subscribe": "SUSCRIBIRME",
      "placeholder": "tu@email.com"
    }
  }
}
```

#### [NEW] [frontend/src/i18n/locales/pt.json](file:///c:/Users/Antonio/Desktop/PartyOn_web/frontend/src/i18n/locales/pt.json)

```json
{
  "nav": {
    "buyTickets": "COMPRAR BILHETE"
  },
  "checkout": {
    "title": "Comprar Bilhete",
    "nameLabel": "O Teu Nome",
    "namePlaceholder": "Nome Apelido",
    "emailLabel": "O Teu Email",
    "emailPlaceholder": "o.teu@email.com",
    "quantityLabel": "Quantidade",
    "discountCode": "Tens um código de desconto?",
    "discountPlaceholder": "Ex: MUNDOALVARO",
    "applyCode": "Aplicar",
    "discountApplied": "Desconto aplicado!",
    "discountBy": "código de {{name}}",
    "total": "Total",
    "freeEntry": "O teu bilhete é gratuito",
    "freeConfirm": "Confirma o teu email para receber o bilhete",
    "buyButton": "COMPRAR",
    "confirmFreeButton": "CONFIRMAR BILHETE GRATUITO",
    "processing": "A processar...",
    "marketingConsent": "Aceito receber comunicações de marketing sobre próximos eventos"
  },
  "success": {
    "title": "O teu bilhete está a caminho!",
    "message": "Enviámos um email com o(s) teu(s) bilhete(s) em PDF. Verifica também a pasta de spam."
  },
  "errors": {
    "stockInsufficient": "Stock insuficiente",
    "paymentFailed": "O pagamento não pôde ser concluído. Tenta novamente.",
    "invalidCode": "Código de desconto inválido ou expirado",
    "codeExhausted": "Este código já atingiu o limite de utilizações",
    "genericError": "Algo correu mal. Por favor, contacta o organizador."
  },
  "storefront": {
    "lineup": "LINEUP",
    "gallery": "GALERIA",
    "newsletter": {
      "subscribe": "SUBSCREVER",
      "placeholder": "o.teu@email.com"
    }
  }
}
```

---

### 3.3 Archivos a modificar

#### [MODIFY] [frontend/src/main.tsx](file:///c:/Users/Antonio/Desktop/PartyOn_web/frontend/src/main.tsx)

```typescript
import './i18n/index';  // ← Importar antes que App para garantizar inicialización
import App from './App';
```

#### [MODIFY] Componentes del storefront

Reemplazar todos los strings literales de cara al cliente con `useTranslation()`:

| Archivo | Cambios |
|---|---|
| `StripeCheckout.tsx` | Todos los labels, placeholders, botones y mensajes de error |
| `Customer.tsx` | Botón CTA, secciones |
| `sections/TicketSection.tsx` | Textos de entrada |
| Otros componentes de `sections/` | Textos del storefront |

#### [NEW] Conmutador de idioma en el header

Componente `LanguageSwitcher.tsx` integrado en el header del storefront:

```tsx
// Muestra "ES | PT" con el idioma activo resaltado
// onClick → i18n.changeLanguage('pt') o i18n.changeLanguage('es')
// El selector usa localStorage vía i18next-browser-languagedetector para persistir
```

```
┌──────────────────────────────────────────────────────────┐
│  PARTY ON            [ES] · PT                  ≡        │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Auditoría Pre-Deploy Actualizada

### ✅ Implementado desde la auditoría del 04-Jun-2026

| Ítem | Estado anterior | Estado actual |
|---|---|---|
| Webhook de Stripe | 🔴 Crítico | ✅ `webhook.controller.ts` existe |
| Rate limiting en auth/pago | 🔴 No implementado | ✅ `rateLimit.middleware` activo |
| User Management UI | 🔴 No implementada | ✅ `Users.tsx` implementado |
| Gestión de Gastos (CRUD) | 🔴 Solo visualización | ✅ `expense.controller.ts` + `ExpenseModal.tsx` |

### 🛑 BLOQUEANTES — Deben resolverse antes del lanzamiento

| ID | Problema | Fichero afectado | Acción |
|---|---|---|---|
| **B1** | Stripe en modo TEST | `backend/.env` | Cambiar `sk_test_` → `sk_live_` + `VITE_STRIPE_PUBLIC_KEY` → pk live |
| **B2** | Email desde `onboarding@resend.dev` | `email.service.ts` | Configurar dominio propio verificado en Resend (`tickets@partyon.pt`) |
| **B3** | `POSTGRES_PASSWORD: adminpassword` | `docker-compose.yml` | Mover a `.env` protegido con contraseña segura |
| **B4** | `prisma db push --accept-data-loss` | `docker-compose.yml` | Cambiar a `npx prisma migrate deploy` |
| **B5** | `JWT_SECRET` sin verificar entropía | `backend/.env` | Generar con `openssl rand -base64 64` (mínimo 64 chars) |

> [!CAUTION]
> B3 y B4 son **letales en producción**. `--accept-data-loss` puede destruir datos irreversiblemente. Ejecutar la migración a variables de entorno seguras inmediatamente tras cerrar el desarrollo de las features de este plan.

### ⚠️ Pendientes post-sprint

| ID | Problema | Impacto |
|---|---|---|
| **P1** | Newsletter sin backend (`Subscriber` model) | Formulario decorativo |
| **P2** | Galería — UI incompleta (API existe) | No se pueden subir imágenes desde el panel |
| **P3** | Recuperación de contraseña | Admin bloqueado sin acceso directo a BD |
| **P4** | Backups automáticos de BD | Sin DR ante fallo del servidor |
| **P5** | HTTPS en producción (Caddy ya presente) | Requerido por Stripe para webhooks |
| **P6** | `console.log(email)` en `auth.controller.ts` | Riesgo de filtrar datos en logs del servidor |

### 📊 Resumen Ejecutivo

| Categoría | Estado |
|---|---|
| Núcleo de pagos (Stripe) | 🟢 Producción-ready |
| Checkout y emisión de tickets | 🟢 Producción-ready |
| Scanner de validación | 🟢 Producción-ready |
| Venta en puerta (Walk-in) | 🟢 Producción-ready |
| Configuración del evento | 🟢 Producción-ready |
| Webhook de Stripe | 🟢 Implementado ✨ |
| Rate limiting (auth/pago) | 🟢 Implementado ✨ |
| Gestión de usuarios | 🟢 Implementado ✨ |
| Gestión de gastos | 🟢 Implementado ✨ |
| PDF Bug (QR partido) | 🔴 Bug activo → este plan |
| Sistema de Promotores | 🔴 No implementado → este plan |
| i18n (ES/PT) | 🔴 No implementado → este plan |
| Análisis financiero | 🟡 MVP funcional |
| Newsletter | 🔴 Solo UI decorativa |
| Recuperación de contraseña | 🔴 No existe |
| Seguridad (credenciales, HTTPS) | 🔴 Pendiente de producción |
| Backups de BD | 🔴 No configurados |

---

## Orden de Ejecución Recomendado

```
Sprint A (días 1-2):
  [1] PDF Bug Fix — sharp install + layout refactor
      → Test con imágenes portrait, landscape y sin imagen
  
Sprint B (días 3-7):
  [2] Schema Prisma — Promoter + DiscountCode + migración
  [3] Backend — promoter.controller.ts + rutas
  [4] Backend — Modificar checkout para descuentos + bypass FREE
  [5] Frontend Admin — Página Promotores + Sidebar
  [6] Frontend Storefront — Campo de código en StripeCheckout
  
Sprint C (días 8-10):
  [7] i18n setup — i18next + archivos de traducción
  [8] i18n — Migrar StripeCheckout.tsx
  [9] i18n — Migrar Customer.tsx + secciones
  [10] LanguageSwitcher en header

Post-sprint (antes del lanzamiento):
  [B1] → Stripe LIVE keys
  [B2] → Dominio email verificado en Resend
  [B3] → POSTGRES_PASSWORD a .env seguro
  [B4] → prisma migrate deploy en docker-compose
  [B5] → JWT_SECRET con entropía correcta
```

---

## Plan de Verificación

### Bug PDF
- [ ] Generar ticket con hero image portrait (tall, ej: 1080×1920)
- [ ] Generar ticket con hero image landscape (wide, ej: 1920×1080)
- [ ] Generar ticket con hero image cuadrada
- [ ] Generar ticket sin hero image (fallback banner)
- [ ] En todos los casos: el QR aparece completo, no cortado ni en segunda página

### Promotores
- [ ] Crear promotor desde el panel → aparece en la lista
- [ ] Crear código `djvip` → se guarda como `DJVIP` en BD
- [ ] Crear código `DJVIP` → error de duplicado (unique constraint)
- [ ] Aplicar código `djvip` (minúsculas) en el checkout → se normaliza y aplica
- [ ] Descuento PERCENTAGE 20% en ticket de 10€ × 2 = 4€ descontados
- [ ] Descuento FIXED 5€ en ticket de 10€ × 1 = 5€ descontados
- [ ] Descuento FREE → campo de tarjeta no aparece → se emite ticket directamente
- [ ] Código expirado → error claro en el storefront
- [ ] Código agotado (`maxUses` alcanzado) → error claro
- [ ] Analytics: las ventas con código aparecen asociadas al promotor correcto

### i18n
- [ ] Navegador en `pt-PT` → storefront en portugués automáticamente
- [ ] Navegador en `es-ES` → storefront en español automáticamente
- [ ] Navegador en `fr-FR` → fallback a español
- [ ] Click en `PT` en el header → cambia a portugués + persiste en recarga
- [ ] Click en `ES` en el header → cambia a español + persiste en recarga
- [ ] Panel de admin → **no afectado** por el cambio de idioma
