import type { Config } from "tailwindcss";
const config: Config = {
    darkMode: ["class"],
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                radius: "var(--radius)",
                coolors: {
                    ink: "#264653",
                    primary: "#2A9D8F",
                    highlight: "#E9C46A",
                    accent: "#F4A261",
                    secondary: "#E76F51",
                },
            },
            fontFamily: {
                roboto: ["var(--font-roboto)"],
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            keyframes: {
                float: {
                    "0%, 100%": { transform: "translate(0, 0) rotate(0deg)" },
                    "33%": { transform: "translate(30px, -30px) rotate(120deg)" },
                    "66%": { transform: "translate(-20px, 20px) rotate(240deg)" },
                },
                bounce: {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-10px)" },
                },
                spin: {
                    from: { transform: "rotateY(0deg)" },
                    to: { transform: "rotateY(360deg)" },
                },
                "fade-in": {
                    from: {
                        opacity: "0",
                        transform: "translateY(-20px)",
                    },
                    to: {
                        opacity: "1",
                        transform: "translateY(0)",
                    },
                },
                "slide-in": {
                    from: {
                        transform: "translateX(400px)",
                        opacity: "0",
                    },
                    to: {
                        transform: "translateX(0)",
                        opacity: "1",
                    },
                },
            },
            animation: {
                float: "float 15s infinite ease-in-out",
                "float-delay": "float 20s infinite ease-in-out",
                "float-slow": "float 18s infinite ease-in-out",
                "float-fast": "float 12s infinite ease-in-out",
                bounce: "bounce 2s ease-in-out infinite",
                spin: "spin 0.6s ease-in-out",
                "fade-in": "fade-in 0.3s ease-out",
                "slide-in": "slide-in 0.3s ease-out",
            },
        },
    },
    plugins: [],
};

export default config;
