export type Product = {
  id: string;
  name: string;
  description: string;
  // Price in the smallest currency unit (cents) — the format Stripe expects.
  priceInCents: number;
  emoji: string;
};

export const products: Product[] = [
  {
    id: "tee",
    name: "Classic Tee",
    description: "Soft cotton t-shirt in a relaxed fit.",
    priceInCents: 2500,
    emoji: "👕",
  },
  {
    id: "mug",
    name: "Ceramic Mug",
    description: "12oz mug that keeps your coffee warm.",
    priceInCents: 1200,
    emoji: "☕",
  },
  {
    id: "cap",
    name: "Snapback Cap",
    description: "Adjustable cap with an embroidered logo.",
    priceInCents: 1800,
    emoji: "🧢",
  },
  {
    id: "tote",
    name: "Canvas Tote",
    description: "Durable everyday bag for groceries and more.",
    priceInCents: 1500,
    emoji: "🛍️",
  },
  {
    id: "stickers",
    name: "Sticker Pack",
    description: "A set of six vinyl stickers.",
    priceInCents: 600,
    emoji: "✨",
  },
  {
    id: "bottle",
    name: "Water Bottle",
    description: "Insulated steel bottle, 24oz.",
    priceInCents: 2200,
    emoji: "🧴",
  },
];

export function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceInCents / 100);
}

// Server-side lookup. The API route resolves price/name from here using only the
// product id sent by the client — never trust a price coming from the browser.
export function getProductById(id: string): Product | undefined {
  return products.find((product) => product.id === id);
}
