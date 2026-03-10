import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const useVPS = !!env.VITE_API_URL;

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        // When VITE_API_URL is set (VPS build), swap Supabase client with VPS client
        ...(useVPS ? {
          "@/integrations/supabase/client": path.resolve(__dirname, "./src/lib/vpsClient.ts"),
        } : {}),
      },
      dedupe: ["react", "react-dom", "@tanstack/react-query"],
    },
    optimizeDeps: {
      include: ["react", "react-dom", "@tanstack/react-query"],
      force: true,
    },
  };
});
