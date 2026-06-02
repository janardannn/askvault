import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders assistant markdown — tables, code, lists — styled for the dark UI. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
          table: ({ ...props }) => (
            <div className="md-table-wrap">
              <table {...props} />
            </div>
          ),
          code: ({ className, children, ...props }) => {
            const inline = !className;
            return inline ? (
              <code className="md-code-inline" {...props}>
                {children}
              </code>
            ) : (
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
