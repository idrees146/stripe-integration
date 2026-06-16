import Link from "next/link";
import { getProductById, formatPrice } from "../products";
import EmbeddedCheckoutForm from "./EmbeddedCheckoutForm";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string }>;
}) {
  const { productId } = await searchParams;
  const product = productId ? getProductById(productId) : undefined;

  // Validate the product on the server before rendering the payment form.
  if (!product) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 font-sans">
        <p className="text-zinc-600 dark:text-zinc-400">Product not found.</p>
        <Link href="/" className="mt-4 text-sm font-medium underline">
          Back to store
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <header className="border-b border-black/[.06] dark:border-white/[.08]">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-black dark:text-zinc-50"
          >
            🛒 Stripe Store
          </Link>
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
          >
            ← Back
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        {/* Order summary */}
        <div className="mb-8 flex items-center gap-4 rounded-2xl border border-black/[.06] bg-white p-5 dark:border-white/[.08] dark:bg-zinc-950">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-zinc-100 text-3xl dark:bg-zinc-900">
            {product.emoji}
          </div>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-black dark:text-zinc-50">
              {product.name}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {product.description}
            </p>
          </div>
          <span className="text-lg font-semibold text-black dark:text-zinc-50">
            {formatPrice(product.priceInCents)}
          </span>
        </div>

        {/* Stripe's embedded checkout mounts here */}
        <EmbeddedCheckoutForm productId={product.id} />
      </main>
    </div>
  );
}
