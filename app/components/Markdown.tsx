"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { linkify, linkifyChildren, useNoteLinks } from "./NoteLinks";

/** Renders assistant markdown — tables, code, lists — styled for the dark UI,
 *  with any real note reference turned into an "open in Obsidian" link. */
export function Markdown({ children }: { children: string }) {
  const idx = useNoteLinks();
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
          p: ({ children }) => <p>{linkifyChildren(children, idx)}</p>,
          li: ({ children }) => <li>{linkifyChildren(children, idx)}</li>,
          strong: ({ children }) => <strong>{linkifyChildren(children, idx)}</strong>,
          em: ({ children }) => <em>{linkifyChildren(children, idx)}</em>,
          td: ({ children }) => <td>{linkifyChildren(children, idx)}</td>,
          th: ({ children }) => <th>{linkifyChildren(children, idx)}</th>,
          table: ({ ...props }) => (
            <div className="md-table-wrap">
              <table {...props} />
            </div>
          ),
          code: ({ className, children, ...props }) => {
            const inline = !className;
            if (inline) {
              const text = String(children ?? "");
              return (
                <code className="md-code-inline" {...props}>
                  {linkify(text, idx)}
                </code>
              );
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
