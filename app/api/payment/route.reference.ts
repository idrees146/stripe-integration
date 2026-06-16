// ─────────────────────────────────────────────────────────────────────────────
// REFERENCE ONLY — this is the HOSTED Checkout flow (redirect to checkout.stripe.com).
// It is intentionally NOT a live endpoint: Next.js only treats a file named `route.ts`
// as a route handler, so this `route.reference.ts` is never registered at /api/payment.
// The app uses the embedded flow instead (see app/api/embedded-checkout/route.ts).
// To re-enable this endpoint, rename this file back to `route.ts`.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getProductById } from "../../products";

// --- Stripe client (module-level singleton) ---
// Created once and reused across requests rather than per-call.
const secretKey = process.env.SECRET_KEY;
if (!secretKey) {
  // Fail fast on boot instead of throwing a cryptic error on the first request.
  throw new Error("Missing SECRET_KEY environment variable");
}
const stripe = new Stripe(secretKey);

interface CheckoutRequestBody {
  // We only accept the product id from the client and resolve the rest server-side.
  productId: string;
}

// Validate untrusted input before doing anything with it.
function parseBody(body: unknown): CheckoutRequestBody | null {
  if (typeof body !== "object" || body === null) return null;
  const { productId } = body as Record<string, unknown>;
  if (typeof productId !== "string" || productId.trim() === "") return null;
  return { productId: productId.trim() };
}

export const POST = async (request: NextRequest) => {
  try {
    // request.json() throws on an empty/malformed body — catch it and treat as invalid.
    const body = await request.json().catch(() => null);
    const data = parseBody(body);
    if (!data) {
      return NextResponse.json(
        { error: "Invalid request: 'productId' is required." },
        { status: 400 },
      );
    }

    // Resolve price + name on the server. This is the security boundary: the client
    // never gets to choose the amount it pays.
    const product = getProductById(data.productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    // In a real app these details come from your authenticated user or a form.
    // Creating the Customer up front lets us attach the session to a Customer record.
    const customer = await stripe.customers.create({
      email: "customer@example.com",
      name: "John Doe",
    });

    // Build absolute redirect URLs from the incoming request (works in dev and prod).
    const origin = request.headers.get("origin") ?? request.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      // Attach the checkout to the Customer we created above.
      customer: customer.id,
      // Collect a billing address at checkout and sync it back onto the Customer.
      billing_address_collection: "required",
      customer_update: { address: "auto", name: "auto" },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            product_data: { name: product.name },
            unit_amount: product.priceInCents, // amount in cents, from the server
          },
        },
      ],
      // Useful for reconciling the order later (e.g. from a webhook).
      metadata: { productId: product.id },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
    });

    // Return ONLY the redirect URL — never leak the full session object to the client.
    return NextResponse.json({ url: session.url });
  } catch (error) {
    // The Stripe SDK throws typed errors; surface a safe message and log details.
    if (error instanceof Stripe.errors.StripeError) {
      console.error("Stripe error:", error.message);
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode ?? 500 },
      );
    }
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Something went wrong creating the checkout session." },
      { status: 500 },
    );
  }
};
