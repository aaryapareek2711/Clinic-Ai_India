import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const mdComponents: Components = {
  h1: ({ children }) => <p className="mb-2 mt-1 text-sm font-semibold text-[#171d16]">{children}</p>,
  h2: ({ children }) => <p className="mb-2 mt-2 text-sm font-semibold text-[#171d16]">{children}</p>,
  h3: ({ children }) => <p className="mb-1.5 mt-2 text-sm font-semibold text-[#171d16]">{children}</p>,
  h4: ({ children }) => <p className="mb-1 mt-1.5 text-sm font-medium text-[#171d16]">{children}</p>,
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1.5 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1.5 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-[#171d16]">{children}</strong>,
  em: ({ children }) => <em className="italic text-[#3d4947]">{children}</em>,
  a: ({ href, children }) => (
    <a
      className="font-medium text-[#006b2c] underline underline-offset-2 hover:text-[#005a24]"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-[#006b2c]/35 pl-3 text-[#575e70] last:mb-0">{children}</blockquote>
  ),
  hr: () => <hr className="my-3 border-gray-300" />,
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className?.includes('language-'))
    if (isBlock) {
      return (
        <pre className="mb-2 overflow-x-auto rounded-lg bg-white/70 p-2 text-xs last:mb-0">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      )
    }
    return (
      <code className="rounded bg-white/70 px-1 py-0.5 font-mono text-xs" {...props}>
        {children}
      </code>
    )
  },
}

type ClinicalAssistantMarkdownProps = {
  content: string
}

/** Renders assistant replies (Markdown from the model) as styled HTML. */
export default function ClinicalAssistantMarkdown({ content }: ClinicalAssistantMarkdownProps) {
  return (
    <div className="clinical-assistant-md break-words text-sm leading-relaxed text-[#171d16]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
