'use client'

import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { type Editor, EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import clsx from 'clsx'
import { type ReactElement, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Markdown } from 'tiptap-markdown'

import {
  ArrowUUpLeftIcon,
  ArrowUUpRightIcon,
  CodeSimpleIcon,
  ImageIcon,
  LinkSimpleIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  QuotesIcon,
  SpinnerIcon,
  TextBIcon,
  TextHFiveIcon,
  TextHFourIcon,
  TextHOneIcon,
  TextHSixIcon,
  TextHThreeIcon,
  TextHTwoIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
} from '@phosphor-icons/react/dist/ssr'
import type { UploadError, UploadResponse } from '~/app/api/upload/schema'

type MarkdownEditorProps = {
  id?: string
  value: string
  onChangeAction: (markdown: string) => void
  onBlurAction?: () => void
  placeholder?: string
  disabled?: boolean
  className?: string
  height?: number
  articleId?: string
}

const extractImageUrls = (editor: Editor): string[] => {
  const urls: string[] = []
  editor.state.doc.descendants((node) => {
    if (node.type.name === 'image' && node.attrs.src) {
      urls.push(node.attrs.src)
    }
  })
  return urls
}

const deleteImageFromStorage = async (url: string) => {
  try {
    await fetch('/api/upload', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
  } catch (error) {
    console.error('Failed to delete image:', error)
  }
}

const toolbarButtonBase =
  'inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-sm transition-colors'

const toolbarButtonStyles = {
  default: 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  active: 'bg-primary/15 text-primary border-primary/40 hover:bg-primary/20',
  disabled: 'opacity-50 cursor-not-allowed hover:bg-muted hover:text-muted-foreground',
}

type ToolbarButtonProps = {
  icon: ReactElement
  onClick: () => void
  active?: boolean
  disabled?: boolean
  label: string
}

const ToolbarButton = ({ icon, onClick, active, disabled, label }: ToolbarButtonProps) => (
  <button
    type='button'
    className={clsx(
      toolbarButtonBase,
      disabled && toolbarButtonStyles.disabled,
      !disabled && active ? toolbarButtonStyles.active : toolbarButtonStyles.default
    )}
    onClick={onClick}
    aria-label={label}
    title={label}
    disabled={disabled}
  >
    {icon}
  </button>
)

const ToolbarDivider = () => <div className='mx-1 h-6 w-px bg-border' />

type MarkdownEditorToolbarProps = {
  controlsDisabled: boolean
  editor: Editor
  hasSelection: boolean
  isUploading: boolean
  onHeadingChange: (level: 1 | 2 | 3 | 4 | 5 | 6) => void
  onImageUpload: () => void
  onLinkInsert: () => void
}

const MarkdownEditorToolbar = ({
  controlsDisabled,
  editor,
  hasSelection,
  isUploading,
  onHeadingChange,
  onImageUpload,
  onLinkInsert,
}: MarkdownEditorToolbarProps) => {
  return (
    <div className='sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b bg-muted/60 px-2 py-1.5'>
      <ToolbarButton
        icon={<TextBIcon className='size-4' />}
        label='Bold'
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        disabled={controlsDisabled}
      />
      <ToolbarButton
        icon={<TextItalicIcon className='size-4' />}
        label='Italic'
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        disabled={controlsDisabled}
      />
      <ToolbarButton
        icon={<TextStrikethroughIcon className='size-4' />}
        label='Strikethrough'
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
        disabled={controlsDisabled}
      />

      <ToolbarDivider />

      <ToolbarButton
        icon={<TextHOneIcon className='size-4' />}
        label='Heading 1'
        onClick={() => onHeadingChange(1)}
        active={editor.isActive('heading', { level: 1 })}
        disabled={controlsDisabled}
      />
      <ToolbarButton
        icon={<TextHTwoIcon className='size-4' />}
        label='Heading 2'
        onClick={() => onHeadingChange(2)}
        active={editor.isActive('heading', { level: 2 })}
        disabled={controlsDisabled}
      />
      <ToolbarButton
        icon={<TextHThreeIcon className='size-4' />}
        label='Heading 3'
        onClick={() => onHeadingChange(3)}
        active={editor.isActive('heading', { level: 3 })}
        disabled={controlsDisabled}
      />
      <ToolbarButton
        icon={<TextHFourIcon className='size-4' />}
        label='Heading 4'
        onClick={() => onHeadingChange(4)}
        active={editor.isActive('heading', { level: 4 })}
        disabled={controlsDisabled}
      />
      <ToolbarButton
        icon={<TextHFiveIcon className='size-4' />}
        label='Heading 5'
        onClick={() => onHeadingChange(5)}
        active={editor.isActive('heading', { level: 5 })}
        disabled={controlsDisabled}
      />
      <ToolbarButton
        icon={<TextHSixIcon className='size-4' />}
        label='Heading 6'
        onClick={() => onHeadingChange(6)}
        active={editor.isActive('heading', { level: 6 })}
        disabled={controlsDisabled}
      />

      <ToolbarDivider />

      <ToolbarButton
        icon={<ListBulletsIcon className='size-4' />}
        label='Bullet list'
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        disabled={controlsDisabled}
      />
      <ToolbarButton
        icon={<ListNumbersIcon className='size-4' />}
        label='Numbered list'
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        disabled={controlsDisabled}
      />
      <ToolbarButton
        icon={<QuotesIcon className='size-4' />}
        label='Blockquote'
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')}
        disabled={controlsDisabled}
      />
      <ToolbarButton
        icon={<CodeSimpleIcon className='size-4' />}
        label='Code block'
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={editor.isActive('codeBlock')}
        disabled={controlsDisabled}
      />
      <ToolbarButton
        icon={<LinkSimpleIcon className='size-4' />}
        label='Insert link'
        onClick={onLinkInsert}
        active={editor.isActive('link')}
        disabled={controlsDisabled || !hasSelection}
      />
      <ToolbarButton
        icon={isUploading ? <SpinnerIcon className='size-4 animate-spin' /> : <ImageIcon className='size-4' />}
        label='Insert image'
        onClick={onImageUpload}
        active={editor.isActive('image')}
        disabled={controlsDisabled || isUploading}
      />

      <ToolbarDivider />

      <ToolbarButton
        icon={<ArrowUUpLeftIcon className='size-4' />}
        label='Undo'
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run() || controlsDisabled}
      />
      <ToolbarButton
        icon={<ArrowUUpRightIcon className='size-4' />}
        label='Redo'
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run() || controlsDisabled}
      />
    </div>
  )
}

