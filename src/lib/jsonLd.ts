import { getCollection } from 'astro:content';
import { EMAIL, PHONE_TEL, siteUrl } from './site';

/** JSON-LD graph for the abonament LP (Service + FAQPage). */
export async function buildJsonLd() {
  const [faq, packages] = await Promise.all([
    getCollection('faq'),
    getCollection('packages'),
  ]);

  const faqSorted = [...faq].sort((a, b) => a.data.order - b.data.order);
  const packSorted = [...packages].sort((a, b) => a.data.order - b.data.order);

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: 'Abonament produkcyjny SEZMOO',
        serviceType: 'Wideo, fotografia, grafika i content w miesięcznej puli godzin',
        url: siteUrl('/'),
        inLanguage: 'pl-PL',
        areaServed: { '@type': 'Country', name: 'Polska' },
        provider: {
          '@type': 'Organization',
          name: 'SEZMOO',
          url: 'https://sezmoo.com/',
          logo: 'https://sezmoo.com/assets/brand/sezmoo-logo-by.svg',
          email: EMAIL,
          telephone: PHONE_TEL,
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'Zeusa 34',
            postalCode: '80-299',
            addressLocality: 'Gdańsk',
            addressCountry: 'PL',
          },
        },
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Miesięczna pula godzin',
          itemListElement: packSorted.map((p) => ({
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: `Pakiet ${p.data.hours}`,
              description: p.data.schemaDescription,
            },
          })),
        },
      },
      {
        '@type': 'FAQPage',
        inLanguage: 'pl-PL',
        mainEntity: faqSorted.map((item) => ({
          '@type': 'Question',
          name: item.data.question.replace(/&nbsp;/g, ' '),
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.data.schemaAnswer,
          },
        })),
      },
    ],
  };
}
