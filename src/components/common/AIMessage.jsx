import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";


const STATUS_STYLES = [
  [/^(available|vacant|clean|completed|paid|confirmed|connected)$/i, "bg-emerald-50 text-emerald-700 ring-emerald-200"],
  [/^(occupied|checked[\s_-]?in|in[\s_-]?progress|assigned)$/i, "bg-blue-50 text-blue-700 ring-blue-200"],
  [/^(cleaning|pending|reserved|hold|partial|reported|waiting.*)$/i, "bg-amber-50 text-amber-700 ring-amber-200"],
  [/^(maintenance|blocked|cancelled|no[\s_-]?show|unpaid|overdue|failed|out[\s_-]?of[\s_-]?order)$/i, "bg-rose-50 text-rose-700 ring-rose-200"],
];

const textOf = (children) =>
  []
    .concat(children)
    .map((child) => (typeof child === "string" ? child : ""))
    .join("")
    .replace(/\*\*/g, "")
    .trim();

const Cell = ({ children, header, ...props }) => {
  if (header) {
    return (
      <th
        className="whitespace-nowrap bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
        {...props}
      >
        {children}
      </th>
    );
  }

  const plain = textOf(children).replace(/\(.*\)$/, "").trim();
  const style = STATUS_STYLES.find(([pattern]) => pattern.test(plain));

  return (
    <td className="border-t border-slate-100 px-3 py-2 align-top text-slate-700" {...props}>
      {style ? (
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ${style[1]}`}
        >
          {children}
        </span>
      ) : (
        children
      )}
    </td>
  );
};

const components = {
  table: ({ node, ...props }) => (
    <div className="my-3 overflow-x-auto rounded border border-slate-200 bg-white">
      <table className="w-full min-w-max text-sm" {...props} />
    </div>
  ),
  th: ({ node, ...props }) => <Cell header {...props} />,
  td: ({ node, ...props }) => <Cell {...props} />,
  p: ({ node, ...props }) => <p className=" leading-relaxed" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-semibold text-slate-900" {...props} />,
  ul: ({ node, ...props }) => <ul className="my-2 list-disc space-y-1 pl-5" {...props} />,
  ol: ({ node, ...props }) => <ol className="my-2 list-decimal space-y-1 pl-5" {...props} />,
  h1: ({ node, ...props }) => <h3 className="mb-1 mt-3 text-base font-bold text-slate-900" {...props} />,
  h2: ({ node, ...props }) => <h3 className="mb-1 mt-3 text-base font-bold text-slate-900" {...props} />,
  h3: ({ node, ...props }) => <h4 className="mb-1 mt-3 text-sm font-bold text-slate-900" {...props} />,
  code: ({ node, ...props }) => (
    <code className="rounded bg-slate-100 px-1 py-0.5 text-xs" {...props} />
  ),
};

export default function AIMessage({ text = "" }) {
  return (
    <div className="text-sm text-slate-700">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {String(text)}
      </ReactMarkdown>
    </div>
  );
}