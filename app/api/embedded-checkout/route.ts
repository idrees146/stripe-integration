import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getProductById } from "../../products";

// Module-level singleton, reused across requests.
const secretKey = process.env.SECRET_KEY;
if (!secretKey) {
  throw new Error("Missing SECRET_KEY environment variable");
}
const stripe = new Stripe(secretKey);

interface EmbeddedCheckoutBody {
  productId: string;
}

function parseBody(body: unknown): EmbeddedCheckoutBody | null {
  if (typeof body !== "object" || body === null) return null;
  const { productId } = body as Record<string, unknown>;
  if (typeof productId !== "string" || productId.trim() === "") return null;
  return { productId: productId.trim() };
}

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json().catch(() => null);
    const data = parseBody(body);
    if (!data) {
      return NextResponse.json(
        { error: "Invalid request: 'productId' is required." },
        { status: 400 },
      );
    }

    // Price is resolved on the server — the client only sends an id.
    const product = getProductById(data.productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const origin = request.headers.get("origin") ?? request.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      // The one switch that turns hosted Checkout into an in-page embedded form.
      // (This SDK names the mode "embedded_page".)
      ui_mode: "embedded_page",
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            product_data: { name: product.name },
            unit_amount: product.priceInCents,
          },
        },
      ],
      metadata: { productId: product.id },
      // Embedded mode uses a single return_url instead of success_url/cancel_url.
      // After payment, Stripe redirects the browser here with the session id.
      return_url: `${origin}/return?session_id={CHECKOUT_SESSION_ID}`,
    });

    // The browser needs the client_secret to mount the embedded form — NOT a redirect URL.
    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error("Stripe error:", error.message);
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode ?? 500 },
      );
    }
    console.error("Embedded checkout error:", error);
    return NextResponse.json(
      { error: "Something went wrong creating the checkout session." },
      { status: 500 },
    );
  }
};