type MarkdownStorage = {
  getMarkdown: () => string
  setMarkdown?: (markdown: string) => void
}

const getMarkdownStorage = (editor: Editor | null): MarkdownStorage | null => {
  if (!editor) {
    return null
  }
  const storage = (editor.storage as unknown as { markdown?: MarkdownStorage }).markdown
  if (!storage || typeof storage.getMarkdown !== 'function') {
    return null
  }
  return storage
}

const useEditorValueSync = ({
  disabled,
  editor,
  lastMarkdown,
  value,
}: {
  disabled: boolean
  editor: Editor | null
  lastMarkdown: { current: string }
  value: string
}) => {
  useEffect(() => {
    if (!editor) {
      return
    }
    const storage = getMarkdownStorage(editor)
    const current = storage?.getMarkdown() ?? ''
    if (value === current) {
      return
    }
    lastMarkdown.current = value ?? ''
    if (storage?.setMarkdown) {
      storage.setMarkdown(value ?? '')
      return
    }
    editor.commands.setContent(value ?? '')
  }, [editor, value, lastMarkdown])

  useEffect(() => {
    if (!editor) {
      return
    }
    editor.setEditable(!disabled)
  }, [editor, disabled])
}

const useEditorSelectionEmpty = (editor: Editor | null) => {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!editor) return () => undefined

      editor.on('selectionUpdate', onStoreChange)
      editor.on('transaction', onStoreChange)

      return () => {
        editor.off('selectionUpdate', onStoreChange)
        editor.off('transaction', onStoreChange)
      }
    },
    [editor]
  )
  const getSnapshot = useCallback(() => editor?.state.selection.empty ?? true, [editor])

  return useSyncExternalStore(subscribe, getSnapshot, () => true)
}

