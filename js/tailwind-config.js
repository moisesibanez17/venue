tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "neon-lime": "#ccff00",
                "neon-yellow": "#ffff00",
                "neon-white": "#ffffff",
                "brand-black": "#000000",
                "brand-dark": "#050a05",
                "brand-green-dark": "#0a1a0a",
                "deep-purple": "#1a1a1a", // Keeping for compatibility but darker
                midnight: "#000000", // Re-mapped to black
                primary: "#ccff00",
                "background-light": "#f6f6f8",
                "background-dark": "#000000"
            },
            fontFamily: {
                display: ["Anton", "sans-serif"],
                script: ["Yellowtail", "cursive"],
                body: ["Roboto Condensed", "sans-serif"]
            },
            animation: {
                "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                flicker: "flicker 3s linear infinite",
                flow: "flow 5s linear infinite",
                "gradient-move": "gradient-move 10s ease infinite",
                "spin-slow": "spin 8s linear infinite"
            },
            keyframes: {
                flicker: {
                    "0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100%": {
                        opacity: 1,
                        textShadow: "0 0 10px rgba(255,0,255,0.8), 0 0 20px rgba(255,0,255,0.4)"
                    },
                    "20%, 21.999%, 63%, 63.999%, 65%, 69.999%": {
                        opacity: 0.4,
                        textShadow: "none"
                    }
                },
                flow: {
                    "0%": {
                        transform: "translateX(-100%)"
                    },
                    "100%": {
                        transform: "translateX(100%)"
                    }
                },
                "gradient-move": {
                    "0%, 100%": {
                        backgroundPosition: "0% 50%"
                    },
                    "50%": {
                        backgroundPosition: "100% 50%"
                    }
                }
            },
            borderRadius: {
                DEFAULT: "0.25rem",
                lg: "0.5rem",
                xl: "0.75rem",
                full: "9999px"
            }
        }
    }
};
