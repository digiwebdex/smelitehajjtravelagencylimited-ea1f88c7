import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TranslationContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (section: string, key: string, fallback?: string) => string;
  isLoading: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

interface Translation {
  section: string;
  key: string;
  value: string;
}

export const TranslationProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState("en");
  const [translations, setTranslations] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load saved language preference
    const savedLang = localStorage.getItem("language");
    if (savedLang) {
      setLanguageState(savedLang);
    }
  }, []);

  useEffect(() => {
    fetchTranslations();
  }, [language]);

  const fetchTranslations = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("translations")
      .select("section, key, value")
      .eq("language_code", language);

    if (!error && data) {
      const translationMap: { [key: string]: string } = {};
      data.forEach((t: Translation) => {
        translationMap[`${t.section}.${t.key}`] = t.value;
      });
      setTranslations(translationMap);
    }
    setIsLoading(false);
  };

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (section: string, key: string, fallback?: string): string => {
    const fullKey = `${section}.${key}`;
    return translations[fullKey] || fallback || key;
  };

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t, isLoading }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }
  return context;
};

export default useTranslation;
