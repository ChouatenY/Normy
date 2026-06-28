export const DOC_SECTIONS = [
  {
    title: 'Getting started',
    links: [
      { href: '/docs/quickstart', label: 'Quick start' },
      { href: '/docs/installation', label: 'Installation' },
      { href: '/docs/self-hosting', label: 'Self-hosting' },
    ],
  },
  {
    title: 'Integrations',
    links: [
      { href: '/docs/react', label: 'React' },
      { href: '/docs/nextjs', label: 'Next.js' },
      { href: '/docs/vanilla-js', label: 'Vanilla JS' },
    ],
  },
  {
    title: 'Reference',
    links: [
      { href: '/docs/api-reference', label: 'API reference' },
      { href: '/docs/sdk-reference', label: 'SDK reference' },
      { href: '/docs/publishing', label: 'Publishing SDKs' },
    ],
  },
] as const;
