// src/components/SEOHead.tsx
'use client';

import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

export function SEOHead({
  title = 'TruthVote - Community Predictions Platform',
  description = 'Vote on predictions, earn points, and compete with the community. Make your predictions on politics, sports, technology, and more.',
  image = '/og-image.png',
  url = 'https://project-cebe8bab-ec36-4869-931.web.app',
  type = 'website'
}: SEOHeadProps) {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Helper to update or create meta tags
    const updateMetaTag = (attribute: string, name: string, content: string) => {
      let meta = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      
      meta.setAttribute('content', content);
    };

    // Primary meta tags
    updateMetaTag('name', 'title', title);
    updateMetaTag('name', 'description', description);

    // Open Graph / Facebook
    updateMetaTag('property', 'og:type', type);
    updateMetaTag('property', 'og:url', url);
    updateMetaTag('property', 'og:title', title);
    updateMetaTag('property', 'og:description', description);
    updateMetaTag('property', 'og:image', image);
    updateMetaTag('property', 'og:site_name', 'TruthVote');
    updateMetaTag('property', 'og:image:width', '1200');
    updateMetaTag('property', 'og:image:height', '630');

    // Twitter
    updateMetaTag('property', 'twitter:card', 'summary_large_image');
    updateMetaTag('property', 'twitter:url', url);
    updateMetaTag('property', 'twitter:title', title);
    updateMetaTag('property', 'twitter:description', description);
    updateMetaTag('property', 'twitter:image', image);
  }, [title, description, image, url, type]);

  return null;
}
