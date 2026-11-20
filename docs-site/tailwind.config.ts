import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: ['./app/**/*.{ts,tsx,mdx}', './components/**/*.{ts,tsx}', './content/**/*.md'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#201e17',
        fg: {
          DEFAULT: '#f5f2e8',
          muted: '#a69f8c',
        },
        brand: '#e2c57e',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      typography: () => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': '#f5f2e8',
            '--tw-prose-headings': '#FFFFFF',
            '--tw-prose-lead': '#f5f2e8',
            '--tw-prose-links': '#e2c57e',
            '--tw-prose-bold': '#FFFFFF',
            '--tw-prose-counters': '#a69f8c',
            '--tw-prose-bullets': 'rgba(245, 242, 232, 0.4)',
            '--tw-prose-hr': 'rgba(245, 242, 232, 0.08)',
            '--tw-prose-quotes': '#f5f2e8',
            '--tw-prose-quote-borders': '#e2c57e',
            '--tw-prose-captions': '#a69f8c',
            '--tw-prose-code': '#e2c57e',
            '--tw-prose-pre-code': '#f5f2e8',
            '--tw-prose-pre-bg': 'rgba(0, 0, 0, 0.35)',
            '--tw-prose-th-borders': 'rgba(245, 242, 232, 0.12)',
            '--tw-prose-td-borders': 'rgba(245, 242, 232, 0.06)',
            maxWidth: 'none',
            color: '#f5f2e8',
            h1: {
              fontWeight: '300',
              fontSize: '3rem',
              letterSpacing: '-0.02em',
              lineHeight: '1.1',
              color: '#FFFFFF',
              marginBottom: '2rem',
              marginTop: '3rem',
            },
            'h1:first-child': {
              marginTop: 0,
            },
            h2: {
              fontWeight: '300',
              fontSize: '2rem',
              letterSpacing: '-0.015em',
              lineHeight: '1.2',
              color: '#FFFFFF',
              marginTop: '3rem',
              marginBottom: '1.25rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid rgba(245, 242, 232, 0.08)',
            },
            h3: {
              fontWeight: '500',
              fontSize: '1.25rem',
              color: '#FFFFFF',
              marginTop: '2rem',
              marginBottom: '1rem',
            },
            h4: { fontWeight: '600', color: '#FFFFFF' },
            p: {
              color: '#f5f2e8',
              lineHeight: '1.75',
              fontSize: '1.0625rem',
            },
            'ul > li': { color: '#f5f2e8', lineHeight: '1.7' },
            'ol > li': { color: '#f5f2e8', lineHeight: '1.7' },
            a: {
              color: '#e2c57e',
              textDecoration: 'underline',
              textDecorationColor: 'rgba(226, 197, 126, 0.3)',
              textUnderlineOffset: '3px',
              fontWeight: '400',
              transition: 'color .15s, text-decoration-color .15s',
            },
            'a:hover': {
              color: '#f1dcac',
              textDecorationColor: '#f1dcac',
            },
            strong: { color: '#FFFFFF', fontWeight: '600' },
            table: {
              fontSize: '0.95rem',
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
            },
            'thead th': {
              color: '#a69f8c',
              fontWeight: '500',
              fontSize: '0.8rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              paddingBottom: '0.75rem',
              borderBottomColor: 'rgba(245, 242, 232, 0.12)',
            },
            'tbody td': {
              paddingTop: '0.75rem',
              paddingBottom: '0.75rem',
              borderBottomColor: 'rgba(245, 242, 232, 0.06)',
            },
            blockquote: {
              borderLeftWidth: '2px',
              fontStyle: 'normal',
              fontWeight: '400',
              color: '#f5f2e8',
            },
            pre: {
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(245, 242, 232, 0.06)',
              borderRadius: '8px',
              padding: '1rem 1.25rem',
              fontSize: '0.9rem',
              lineHeight: '1.65',
            },
          },
        },
      }),
    },
  },
  plugins: [typography],
};

export default config;
