/**
 * stripe.service.ts
 * -----------------
 * Central Stripe SDK singleton for the entire backend.
 *
 * WHY A SINGLETON?
 * Instantiating `new Stripe(...)` is not free — it initialises HTTP keep-alive
 * pools and validates the API key format. Creating one instance here and
 * importing it everywhere avoids repeated initialisation and makes it easy to
 * swap keys (test ↔ live) in a single place.
 *
 * WHY NOT `require('stripe')(...)`?
 * The old file used CommonJS `require()` syntax inside a TypeScript module.
 * While Node.js can sometimes execute this, it bypasses TypeScript's type
 * system entirely — you lose all autocomplete, type-safety, and the compiler
 * cannot catch mistakes like passing wrong options. The correct approach is the
 * `import` statement below, which gives us full types from `@types/stripe` (or
 * the bundled types in the `stripe` npm package itself).
 */

import Stripe from 'stripe';

// ---------------------------------------------------------------------------
// Key validation — fail loudly at startup, not silently at the first payment
// ---------------------------------------------------------------------------
const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
    // We throw here so the process exits immediately with a clear message
    // rather than running for hours and only failing when a user tries to pay.
    throw new Error(
        '[Stripe] STRIPE_SECRET_KEY is not set. ' +
        'Add it to backend/.env (local) and to the backend environment in docker-compose.yml (Docker). ' +
        'Keys start with sk_test_ (test mode) or sk_live_ (live mode).'
    );
}

/**
 * Pre-configured Stripe client.
 * Import this in any controller that needs to call the Stripe API:
 *   import { stripe } from '../services/stripe.service';
 */
export const stripe = new Stripe(secretKey, {
    /**
     * apiVersion: pin this to the exact version you tested against.
     * Stripe increments the API version independently of the npm package, so
     * pinning here prevents unexpected breaking changes after upgrading the SDK.
     */
    apiVersion: '2026-03-25.dahlia',
});