export const MarkdownEditor = ({
  id,
  value,
  onChangeAction,
  onBlurAction,
  placeholder,
  disabled = false,
  className,
  height = 400,
  articleId,
}: MarkdownEditorProps) => {
  const lastMarkdown = useRef(value ?? '')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previousImagesRef = useRef<Set<string>>(new Set())
  const editorRef = useRef<Editor | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      const formData = new FormData()
      formData.append('file', file)
      if (articleId) {
        formData.append('articleId', articleId)
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as UploadError | null
        throw new Error(errorData?.error ?? 'Upload failed')
      }

      const data = (await response.json()) as UploadResponse

      previousImagesRef.current.add(data.url)
      return data.url
    },
    [articleId]
  )

  const extensions = useMemo(
    () => [
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: '-',
        transformPastedText: true,
        transformCopiedText: true,
      }),
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Link.configure({
        openOnClick: false,
        validate: (href) => /^https?:\/\//i.test(href) || href.startsWith('mailto:'),
      }),
      Image.extend({
        addNodeView() {
          return ({ node }) => {
            const container = document.createElement('div')
            container.className = 'my-4'

            const img = document.createElement('img')
            img.src = node.attrs.src
            img.alt = node.attrs.alt ?? ''
            img.className = 'max-w-full h-auto rounded-md'

            img.onerror = () => {
              container.innerHTML = `
                <div class="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-destructive/50 bg-destructive/5 p-6 text-destructive">
                  <span class="text-sm font-medium">Failed to load image</span>
                  <span class="text-xs opacity-70 break-all max-w-full">${node.attrs.src || 'No URL'}</span>
                </div>
              `
            }

            container.appendChild(img)
            return { dom: container }
          }
        },
      }).configure({
        inline: false,
        allowBase64: false,
      }),
      Placeholder.configure({
        placeholder: placeholder ?? '',
      }),
    ],
    [placeholder]
  )

  const handlePastedImage = useCallback(
    (file: File) => {
      setIsUploading(true)
      uploadImage(file)
        .then((url) => {
          if (url && editorRef.current) {
            editorRef.current
              .chain()
              .focus()
              .setImage({ src: url, alt: file.name || 'Pasted image' })
              .run()
          }
        })
        .catch((error) => {
          console.error('Paste image upload failed:', error)
          window.alert(error instanceof Error ? error.message : 'Failed to upload pasted image')
        })
        .finally(() => {
          setIsUploading(false)
        })
    },
    [uploadImage]
  )

  const handlePaste = useCallback(
    (_view: unknown, event: ClipboardEvent): boolean => {
      const items = event.clipboardData?.items
      if (!items) return false

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (!file || !editorRef.current) return false

          event.preventDefault()
          handlePastedImage(file)
          return true
        }
      }
      return false
    },
    [handlePastedImage]
  )

  const editor = useEditor({
    editable: !disabled,
    extensions,
    content: value ?? '',
    parseOptions: { preserveWhitespace: 'full' },
    immediatelyRender: false,
    onCreate: ({ editor: instance }) => {
      const storage = getMarkdownStorage(instance)
      lastMarkdown.current = storage?.getMarkdown() ?? ''
      // Initialize tracked images
      previousImagesRef.current = new Set(extractImageUrls(instance))
      editorRef.current = instance
    },
    onUpdate: ({ editor: instance }) => {
      const storage = getMarkdownStorage(instance)
      const markdown = storage?.getMarkdown() ?? ''

      // Check for removed images and delete them from storage
      const currentImages = new Set(extractImageUrls(instance))
      const previousImages = previousImagesRef.current

      for (const url of previousImages) {
        if (!currentImages.has(url)) {
          deleteImageFromStorage(url)
        }
      }
      previousImagesRef.current = currentImages

      if (markdown === lastMarkdown.current) {
        return
      }
      lastMarkdown.current = markdown
      onChangeAction(markdown)
    },
    editorProps: {
      attributes: {
        class: clsx(
          'bg-background',
          'focus:outline-none',
          'h-full',
          'max-w-none',
          'min-h-full',
          'px-3',
          'py-2',
          'selection:bg-primary/20',
          'selection:text-foreground',
          'text-justify',
          'w-full',
          'markdown-editor__content',
          disabled && ['pointer-events-none', 'opacity-75']
        ),
      },
      handlePaste: (view, event) => handlePaste(view, event),
    },
  })

  useEditorValueSync({ disabled, editor, lastMarkdown, value })
  const selectionEmpty = useEditorSelectionEmpty(editor)

  const setHeading = (level: 1 | 2 | 3 | 4 | 5 | 6) => {
    if (!editor) {
      return
    }
    const chain = editor.chain().focus()
    if (editor.isActive('heading', { level })) {
      chain.setParagraph().run()
    } else {
      chain.toggleHeading({ level }).run()
    }
  }

  const promptForLink = () => {
    if (!editor || editor.state.selection.empty) {
      return
    }
    const previous = editor.getAttributes('link').href
    const url = window.prompt('Enter URL', previous ?? 'https://')
    if (url === null) {
      return
    }
    if (url === '') {
      editor.chain().focus().unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const handleImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file || !editor) {
        return
      }

      setIsUploading(true)
      try {
        const url = await uploadImage(file)
        if (url) {
          editor.chain().focus().setImage({ src: url, alt: file.name }).run()
        }
      } catch (error) {
        console.error('Image upload failed:', error)
        window.alert(error instanceof Error ? error.message : 'Failed to upload image')
      } finally {
        setIsUploading(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    },
    [editor, uploadImage]
  )

  const triggerImageUpload = () => {
    fileInputRef.current?.click()
  }

  if (!editor) {
    return (
      <div className={clsx('rounded-md border bg-muted/50 p-4 text-muted-foreground text-sm', className)}>
        Loading editor…
      </div>
    )
  }

  const hasSelection = !selectionEmpty
  const controlsDisabled = disabled || !editor.isEditable

  return (
    <div
      className={clsx('flex resize-y flex-col overflow-hidden rounded-md border', className)}
      style={{ minHeight: `${height}px`, height: `${height}px` }}
    >
      <MarkdownEditorToolbar
        controlsDisabled={controlsDisabled}
        editor={editor}
        hasSelection={hasSelection}
        isUploading={isUploading}
        onHeadingChange={setHeading}
        onImageUpload={triggerImageUpload}
        onLinkInsert={promptForLink}
      />
      <input
        ref={fileInputRef}
        type='file'
        accept='image/jpeg,image/png,image/gif,image/webp'
        onChange={handleImageUpload}
        className='hidden'
      />

      <div className='flex-1 overflow-y-auto'>
        <EditorContent id={id} editor={editor} onBlur={onBlurAction} className='h-full text-justify' />
      </div>
    </div>
  )
}
