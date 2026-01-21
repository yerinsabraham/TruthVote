import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // TruthVote brand colors
        primary: '#082a5c',
        secondary: '#6c757d',
        success: '#10B981',
        danger: '#EF4444',
        warning: '#ffc107',
        
        // Theme colors
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        card: {
          DEFAULT: 'var(--color-card)',
          foreground: 'var(--color-card-foreground)',
        },
        muted: {
          DEFAULT: 'var(--color-muted)',
          foreground: '#94A3B8',
        },
        border: 'var(--color-border)',
      },
    },
  },
  plugins: [],
} satisfies Config;
