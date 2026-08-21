'use client'

import clsx from 'clsx'
import ReactMarkdown, { type Components } from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'

import 'highlight.js/styles/github.css'

import { UnoptimizedImage } from './ui/unoptimized-image'

const HIGHLIGHT_START = '‹‹HL››'
const HIGHLIGHT_END = '‹‹/HL››'

type MarkdownPreviewProps = {
  markdown: string
  className?: string
  emptyPlaceholder?: string
  highlightMode?: boolean
}

const Code: Components['code'] = ({ className, children, ...props }) => {
  return (
    <pre className='mt-4 overflow-x-auto rounded-md bg-muted/70 p-3 text-sm leading-relaxed'>
      <code className={clsx('hljs', className)} {...props}>
        {children}
      </code>
    </pre>
  )
}

const createComponents = (): Components => ({
  h1: ({ node, children, ...props }) => (
    <h1 className={clsx('first:mt-0', 'mt-6', 'font-semibold', 'text-2xl')} {...props}>
      {children}
    </h1>
  ),
  h2: ({ node, children, ...props }) => (
    <h2 className={clsx('first:mt-0', 'mt-5', 'font-semibold', 'text-xl')} {...props}>
      {children}
    </h2>
  ),
  h3: ({ node, children, ...props }) => (
    <h3 className={clsx('first:mt-0', 'mt-4', 'font-semibold', 'text-lg')} {...props}>
      {children}
    </h3>
  ),
  h4: ({ node, children, ...props }) => (
    <h4 className={clsx('first:mt-0', 'mt-4', 'font-semibold', 'text-base')} {...props}>
      {children}
    </h4>
  ),
  h5: ({ node, children, ...props }) => (
    <h5 className={clsx('first:mt-0', 'mt-3', 'font-medium', 'text-base', 'tracking-wide')} {...props}>
      {children}
    </h5>
  ),
  h6: ({ node, children, ...props }) => (
    <h6 className={clsx('first:mt-0', 'mt-3', 'text-sm', 'tracking-wide', 'text-muted-foreground')} {...props}>
      {children}
    </h6>
  ),
  p: ({ node, ...props }) => (
    <p className={clsx('first:mt-0', 'leading-relaxed', 'mt-3', 'text-justify', 'text-muted-foreground')} {...props} />
  ),
  ul: ({ node, ...props }) => <ul className='mt-3 list-disc space-y-2 pl-6' {...props} />,
  ol: ({ node, ...props }) => <ol className='mt-3 list-decimal space-y-2 pl-6' {...props} />,
  li: ({ node, ...props }) => <li className={clsx('text-justify', 'leading-relaxed')} {...props} />,
  blockquote: ({ node, ...props }) => (
    <blockquote
      className={clsx(
        'mt-4',
        'border-l-4',
        'border-primary/40',
        'pl-4',
        'italic',
        'text-justify',
        'text-muted-foreground'
      )}
      {...props}
    />
  ),
  a: ({ node, ...props }) => (
    <a
      className='text-primary underline decoration-primary/20 underline-offset-2 hover:decoration-primary'
      target='_blank'
      rel='noopener noreferrer'
      {...props}
    />
  ),
  table: ({ node, ...props }) => (
    <div className='mt-4 overflow-x-auto rounded-md border'>
      <table className='w-full border-collapse text-left text-sm' {...props} />
    </div>
  ),
  thead: ({ node, ...props }) => <thead className='bg-muted/50 text-muted-foreground' {...props} />,
  tbody: ({ node, ...props }) => <tbody className='divide-y' {...props} />,
  th: ({ node, ...props }) => <th className='px-3 py-2 font-medium' {...props} />,
  td: ({ node, ...props }) => <td className='px-3 py-2 align-top' {...props} />,
  code: Code,
  hr: () => <hr className='my-6 border-border/70' />,
  img: ({ alt, src }) =>
    typeof src === 'string' ? (
      <UnoptimizedImage
        src={src}
        alt={alt ?? 'article image'}
        width={1600}
        height={900}
        sizes='100vw'
        className='mt-4 h-auto max-w-full rounded-md'
      />
    ) : null,
  strong: ({ node, ...props }) => <strong className='font-semibold text-foreground' {...props} />,
  mark: ({ node, ...props }) => <mark className='bg-primary/20 text-foreground' {...props} />,
  em: ({ node, ...props }) => <em className='text-muted-foreground' {...props} />,
  del: ({ node, ...props }) => <del className='text-muted-foreground' {...props} />,
  pre: ({ children }) => children,
})

export const MarkdownPreview = ({
  markdown,
  className,
  emptyPlaceholder,
  highlightMode = false,
}: MarkdownPreviewProps) => {
  let content = markdown?.trim()

  if (!content) {
    return (
      <p className={clsx('text-center text-muted-foreground text-sm', className)}>
        {emptyPlaceholder ?? 'Nothing to preview yet.'}
      </p>
    )
  }

  // Convert highlight markers to HTML <mark> tags when highlightMode is enabled
  if (highlightMode) {
    content = content.replaceAll(HIGHLIGHT_START, '<mark>').replaceAll(HIGHLIGHT_END, '</mark>')
  }

  const components = createComponents()

  return (
    <div
      className={clsx(
        'prose',
        'prose-sm',
        'dark:prose-invert',
        'max-w-none',
        'prose-blockquote:text-justify',
        'prose-li:text-justify',
        'prose-p:text-justify',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
