import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const faq = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/faq' }),
  schema: z.object({
    question: z.string(),
    answer: z.string(),
    /** Plain text for JSON-LD (no HTML entities). */
    schemaAnswer: z.string(),
    open: z.boolean().optional(),
    order: z.number().int().nonnegative(),
  }),
});

const packages = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/packages' }),
  schema: z.object({
    hours: z.string(),
    title: z.string(),
    description: z.string(),
    priceLabel: z.string(),
    priceNote: z.string(),
    featured: z.boolean().optional(),
    badge: z.string().optional(),
    ctaLabel: z.string().optional(),
    ctaId: z.string().optional(),
    custom: z.boolean().optional(),
    order: z.number().int().nonnegative(),
    /** Plain text for JSON-LD (no HTML entities). */
    schemaDescription: z.string(),
  }),
});

const works = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/works' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      subtitle: z.string(),
      tag: z.string(),
      href: z.string().url(),
      ctaId: z.string(),
      image: image(),
      alt: z.string(),
      contain: z.boolean().optional(),
      bg: z.string().optional(),
      order: z.number().int().nonnegative(),
    }),
});

const team = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/team' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      role: z.string(),
      no: z.string(),
      image: image(),
      alt: z.string(),
      order: z.number().int().nonnegative(),
    }),
});

const quotes = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/quotes' }),
  schema: z.object({
    quote: z.string(),
    cite: z.string(),
    order: z.number().int().nonnegative(),
  }),
});

const clients = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/clients' }),
  schema: ({ image }) =>
    z.object({
      alt: z.string(),
      image: image(),
      scale: z.number().positive(),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      order: z.number().int().nonnegative(),
    }),
});

export const collections = { faq, packages, works, team, quotes, clients };
