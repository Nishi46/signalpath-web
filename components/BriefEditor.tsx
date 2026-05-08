'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
} from 'lucide-react'

interface Props {
  initialContent: string
  onChange: (markdown: string) => void
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type='button'
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        active
          ? 'bg-blue-500/15 text-blue-400'
          : 'text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/70 hover:bg-gray-100 dark:hover:bg-white/[0.06]'
      }`}
    >
      {children}
    </button>
  )
}

export function BriefEditor({ initialContent, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { languageClassPrefix: 'language-' },
      }),
      Markdown.configure({
        html: false,
        tightLists: true,
        bulletListMarker: '-',
        transformCopiedText: true,
        transformPastedText: true,
      }),
    ],
    content: initialContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[480px] px-1 prose-editor',
      },
    },
    onUpdate({ editor }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const md = (editor.storage as any).markdown?.getMarkdown?.() ?? ''
      onChange(md)
    },
  })

  if (!editor) return null

  return (
    <div className='border border-gray-200 dark:border-white/[0.10] rounded-xl overflow-hidden bg-white dark:bg-[#111318]'>
      {/* Toolbar */}
      <div className='flex items-center gap-0.5 px-3 py-2 border-b border-gray-100 dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.02] flex-wrap'>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title='Bold'
        >
          <Bold className='w-3.5 h-3.5' />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title='Italic'
        >
          <Italic className='w-3.5 h-3.5' />
        </ToolbarButton>

        <div className='w-px h-4 bg-gray-200 dark:bg-white/[0.08] mx-1' />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title='Heading'
        >
          <Heading2 className='w-3.5 h-3.5' />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title='Sub-heading'
        >
          <Heading3 className='w-3.5 h-3.5' />
        </ToolbarButton>

        <div className='w-px h-4 bg-gray-200 dark:bg-white/[0.08] mx-1' />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title='Bullet list'
        >
          <List className='w-3.5 h-3.5' />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title='Numbered list'
        >
          <ListOrdered className='w-3.5 h-3.5' />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title='Quote'
        >
          <Quote className='w-3.5 h-3.5' />
        </ToolbarButton>

        <div className='w-px h-4 bg-gray-200 dark:bg-white/[0.08] mx-1' />

        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title='Divider'
        >
          <Minus className='w-3.5 h-3.5' />
        </ToolbarButton>
      </div>

      {/* Editor body */}
      <EditorContent
        editor={editor}
        className='px-5 py-4 text-sm text-gray-800 dark:text-white/80 leading-relaxed'
      />
    </div>
  )
}
