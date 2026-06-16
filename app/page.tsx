import Link from "next/link";
import { products, formatPrice } from "./products";

export default function Home() {


  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <header className="border-b border-black/[.06] dark:border-white/[.08]">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
          <span className="text-lg font-semibold tracking-tight text-black dark:text-zinc-50">
            🛒 Stripe Store
          </span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {products.length} products
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <div className="mb-10 max-w-xl">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Shop the collection
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            A minimal storefront for learning Stripe checkout integration.
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <li
              key={product.id}
              className="flex flex-col rounded-2xl border border-black/[.06] bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-white/[.08] dark:bg-zinc-950"
            >
              <div className="mb-4 flex h-32 items-center justify-center rounded-xl bg-zinc-100 text-5xl dark:bg-zinc-900">
                {product.emoji}
              </div>
              <h2 className="text-base font-semibold text-black dark:text-zinc-50">
                {product.name}
              </h2>
              <p className="mt-1 flex-1 text-sm text-zinc-600 dark:text-zinc-400">
                {product.description}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-lg font-semibold text-black dark:text-zinc-50">
                  {formatPrice(product.priceInCents)}
                </span>
                <Link
                  href={`/checkout?productId=${product.id}`}
                  className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                >
                  Buy now
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </main>

      <footer className="border-t border-black/[.06] px-6 py-6 text-center text-sm text-zinc-500 dark:border-white/[.08] dark:text-zinc-400">
        Built with Next.js + Stripe · for learning
      </footer>
    </div>
  );
}
