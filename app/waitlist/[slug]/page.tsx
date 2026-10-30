import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE_URL, products } from "@/lib/products";
import { alphaProduct, alphaProducts, waitlistHref } from "@/lib/waitlist/waitlist.mjs";
import { WaitlistForm } from "./waitlist-form";

// Only alpha products have a waitlist. Every other slug, including live and coming-soon
// products, is a 404: generateStaticParams lists the alpha ones and dynamicParams turns the rest
// away, and the page checks again in case the two ever disagree.
export const dynamicParams = false;

export function generateStaticParams() {
  return alphaProducts(products).map((p) => ({ slug: p.slug }));
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = alphaProduct(products, slug);
  if (!product) return {};
  const title = `Join the ${product.name} waitlist`;
  const description = `${product.name} is in alpha. ${product.tagline}. Join the waitlist and we'll email you when there's a spot.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}${waitlistHref(product.slug)}` },
    openGraph: { title: `${title} · WitUS`, description, url: `${SITE_URL}${waitlistHref(product.slug)}` },
  };
}

export default async function WaitlistPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = alphaProduct(products, slug);
  if (!product) notFound();

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <Link
        href="/"
        className="inline-flex items-center min-h-11 text-sm text-slate-400 hover:text-white transition-colors mb-4 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded"
      >
        &larr; Back to WitUS
      </Link>

      <p className="text-sm font-semibold tracking-widest text-teal-300 uppercase mb-3">
        {product.name} · Alpha
      </p>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight break-words">
        Join the {product.name} waitlist
      </h1>
      <p className="text-slate-200 text-base sm:text-lg leading-relaxed mb-3">{product.tagline}.</p>
      <p className="text-slate-400 text-sm leading-relaxed mb-10">{product.description}</p>

      <section
        aria-labelledby="waitlist-form-heading"
        className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-8"
      >
        <h2 id="waitlist-form-heading" className="text-lg font-bold text-white mb-1">
          Get on the list
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          {product.name} is in alpha and not open to everyone yet. Leave your email and we&apos;ll
          let you know when there&apos;s a spot.
        </p>
        <WaitlistForm slug={product.slug} productName={product.name} />
      </section>
    </div>
  );
}
