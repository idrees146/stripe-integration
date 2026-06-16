# Stripe Checkout — Minimal Integration Guide

A reference for wiring up **Stripe Checkout (hosted page)** in a Next.js App Router
project. This is the simplest production-shaped flow: the user clicks *Buy*, your
server creates a Checkout Session, and Stripe hosts the payment page for you.

---

## The flow

```
Browser                     Your API (server)              Stripe
   │  POST /api/payment            │                          │
   │  { productId }  ───────────►  │                          │
   │                               │  look up price (server)  │
   │                               │  create Customer ──────► │
   │                               │  create Checkout Session ►
   │                               │  ◄──────────── session.url
   │  ◄─────────────  { url }      │                          │
   │                                                          │
   │  window.location = url  ───────────────────────────────►│  (Stripe-hosted page)
   │                                                          │  user pays
   │  ◄────── redirect to success_url?session_id=... ─────────│
   │  /success confirms payment via sessions.retrieve ───────►│
```

**Key idea:** the browser never sees your secret key and never sets the price.
It only sends an id; the server decides what to charge.

---

## 1. Setup

```bash
npm install stripe        # server SDK
```

`.env.local` (git-ignored):

```bash
SECRET_KEY=sk_test_...    # convention is STRIPE_SECRET_KEY; either works
```

> Test keys start with `sk_test_`. Never commit them. If one leaks, roll it in the
> Stripe Dashboard.

---

## 2. The API route — create a Checkout Session

`app/api/payment/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getProductById } from "../../products";

const stripe = new Stripe(process.env.SECRET_KEY!); // singleton, reused per request

export const POST = async (request: NextRequest) => {
  const { productId } = await request.json();

  // Resolve the price on the SERVER — the security boundary.
  const product = getProductById(productId);
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const origin = request.headers.get("origin") ?? request.nextUrl.origin;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          product_data: { name: product.name },
          unit_amount: product.priceInCents, // amount in CENTS
        },
      },
    ],
    success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cancel`,
  });

  return NextResponse.json({ url: session.url }); // return only the URL
};
```

`{CHECKOUT_SESSION_ID}` is a token Stripe substitutes with the real session id in the
redirect — the success page uses it to confirm the payment.

---

## 3. The Buy button — redirect to Stripe

`app/page.tsx` (Client Component)

```tsx
"use client";
import axios from "axios";

