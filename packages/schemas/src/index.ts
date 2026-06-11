import { z } from 'zod';

export const EventSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(100, "Máximo 100 caracteres"),
  tagline: z.string().max(200, "Máximo 200 caracteres").optional().nullable(),
  date: z.string().min(1, "La fecha es obligatoria"), // free text e.g. "SÁB 15 NOV"
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  location: z.string().min(1, "La ubicación es obligatoria"),
  lineup: z.string().optional().nullable(),
  tickerText: z.string().optional().nullable(),
  manifesto: z.string().optional().nullable(),
  manifestoLabel: z.string().optional().nullable(),
  ctaLabel: z.string().default("COMPRAR ENTRADA"),
  logoText1: z.string().optional().nullable().default(""),
  emailSubject: z.string().default("Entrada para PartyOn"),
  emailBody: z.string().default("Gracias por tu compra. Te adjuntamos tu entrada en este correo."),
  showGallery: z.boolean().default(false),
  galleryTitle: z.string().optional().nullable(),
  showNewsletter: z.boolean().default(false),
  newsletterText: z.string().optional().nullable(),
  newsletterSubtext: z.string().optional().nullable(),
  isPublished: z.boolean().default(false),
});

export const TicketTypeSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().optional().nullable(),
  price: z.number().min(0, "El precio no puede ser negativo"),
  maxStock: z.number().int().min(0, "El stock no puede ser negativo"),
  saleStartsAt: z.string().datetime().nullable().optional(),
  saleEndsAt: z.string().datetime().nullable().optional(),
  forceSoldOut: z.boolean().default(false),
});

export const CheckoutSchema = z.object({
  buyerName: z.string().min(2, "Mínimo 2 caracteres").max(100, "Máximo 100 caracteres"),
  buyerEmail: z.string().email("Email inválido"),
  ticketId: z.string().min(1, "Tipo de entrada obligatorio"),
  quantity: z.number().int().min(1, "Mínimo 1 entrada").max(10, "Máximo 10 entradas"),
  paymentIntentId: z.string().optional().nullable(),
});

export const LoginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const CreateUserSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().email("Email inválido"),
  role: z.enum(['DEV', 'ADMIN', 'STAFF'], {
    errorMap: () => ({ message: "Rol inválido" })
  }),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").optional(),
  email: z.string().email("Email inválido").optional(),
  role: z.enum(['DEV', 'ADMIN', 'STAFF'], {
    errorMap: () => ({ message: "Rol inválido" })
  }).optional(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional(),
});

export const ResetPasswordSchema = z.object({
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const ExpenseSchema = z.object({
  name: z.string().min(1, "El concepto es obligatorio").max(100, "Máximo 100 caracteres"),
  amount: z.number().positive("El importe debe ser mayor que cero"),
  category: z.string().min(1, "La categoría es obligatoria").max(50),
  eventId: z.string().min(1, "El ID de evento es obligatorio")
});

export type EventFormData = z.infer<typeof EventSchema>;
export type TicketTypeFormData = z.infer<typeof TicketTypeSchema>;
export type CheckoutFormData = z.infer<typeof CheckoutSchema>;
export type LoginFormData = z.infer<typeof LoginSchema>;
export type CreateUserFormData = z.infer<typeof CreateUserSchema>;
export type UpdateUserFormData = z.infer<typeof UpdateUserSchema>;
export type ResetPasswordFormData = z.infer<typeof ResetPasswordSchema>;
export type ExpenseFormData = z.infer<typeof ExpenseSchema>;

