/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                ink: { 900: "#0B1120", 800: "#131C2E", 700: "#1A2438" },
                sage: { 500: "#4C7C59", 600: "#3E6849", 400: "#6B9A77" },
                amber: { 500: "#C97C3D", 600: "#A96429", 400: "#DB9A64" },
                cream: { 100: "#F5F1E8", 300: "#B8B3A6", 500: "#7C776B" },
                line: { 700: "#26324A", 600: "#33415F" },
                danger: "#B4453C",
            },
            fontFamily: {
                display: ['"Fraunces"', "Georgia", "serif"],
                sans: ['"Inter"', "system-ui", "sans-serif"],
            },
            fontSize: {
                display: [
                    "clamp(2.75rem, 6vw, 4.5rem)",
                    { lineHeight: "1.02", letterSpacing: "-0.02em" },
                ],
                lead: [
                    "clamp(1.75rem, 3vw, 2.5rem)",
                    { lineHeight: "1.1", letterSpacing: "-0.015em" },
                ],
            },
            maxWidth: { content: "1120px" },
            keyframes: {
                "number-land": {
                    "0%": {
                        opacity: "0",
                        transform: "translateY(-14px) scale(0.9)",
                    },
                    "60%": {
                        opacity: "1",
                        transform: "translateY(3px) scale(1.04)",
                    },
                    "100%": {
                        opacity: "1",
                        transform: "translateY(0) scale(1)",
                    },
                },
                "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
            },
            animation: {
                "number-land":
                    "number-land 520ms cubic-bezier(0.22, 1, 0.36, 1) both",
                "fade-in": "fade-in 200ms ease-out both",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};