const checkout = async (productId: string) => {
  const { data } = await axios.post("/api/payment", { productId });
  window.location.assign(data.url); // go to Stripe's hosted page
};
```

---

## 4. Success & cancel pages

`success_url` and `cancel_url` must be **absolute** URLs. The success page should
**confirm the payment server-side** rather than trust the redirect:

`app/success/page.tsx`

```tsx
import Stripe from "stripe";
const stripe = new Stripe(process.env.SECRET_KEY!);

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>; // a Promise in Next 15+/16
}) {
  const { session_id } = await searchParams;
  const session = session_id
    ? await stripe.checkout.sessions.retrieve(session_id)
    : null;

  const paid = session?.payment_status === "paid";
  return <h1>{paid ? "Payment successful" : "Thanks for your order"}</h1>;
}
```

---

## 4b. Alternative: Embedded Checkout (in-page, no redirect)

Same Checkout Session, but instead of redirecting to `checkout.stripe.com` you mount
Stripe's payment form **inside your own page** via an iframe. You control the surrounding
UI; Stripe still owns the card fields, so the security/PCI story is identical.

Three differences vs the hosted flow:

| | Hosted (redirect) | Embedded |
| --- | --- | --- |
| `ui_mode` | `hosted_page` (default) | `embedded_page` |
| Return URLs | `success_url` + `cancel_url` | single `return_url` |
| API returns | `session.url` (you redirect to it) | `session.client_secret` (you mount it) |

> Note: in **this** project's SDK the embedded mode is named `embedded_page` (vanilla
> Stripe calls it `embedded`). Always check the `UiMode` type your SDK exposes.

**Install the browser SDKs** (server-only `stripe` isn't enough here):

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

**Env** — you also need the *publishable* key (safe in the browser):

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Server** — create an embedded session and return its `client_secret`:

```ts
// app/api/embedded-checkout/route.ts
const session = await stripe.checkout.sessions.create({
  ui_mode: "embedded_page",          // the switch
  mode: "payment",
  line_items: [/* price resolved server-side, same as before */],
  return_url: `${origin}/return?session_id={CHECKOUT_SESSION_ID}`, // no success/cancel
});
return NextResponse.json({ clientSecret: session.client_secret });
```

**Client** — mount the form (the card fields live in a Stripe-origin iframe):

```tsx
"use client";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function Form({ productId }: { productId: string }) {
  const fetchClientSecret = () =>
    fetch("/api/embedded-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    })
      .then((r) => r.json())
      .then((d) => d.clientSecret);

  return (
    <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}
```

**Return page** — after payment Stripe redirects to `return_url`; confirm server-side and
send the user back if they bailed (`status === "open"`):

```tsx
const session = await stripe.checkout.sessions.retrieve(session_id);
if (session.status === "open") redirect("/");      // didn't finish
const paid = session.status === "complete";
```

**Pick one flow per use case** — you don't ship both. Hosted = least code / fastest to
build; Embedded = payment stays on your domain with your UI around it; Elements = fully
custom UI (still Stripe iframes for the card fields).

---

## 5. Test it

Use Stripe test cards on the hosted page:

| Card                  | Result            |
| --------------------- | ----------------- |
| `4242 4242 4242 4242` | Success           |
| `4000 0000 0000 9995` | Declined          |
| `4000 0025 0000 3155` | Requires 3D Secure|

Any future expiry, any CVC, any ZIP.

---

## Things interviewers probe for

- **Amounts are in the smallest currency unit** — `unit_amount` is *cents*. $25.00 → `2500`.
- **Never trust the client price.** Send a product id; look up the amount on the server.
  Otherwise a user can edit the request and pay $0.01.
- **Secret key is server-only.** It lives in env vars and never reaches the browser.
- **Confirm on the server.** A user landing on `success_url` does **not** prove payment —
  retrieve the session (or, better, use a webhook) and check `payment_status === "paid"`.
- **Webhooks are the source of truth.** For real fulfillment (mark order paid, send email,
  grant access) listen for `checkout.session.completed` at a webhook endpoint, because the
  user may close the tab before being redirected. The redirect is UX; the webhook is truth.
- **Idempotency.** Pass an `idempotencyKey` on writes (or guard webhook handlers) so retries
  don't double-charge or double-fulfill.
- **`price_data` vs Prices.** `price_data` creates an inline price per request — fine for
  demos. In production you usually create `Product`/`Price` objects once and pass `price: price_id`.

---

## What a webhook is and why you need one

A **webhook** is just an HTTP endpoint *you* expose that **Stripe calls** when something
happens on their side. Instead of you constantly asking Stripe "is this paid yet?",
Stripe pushes an event to your server the moment the payment completes.

**Why the redirect alone is not enough:**

```
user pays on Stripe  ──►  Stripe charges the card  ──►  redirect to /success
                                  │
                                  └──► sends "checkout.session.completed" to your webhook
```

The redirect to `success_url` is **UX only** — it can fail. The user might close the tab,
lose signal, or the payment may settle a few seconds later (some methods are async). If
your only "mark order paid" logic lives on the success page, you'll miss real payments.

> **Rule:** the **redirect is for the user**, the **webhook is the source of truth.**
> Do fulfillment (mark paid, send receipt, grant access, ship) in the webhook.

**Why the signature check matters:** anyone on the internet can POST to your webhook URL
and fake a "payment succeeded" event. `constructEvent` verifies the `stripe-signature`
header against your webhook secret, proving the request genuinely came from Stripe. If it
doesn't match, it throws — reject the request.

### Webhook endpoint

```ts
// app/api/webhook/route.ts
import Stripe from "stripe";
const stripe = new Stripe(process.env.SECRET_KEY!);

export const POST = async (req: Request) => {
  const sig = req.headers.get("stripe-signature")!;
  const body = await req.text(); // RAW body required — do not JSON.parse first

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body, sig, process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return new Response("Invalid signature", { status: 400 }); // not really Stripe
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    // fulfill the order: mark paid, send receipt, grant access…
    // Make this idempotent — Stripe may deliver the same event more than once.
  }

  return new Response(null, { status: 200 }); // 200 = "got it, stop retrying"
};
```

Two things that trip people up:

- **Use the raw body.** Signature verification hashes the exact bytes Stripe sent. If a
  framework parses the JSON first, the signature won't match. `req.text()` gives the raw body.
- **Return `200` fast.** If you don't, Stripe assumes failure and **retries** for up to a
  few days. So your handler must be **idempotent** — guard against processing the same
  `event.id` / order twice (e.g. check a "already fulfilled" flag in your DB).

### Test webhooks locally with the Stripe CLI

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhook
# prints a webhook signing secret (whsec_...) — put it in .env.local as STRIPE_WEBHOOK_SECRET

# in another terminal, simulate an event:
stripe trigger checkout.session.completed
```

---

## From test mode to production (going live)

Test mode and live mode are **completely separate** in Stripe — separate keys, separate
data, separate webhooks. Nothing you did in test carries over; you re-wire the same things
with live values. Checklist:

1. **Activate your account.** In the Dashboard, complete *Activate payments*: business
   details, identity, and a **bank account** for payouts. Stripe reviews this before you
   can accept real money.

2. **Switch to live API keys.** Toggle the Dashboard out of *Test mode* and copy the
   **live** keys (they start with `sk_live_…` / `pk_live_…`). Put the live secret key in
   your **hosting platform's** environment variables — never in the repo.

   ```bash
   # production env (e.g. Vercel project settings) — NOT committed
   SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...   # the LIVE endpoint's secret (see step 4)
   ```

3. **Deploy over HTTPS.** Live Stripe requires a public `https://` URL. Your
   `success_url` / `cancel_url` already derive from the request origin, so they'll point at
   your real domain automatically once deployed.

4. **Create a live webhook endpoint.** In the Dashboard (live mode) → *Developers →
   Webhooks → Add endpoint*: set the URL to `https://yourdomain.com/api/webhook` and
   subscribe to the events you handle (e.g. `checkout.session.completed`). Copy that
   endpoint's **signing secret** into `STRIPE_WEBHOOK_SECRET` in production. (The local
   CLI secret from testing does **not** work in production.)

5. **Turn on the payment methods you want.** Dashboard → *Settings → Payment methods*
   (cards, Apple/Google Pay, etc.). Some require extra verification.

6. **Enable email receipts.** Dashboard → *Settings → Customer emails* → turn on successful
   payment receipts, or send your own from the webhook.

7. **Do a real end-to-end test.** Use a real card for a small live charge, confirm the
   redirect, confirm the webhook fired (Dashboard shows delivery status + lets you replay),
   then refund it from the Dashboard.

8. **Operate it.** Watch *Developers → Logs* and *Events*, set up failed-payment alerts,
   and rotate keys if one ever leaks.

> **PCI / security:** because you use Stripe-hosted **Checkout**, card numbers are entered
> on Stripe's page and never touch your server — that keeps you in the simplest PCI tier.
> Don't log card data, and keep secret keys server-side only.
