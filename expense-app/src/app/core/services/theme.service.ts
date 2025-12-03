import { computed, effect, Injectable, signal } from "@angular/core";
import { Color, ScaleType } from '@swimlane/ngx-charts';

export type Theme = "light" | "dark" | "system";

/** Color variants generated from a base brand color */
export interface ColorVariants {
  primary: string;
  hover: string;
  strong: string;
  light: string; // Lighter variant for gradients
  soft: string;
  border: string;
  focusRing: string;
  backgroundActive: string;
}

/** Chart color palette for ngx-charts */
export interface ChartColorPalette {
  /** Primary color scheme for pie charts and general use */
  primary: Color;
  /** Color scheme for line/area charts */
  line: Color;
  /** Status-based color scheme (pending, approved, rejected, etc.) */
  status: Color;
  /** Array of hex colors for use in templates */
  colors: string[];
}

@Injectable({
    providedIn: "root",
})
export class ThemeService {
    private readonly THEME_KEY = "jensify-theme-preference";
    private readonly DEFAULT_PRIMARY = '#F7580C';

    // Signal to track the current active theme
    theme = signal<Theme>("dark");

    // Signal to track the current primary brand color
    primaryColor = signal<string>(this.DEFAULT_PRIMARY);

    // Computed chart color palette based on current primary color
    chartColors = computed<ChartColorPalette>(() => this.generateChartColorPalette(this.primaryColor()));

    constructor() {
        // Load saved preference or default to system
        const savedTheme = localStorage.getItem(this.THEME_KEY) as Theme;
        if (savedTheme) {
            this.theme.set(savedTheme);
        }

        // Effect to apply the theme whenever it changes
        effect(() => {
            const currentTheme = this.theme();
            this.applyTheme(currentTheme);
            localStorage.setItem(this.THEME_KEY, currentTheme);
        });

        // Listen for system preference changes if in system mode
        window.matchMedia("(prefers-color-scheme: dark)").addEventListener(
            "change",
            (_e) => {
                if (this.theme() === "system") {
                    this.applyTheme("system");
                }
            },
        );
    }

    setTheme(newTheme: Theme) {
        this.theme.set(newTheme);
    }

    toggleTheme() {
        const current = this.theme();
        if (current === "light") {
            this.setTheme("dark");
        } else {
            this.setTheme("light");
        }
    }

    private applyTheme(theme: Theme) {
        const root = document.documentElement;
        const isDark = theme === "dark" ||
            (theme === "system" &&
                window.matchMedia("(prefers-color-scheme: dark)").matches);

        if (isDark) {
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
        }
    }

    /**
     * Apply organization brand color to CSS variables
     * Generates color variants and applies them to document root
     */
    applyBrandColor(hexColor: string): void {
        const root = document.documentElement;
        const variants = this.generateColorVariants(hexColor);

        // Update the primary color signal so chart colors update
        this.primaryColor.set(hexColor);

        root.style.setProperty('--jensify-primary', variants.primary);
        root.style.setProperty('--jensify-primary-hover', variants.hover);
        root.style.setProperty('--jensify-primary-strong', variants.strong);
        root.style.setProperty('--jensify-primary-light', variants.light);
        root.style.setProperty('--jensify-primary-soft', variants.soft);
        root.style.setProperty('--jensify-primary-border', variants.border);
        root.style.setProperty('--jensify-focus-ring', variants.focusRing);
        root.style.setProperty('--jensify-primary-background-active', variants.backgroundActive);
        root.style.setProperty('--jensify-accent', variants.hover);
    }

    /**
     * Reset brand colors to default Jensify orange
     */
    resetBrandColor(): void {
        this.applyBrandColor('#F7580C');
    }

    /**
     * Generate color variants from a base hex color
     */
    generateColorVariants(hex: string): ColorVariants {
        const hsl = this.hexToHSL(hex);

        return {
            primary: hex,
            hover: this.hslToHex(hsl.h, hsl.s, Math.min(hsl.l + 8, 95)),
            strong: this.hslToHex(hsl.h, Math.min(hsl.s + 5, 100), Math.max(hsl.l - 8, 5)),
            light: this.hslToHex(hsl.h, Math.max(hsl.s - 10, 50), Math.min(hsl.l + 12, 70)), // Lighter for gradients
            soft: this.hslToHex(hsl.h, Math.max(hsl.s - 35, 15), 96),
            border: this.hslToHex(hsl.h, Math.max(hsl.s - 15, 25), 82),
            focusRing: this.hslToHex(hsl.h, Math.max(hsl.s - 10, 30), 72),
            backgroundActive: this.hslToHex(hsl.h, Math.max(hsl.s - 25, 20), 92),
        };
    }

