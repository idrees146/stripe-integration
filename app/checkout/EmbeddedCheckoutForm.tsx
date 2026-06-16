"use client";

import { useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";

// loadStripe is called once at module scope (not on every render) so Stripe.js
// loads a single time. The PUBLISHABLE key is safe to expose in the browser.
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

export default function EmbeddedCheckoutForm({
  productId,
}: {
  productId: string;
}) {
  // The provider calls this to fetch the session's client_secret from our API.
  // The actual card fields are rendered by Stripe inside a cross-origin iframe —
  // they never touch our DOM or server.
  const fetchClientSecret = useCallback(async () => {
    const res = await fetch("/api/embedded-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to start checkout");
    return data.clientSecret as string;
  }, [productId]);

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ fetchClientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
