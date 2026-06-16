import Link from "next/link";
import Stripe from "stripe";

const stripeClient = new Stripe(process.env.SECRET_KEY as string);

function formatPrice(amountInCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountInCents / 100);
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  // Confirm the payment with Stripe rather than trusting the redirect alone.
  let session: Stripe.Checkout.Session | null = null;
  if (session_id) {
    try {
      session = await stripeClient.checkout.sessions.retrieve(session_id);
    } catch {
      session = null;
    }
  }

  const paid = session?.payment_status === "paid";

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-20 font-sans dark:bg-black">
      <div className="w-full max-w-md rounded-2xl border border-black/[.06] bg-white p-8 text-center shadow-sm dark:border-white/[.08] dark:bg-zinc-950">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl dark:bg-green-900/40">
          ✅
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          {paid ? "Payment successful" : "Thanks for your order"}
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          {paid
            ? "Your payment has been confirmed. A receipt is on its way."
            : "We're processing your order."}
        </p>

        {session?.amount_total != null && (
          <p className="mt-4 text-lg font-semibold text-black dark:text-zinc-50">
            {formatPrice(session.amount_total, session.currency ?? "usd")}
          </p>
        )}
        {session?.customer_details?.email && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {session.customer_details.email}
          </p>
        )}

        <Link
          href="/"
          className="mt-8 inline-block rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