    /**
     * Convert hex color to HSL
     */
    private hexToHSL(hex: string): { h: number; s: number; l: number } {
        // Remove # if present
        hex = hex.replace(/^#/, '');

        // Parse RGB
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0;
        let s = 0;
        const l = (max + min) / 2;

        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r:
                    h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                    break;
                case g:
                    h = ((b - r) / d + 2) / 6;
                    break;
                case b:
                    h = ((r - g) / d + 4) / 6;
                    break;
            }
        }

        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100),
        };
    }

    /**
     * Convert HSL values to hex color
     */
    private hslToHex(h: number, s: number, l: number): string {
        s /= 100;
        l /= 100;

        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;

        let r = 0, g = 0, b = 0;

        if (h >= 0 && h < 60) {
            r = c; g = x; b = 0;
        } else if (h >= 60 && h < 120) {
            r = x; g = c; b = 0;
        } else if (h >= 120 && h < 180) {
            r = 0; g = c; b = x;
        } else if (h >= 180 && h < 240) {
            r = 0; g = x; b = c;
        } else if (h >= 240 && h < 300) {
            r = x; g = 0; b = c;
        } else {
            r = c; g = 0; b = x;
        }

        const toHex = (n: number): string => {
            const hex = Math.round((n + m) * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
    }

    /**
     * Generate a complete chart color palette from a primary color
     * Creates shades and complementary colors for different chart types
     */
    generateChartColorPalette(primaryHex: string): ChartColorPalette {
        const hsl = this.hexToHSL(primaryHex);

        // Generate shades of the primary color for pie charts
        const primaryShades = [
            primaryHex, // Original primary
            this.hslToHex(hsl.h, Math.max(hsl.s - 15, 40), Math.min(hsl.l + 15, 75)), // Lighter
            this.hslToHex(hsl.h, Math.max(hsl.s - 25, 30), Math.min(hsl.l + 25, 85)), // Even lighter
            this.hslToHex(hsl.h, Math.max(hsl.s - 35, 20), Math.min(hsl.l + 35, 90)), // Very light
            this.hslToHex(hsl.h, Math.max(hsl.s - 45, 15), Math.min(hsl.l + 42, 93)), // Subtle
            '#1a1a2e' // Dark accent for contrast
        ];

        // Additional colors for larger datasets (complementary and analogous)
        const extendedColors = [
            primaryHex,
            '#3B82F6', // Blue (complementary feel)
            '#22C55E', // Green (success/positive)
            '#F59E0B', // Amber (warning/attention)
            '#EF4444', // Red (error/negative)
            '#8B5CF6', // Purple
            '#EC4899', // Pink
            '#06B6D4', // Cyan
            '#84CC16', // Lime
            '#F97316'  // Orange variant
        ];

        // Status colors remain semantic (not theme-dependent)
        const statusColors = ['#F59E0B', '#10B981', '#3B82F6', '#EF4444'];

        return {
            primary: {
                name: 'JensifyPrimary',
                selectable: true,
                group: ScaleType.Ordinal,
                domain: primaryShades
            },
            line: {
                name: 'JensifyLine',
                selectable: true,
                group: ScaleType.Ordinal,
                domain: [primaryHex, '#34D399', '#60A5FA']
            },
            status: {
                name: 'JensifyStatus',
                selectable: true,
                group: ScaleType.Ordinal,
                domain: statusColors
            },
            colors: extendedColors
        };
    }

    /**
     * Get the current primary color from CSS variable or default
     */
    getCurrentPrimaryColor(): string {
        const cssValue = getComputedStyle(document.documentElement)
            .getPropertyValue('--jensify-primary')
            .trim();
        return cssValue || this.DEFAULT_PRIMARY;
    }
}
