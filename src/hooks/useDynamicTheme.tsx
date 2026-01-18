import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";

interface ThemeSettings {
  id: string;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  background_color: string | null;
  text_color: string | null;
  font_family: string | null;
  heading_font: string | null;
  dark_mode_enabled: boolean | null;
  border_radius: string | null;
}

interface DynamicThemeContextType {
  themeSettings: ThemeSettings | null;
  loading: boolean;
  refreshTheme: () => Promise<void>;
}

const DynamicThemeContext = createContext<DynamicThemeContextType>({
  themeSettings: null,
  loading: true,
  refreshTheme: async () => {},
});

// Convert hex color to HSL values string (without hsl() wrapper)
const hexToHSL = (hex: string): string => {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse hex values
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

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

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

// Border radius mapping
const borderRadiusMap: Record<string, string> = {
  none: "0",
  sm: "0.25rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  "2xl": "1.5rem",
  full: "9999px",
};

// Font family mapping
const fontFamilyMap: Record<string, string> = {
  Inter: "'Inter', sans-serif",
  "Playfair Display": "'Playfair Display', serif",
  "Aref Ruqaa": "'Aref Ruqaa', serif",
  Roboto: "'Roboto', sans-serif",
  "Open Sans": "'Open Sans', sans-serif",
  Lato: "'Lato', sans-serif",
  Poppins: "'Poppins', sans-serif",
  Montserrat: "'Montserrat', sans-serif",
};

export const DynamicThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeSettings, setThemeSettings] = useState<ThemeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { setTheme } = useTheme();

  const fetchThemeSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("theme_settings")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching theme settings:", error);
        return;
      }

      if (data) {
        setThemeSettings(data);
        applyTheme(data);
      }
    } catch (error) {
      console.error("Error fetching theme settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (settings: ThemeSettings) => {
    const root = document.documentElement;

    // Apply dark mode
    if (settings.dark_mode_enabled) {
      setTheme("dark");
    } else {
      setTheme("light");
    }

    // Apply primary color
    if (settings.primary_color) {
      const primaryHSL = hexToHSL(settings.primary_color);
      root.style.setProperty("--primary", primaryHSL);
      root.style.setProperty("--ring", primaryHSL);
      
      // Create darker variant for gradient
      const hex = settings.primary_color.replace(/^#/, '');
      let r = parseInt(hex.substring(0, 2), 16);
      let g = parseInt(hex.substring(2, 4), 16);
      let b = parseInt(hex.substring(4, 6), 16);
      r = Math.max(0, r - 30);
      g = Math.max(0, g - 30);
      b = Math.max(0, b - 30);
      const darkerHex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      const darkerHSL = hexToHSL(darkerHex);
      
      root.style.setProperty(
        "--gradient-primary",
        `linear-gradient(135deg, hsl(${primaryHSL}), hsl(${darkerHSL}))`
      );
    }

    // Apply secondary color (gold accent)
    if (settings.secondary_color) {
      const secondaryHSL = hexToHSL(settings.secondary_color);
      root.style.setProperty("--secondary", secondaryHSL);
      root.style.setProperty("--gold", secondaryHSL);
      
      // Create gradient variant
      const hex = settings.secondary_color.replace(/^#/, '');
      let r = parseInt(hex.substring(0, 2), 16);
      let g = parseInt(hex.substring(2, 4), 16);
      let b = parseInt(hex.substring(4, 6), 16);
      r = Math.max(0, r - 20);
      g = Math.max(0, g - 20);
      b = Math.max(0, b - 20);
      const darkerHex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      const darkerHSL = hexToHSL(darkerHex);
      
      root.style.setProperty(
        "--gradient-gold",
        `linear-gradient(135deg, hsl(${secondaryHSL}), hsl(${darkerHSL}))`
      );
      root.style.setProperty(
        "--shadow-gold",
        `0 8px 32px -8px hsl(${secondaryHSL} / 0.35)`
      );
    }

    // Apply accent color
    if (settings.accent_color) {
      const accentHSL = hexToHSL(settings.accent_color);
      root.style.setProperty("--accent", accentHSL);
    }

    // Apply background color
    if (settings.background_color) {
      const bgHSL = hexToHSL(settings.background_color);
      root.style.setProperty("--background", bgHSL);
    }

    // Apply text color
    if (settings.text_color) {
      const textHSL = hexToHSL(settings.text_color);
      root.style.setProperty("--foreground", textHSL);
      root.style.setProperty("--card-foreground", textHSL);
      root.style.setProperty("--popover-foreground", textHSL);
    }

    // Apply font family
    if (settings.font_family) {
      const fontValue = fontFamilyMap[settings.font_family] || `'${settings.font_family}', sans-serif`;
      root.style.setProperty("--font-body", fontValue);
    }

    // Apply heading font
    if (settings.heading_font) {
      const fontValue = fontFamilyMap[settings.heading_font] || `'${settings.heading_font}', serif`;
      root.style.setProperty("--font-heading", fontValue);
    }

    // Apply border radius
    if (settings.border_radius) {
      const radiusValue = borderRadiusMap[settings.border_radius] || settings.border_radius;
      root.style.setProperty("--radius", radiusValue);
    }
  };

  useEffect(() => {
    fetchThemeSettings();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("theme_settings_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "theme_settings",
        },
        (payload) => {
          if (payload.new) {
            const newSettings = payload.new as ThemeSettings;
            setThemeSettings(newSettings);
            applyTheme(newSettings);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const refreshTheme = async () => {
    await fetchThemeSettings();
  };

  return (
    <DynamicThemeContext.Provider value={{ themeSettings, loading, refreshTheme }}>
      {children}
    </DynamicThemeContext.Provider>
  );
};

export const useDynamicTheme = () => useContext(DynamicThemeContext);
