import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Terminal } from "lucide-react";

interface TerminalContent {
  id: string;
  title: string;
  terminal_text: string;
  bg_color: string;
  text_color: string;
  font_size: string;
  typing_animation: boolean;
  is_enabled: boolean;
}

const TerminalSection = () => {
  const [content, setContent] = useState<TerminalContent | null>(null);
  const [displayedText, setDisplayedText] = useState("");
  const [loading, setLoading] = useState(true);
  const textRef = useRef<string>("");

  useEffect(() => {
    fetchContent();
  }, []);

  useEffect(() => {
    if (content?.terminal_text && content.typing_animation) {
      animateText(content.terminal_text);
    } else if (content?.terminal_text) {
      setDisplayedText(content.terminal_text);
    }
  }, [content]);

  const fetchContent = async () => {
    const { data, error } = await supabase
      .from("terminal_content")
      .select("*")
      .eq("is_enabled", true)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setContent(data as TerminalContent);
    }
    setLoading(false);
  };

  const animateText = (text: string) => {
    textRef.current = "";
    setDisplayedText("");
    
    let charIndex = 0;
    const interval = setInterval(() => {
      if (charIndex < text.length) {
        textRef.current += text[charIndex];
        setDisplayedText(textRef.current);
        charIndex++;
      } else {
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  };

  if (loading || !content || !content.is_enabled) {
    return null;
  }

  return (
    <section 
      id="terminal" 
      className="py-16 md:py-24 relative overflow-hidden"
      style={{ backgroundColor: content.bg_color }}
    >
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <span 
            className="inline-flex items-center gap-2 font-semibold uppercase tracking-wider mb-3"
            style={{ color: content.text_color, opacity: 0.8 }}
          >
            <Terminal className="w-4 h-4" />
            {content.title}
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <div 
            className="rounded-xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: `color-mix(in srgb, ${content.bg_color} 80%, black)` }}
          >
            {/* Terminal Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span 
                className="ml-3 text-sm opacity-60"
                style={{ color: content.text_color }}
              >
                bright-expeditions@terminal: ~
              </span>
            </div>

            {/* Terminal Content */}
            <div 
              className="p-6 min-h-[250px] font-mono overflow-auto"
              style={{ 
                color: content.text_color,
                fontSize: content.font_size,
              }}
            >
              <pre className="whitespace-pre-wrap leading-relaxed">
                {displayedText}
                <span className="animate-pulse ml-1">▋</span>
              </pre>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TerminalSection;
