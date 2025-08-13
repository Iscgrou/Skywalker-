import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter var", "Vazirmatn", "Inter", "Tahoma", "Arial", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        crm: {
          surface: "var(--crm-surface-base)",
          alt: "var(--crm-surface-alt)",
          raised: "var(--crm-surface-raised)",
          accent: "var(--crm-accent-primary)",
          accent2: "var(--crm-accent-elevate)",
          border: "var(--crm-border)",
          focus: "var(--crm-focus-ring)",
          text: {
            primary: "var(--crm-text-primary)",
            secondary: "var(--crm-text-secondary)",
            faint: "var(--crm-text-faint)",
          },
          intent: {
            success: "var(--crm-intent-success)",
            warning: "var(--crm-intent-warning)",
            danger: "var(--crm-intent-danger)",
            info: "var(--crm-intent-info)",
          },
          chart: {
            1: "var(--crm-chart-1)",
            2: "var(--crm-chart-2)",
            3: "var(--crm-chart-3)",
            4: "var(--crm-chart-4)",
            5: "var(--crm-chart-5)",
            6: "var(--crm-chart-6)",
            7: "var(--crm-chart-7)",
          },
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      keyframes: {
        "crm-pulse": {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(123,91,250,0.0)' },
          '50%': { boxShadow: '0 0 0 4px rgba(53,198,245,0.15)' },
        },
        "crm-reveal": {
          '0%': { opacity: '0', transform: 'translateY(6px) scale(.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "crm-pulse": "crm-pulse 2s ease-in-out infinite",
        "crm-reveal": "crm-reveal 420ms var(--crm-ease-emphasis) forwards",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      boxShadow: {
        'crm-xs': '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 0 0 1px rgba(34,40,55,0.9)',
        'crm-sm': '0 2px 4px -2px rgba(10,12,16,0.5), 0 1px 2px rgba(12,16,24,0.4)',
        'crm-md': '0 4px 14px -2px rgba(10,12,16,0.55), 0 2px 4px rgba(12,16,24,0.5)',
        'crm-glow': '0 0 0 1px #7B5BFA40, 0 0 12px 2px #7B5BFA30',
        'crm-focus': '0 0 0 2px var(--crm-surface-base), 0 0 0 4px var(--crm-focus-ring)',
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
