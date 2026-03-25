// ui/src/components/Markdown.jsx
import { marked } from "marked";
import { useMemo } from "react";

// Configure marked — no GFM tables needed, just basic formatting
marked.setOptions({ breaks: true, gfm: true });

export default function Markdown({ children, style = {} }) {
  const html = useMemo(() => {
    if (!children) return "";
    return marked.parse(String(children));
  }, [children]);

  return (
    <div
      className="md"
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
