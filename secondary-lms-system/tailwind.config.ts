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
                "lms-blue": {
                    50: "#EFF6FF",
                    100: "#DBEAFE",
                    200: "#BFDBFE",
                    300: "#93C5FD",
                    400: "#60A5FA",
                    500: "#3B82F6",
                    600: "#2563EB",
                    700: "#1D4ED8",
                    800: "#1E40AF",
                    900: "#1E3A8A",
                },
                "lms-pink": {
                    50: "#FDF2F8",
                    100: "#FCE7F3",
                    200: "#FBCFE8",
                    300: "#F9A8D4",
                    400: "#F472B6",
                    500: "#EC4899",
                    600: "#DB2777",
                    700: "#BE185D",
                    800: "#9D174D",
                    900: "#831843",
                },
            },
            fontFamily: {
                poppins: ["Poppins", "sans-serif"],
                inter: ["Inter", "sans-serif"],
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            keyframes: {
                float: {
                    "0%, 100%": { transform: "translateY(0px)" },
                    "50%": { transform: "translateY(-20px)" },
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
                spin: {
                    to: { transform: "rotate(360deg)" },
                },
            },
            animation: {
                float: "float 6s ease-in-out infinite",
                "fade-in": "fade-in 0.3s ease-out",
                "slide-in": "slide-in 0.3s ease-out",
                spin: "spin 0.8s linear infinite",
            },
        },
    },
    plugins: [],
};

export default config;
