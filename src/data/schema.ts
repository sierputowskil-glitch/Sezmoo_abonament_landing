import { EMAIL, PHONE_TEL, siteUrl } from '../lib/site';

/** JSON-LD graph for the abonament LP (Service + FAQPage). */
export const jsonLd = {
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
        itemListElement: [
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: 'Pakiet 30h',
              description:
                'Na bieżące potrzeby: regularne grafiki, krótkie materiały wideo, wybrane sesje i aktualizacje contentu.',
            },
          },
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: 'Pakiet 60h',
              description:
                'Na regularną produkcję: rolki, sesje foto, projekty graficzne i materiały do komunikacji.',
            },
          },
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: 'Pakiet 120h',
              description:
                'Na wiele równoległych działań: kilka projektów jednocześnie i większa dostępność specjalistów.',
            },
          },
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: 'Pakiet Custom',
              description:
                'Zakres dopasowany do potrzeb: indywidualna pula godzin, zakres usług i wycena.',
            },
          },
        ],
      },
    },
    {
      '@type': 'FAQPage',
      inLanguage: 'pl-PL',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Ile kosztuje abonament?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Cena zależy od miesięcznej puli godzin i zakresu działań. Po krótkiej rozmowie przedstawimy konkretną propozycję i zasady rozliczenia.',
          },
        },
        {
          '@type': 'Question',
          name: 'Czy mogę korzystać z różnych usług w ramach jednego abonamentu?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Tak. Pula godzin nie jest przypisana tylko do wideo, fotografii czy grafiki. Możesz zmieniać proporcje prac między miesiącami, zgodnie z ustalonym planem i zakresem usług.',
          },
        },
        {
          '@type': 'Question',
          name: 'Na czym polega opcja Custom?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Custom to abonament przygotowywany indywidualnie – bez z góry narzuconej puli godzin. Ustalamy razem potrzeby działu marketingu, zakres usług, dostępność specjalistów i miesięczny budżet. Następnie przedstawiamy dopasowaną propozycję współpracy.',
          },
        },
        {
          '@type': 'Question',
          name: 'Jak współpracujecie z naszym działem marketingu?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Twój zespół odpowiada za cele, komunikację i priorytety. SEZMOO zapewnia produkcyjne i kreatywne wsparcie: od zaplanowania realizacji po gotowe materiały. Pracujemy razem z marketingiem, nie zamiast niego.',
          },
        },
        {
          '@type': 'Question',
          name: 'Czy abonament wymaga długiej umowy?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Współpraca najlepiej działa w stałym rytmie. Na start proponujemy 3-miesięczny okres próbny, a szczegółowe warunki i minimalny czas trwania umowy ustalamy indywidualnie.',
          },
        },
        {
          '@type': 'Question',
          name: 'Skąd wiem, ile godzin wykorzystaliśmy?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'W ClickUp widzisz postęp zadań. Po zakończeniu miesiąca otrzymujesz zestawienie wykonanych prac i godzin, dołączone do rozliczenia.',
          },
        },
        {
          '@type': 'Question',
          name: 'Czy mogę zmieniać priorytety w trakcie współpracy?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Tak. Plan ustalamy wspólnie, a zakres działań możemy dopasowywać do aktualnych potrzeb i dostępnej puli godzin.',
          },
        },
        {
          '@type': 'Question',
          name: 'Czy realizujecie projekty poza Trójmiastem?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Tak. Mamy bazę w Gdańsku, a produkcje realizujemy w całej Polsce i za granicą.',
          },
        },
      ],
    },
  ],
} as const;
