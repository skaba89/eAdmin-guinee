import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
    darkMode: "class",
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
        extend: {
                colors: {
                        background: 'hsl(var(--background))',
                        foreground: 'hsl(var(--foreground))',
                        card: {
                                DEFAULT: 'hsl(var(--card))',
                                foreground: 'hsl(var(--card-foreground))'
                        },
                        popover: {
                                DEFAULT: 'hsl(var(--popover))',
                                foreground: 'hsl(var(--popover-foreground))'
                        },
                        primary: {
                                DEFAULT: 'hsl(var(--primary))',
                                foreground: 'hsl(var(--primary-foreground))'
                        },
                        secondary: {
                                DEFAULT: 'hsl(var(--secondary))',
                                foreground: 'hsl(var(--secondary-foreground))'
                        },
                        muted: {
                                DEFAULT: 'hsl(var(--muted))',
                                foreground: 'hsl(var(--muted-foreground))'
                        },
                        accent: {
                                DEFAULT: 'hsl(var(--accent))',
                                foreground: 'hsl(var(--accent-foreground))'
                        },
                        destructive: {
                                DEFAULT: 'hsl(var(--destructive))',
                                foreground: 'hsl(var(--destructive-foreground))'
                        },
                        border: 'hsl(var(--border))',
                        input: 'hsl(var(--input))',
                        ring: 'hsl(var(--ring))',
                        chart: {
                                '1': 'hsl(var(--chart-1))',
                                '2': 'hsl(var(--chart-2))',
                                '3': 'hsl(var(--chart-3))',
                                '4': 'hsl(var(--chart-4))',
                                '5': 'hsl(var(--chart-5))'
                        },
                        // Guinea National Colors
                        'guinea-red': {
                                DEFAULT: '#CE1126',
                                50: '#FEF2F2',
                                100: '#FEE2E2',
                                200: '#FECACA',
                                300: '#FCA5A5',
                                400: '#F87171',
                                500: '#CE1126',
                                600: '#B00E20',
                                700: '#8B0B19',
                                800: '#660813',
                                900: '#40060C',
                        },
                        'guinea-yellow': {
                                DEFAULT: '#FCD116',
                                50: '#FFFBEB',
                                100: '#FEF3C7',
                                200: '#FDE68A',
                                300: '#FCD34D',
                                400: '#FBBF24',
                                500: '#FCD116',
                                600: '#D9B50F',
                                700: '#B5950C',
                                800: '#8A7209',
                                900: '#5F4E06',
                        },
                        'guinea-green': {
                                DEFAULT: '#009460',
                                50: '#ECFDF5',
                                100: '#D1FAE5',
                                200: '#A7F3D0',
                                300: '#6EE7B7',
                                400: '#34D399',
                                500: '#009460',
                                600: '#007A4E',
                                700: '#005F3C',
                                800: '#00452B',
                                900: '#002A1A',
                        },
                        // Brand / Presidential colors
                        navy: {
                                DEFAULT: '#0B2E58',
                                light: '#143D6B',
                                dark: '#071E3A',
                        },
                        gold: {
                                DEFAULT: '#C8A45C',
                                light: '#D4B878',
                                dark: '#A88A3C',
                                brand: '#C8A45C',
                        },
                },
                borderRadius: {
                        lg: 'var(--radius)',
                        md: 'calc(var(--radius) - 2px)',
                        sm: 'calc(var(--radius) - 4px)'
                },
                // Custom animations
                keyframes: {
                        'slide-in-up': {
                                '0%': { transform: 'translateY(20px)', opacity: '0' },
                                '100%': { transform: 'translateY(0)', opacity: '1' },
                        },
                        'fade-in-scale': {
                                '0%': { transform: 'scale(0.95)', opacity: '0' },
                                '100%': { transform: 'scale(1)', opacity: '1' },
                        },
                        'shimmer-gold': {
                                '0%': { backgroundPosition: '-200% 0' },
                                '100%': { backgroundPosition: '200% 0' },
                        },
                        'glow-pulse': {
                                '0%, 100%': { boxShadow: '0 0 4px rgba(200, 164, 92, 0.15), 0 0 12px rgba(200, 164, 92, 0.08)' },
                                '50%': { boxShadow: '0 0 8px rgba(200, 164, 92, 0.25), 0 0 24px rgba(200, 164, 92, 0.12)' },
                        },
                        'gradient-flow': {
                                '0%': { backgroundPosition: '0% 50%' },
                                '50%': { backgroundPosition: '100% 50%' },
                                '100%': { backgroundPosition: '0% 50%' },
                        },
                        'border-glow': {
                                '0%, 100%': { borderColor: 'rgba(200, 164, 92, 0.15)', boxShadow: '0 0 6px rgba(200, 164, 92, 0.05)' },
                                '50%': { borderColor: 'rgba(200, 164, 92, 0.35)', boxShadow: '0 0 16px rgba(200, 164, 92, 0.1)' },
                        },
                        'float-subtle': {
                                '0%, 100%': { transform: 'translateY(0)' },
                                '50%': { transform: 'translateY(-4px)' },
                        },
                        'counter-up': {
                                '0%': { transform: 'translateY(100%)', opacity: '0' },
                                '100%': { transform: 'translateY(0)', opacity: '1' },
                        },
                        'pulse-soft': {
                                '0%, 100%': { opacity: '1' },
                                '50%': { opacity: '0.7' },
                        },
                },
                animation: {
                        'slide-in-up': 'slide-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
                        'fade-in-scale': 'fade-in-scale 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
                        'shimmer-gold': 'shimmer-gold 3s ease-in-out infinite',
                        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
                        'gradient-flow': 'gradient-flow 6s ease infinite',
                        'border-glow': 'border-glow 3s ease-in-out infinite',
                        'float-subtle': 'float-subtle 5s ease-in-out infinite',
                        'counter-up': 'counter-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
                        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
                },
        }
  },
  plugins: [tailwindcssAnimate],
};
export default config;
