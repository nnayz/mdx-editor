import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import type { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import Typography from '@tiptap/extension-typography'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { Markdown } from 'tiptap-markdown'
import { createLowlight, common } from 'lowlight'
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Highlighter, Link as LinkIcon,
  Type, Heading1, Heading2, Heading3,
  List, ListOrdered, ListTodo, Code2, Quote, Minus,
} from 'lucide-react'

const lowlight = createLowlight(common)

interface SlashMenuItem {
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  keywords: string[]
  command: string
}

const SLASH_COMMANDS: SlashMenuItem[] = [
  { label: 'Text', description: 'Plain text', icon: Type, keywords: ['text', 'paragraph', 'p'], command: 'paragraph' },
  { label: 'Heading 1', description: 'Large heading', icon: Heading1, keywords: ['heading', 'h1', 'title'], command: 'h1' },
  { label: 'Heading 2', description: 'Medium heading', icon: Heading2, keywords: ['heading', 'h2', 'subtitle'], command: 'h2' },
  { label: 'Heading 3', description: 'Small heading', icon: Heading3, keywords: ['heading', 'h3'], command: 'h3' },
  { label: 'Bullet List', description: 'Unordered list', icon: List, keywords: ['bullet', 'list', 'unordered', 'ul'], command: 'bulletList' },
  { label: 'Numbered List', description: 'Ordered list', icon: ListOrdered, keywords: ['numbered', 'list', 'ordered', 'ol'], command: 'orderedList' },
  { label: 'Task List', description: 'Checklist with checkboxes', icon: ListTodo, keywords: ['task', 'todo', 'checklist', 'checkbox'], command: 'taskList' },
  { label: 'Code Block', description: 'Code snippet', icon: Code2, keywords: ['code', 'block', 'snippet', 'pre'], command: 'codeBlock' },
  { label: 'Quote', description: 'Blockquote', icon: Quote, keywords: ['quote', 'blockquote'], command: 'blockquote' },
  { label: 'Divider', description: 'Horizontal rule', icon: Minus, keywords: ['divider', 'hr', 'line', 'separator'], command: 'horizontalRule' },
]

function executeSlashCommand(editor: Editor, command: string, range: { from: number; to: number }) {
  const chain = editor.chain().focus().deleteRange(range)
  switch (command) {
    case 'paragraph': chain.setParagraph().run(); break
    case 'h1': chain.setHeading({ level: 1 }).run(); break
    case 'h2': chain.setHeading({ level: 2 }).run(); break
    case 'h3': chain.setHeading({ level: 3 }).run(); break
    case 'bulletList': chain.toggleBulletList().run(); break
    case 'orderedList': chain.toggleOrderedList().run(); break
    case 'taskList': chain.toggleTaskList().run(); break
    case 'codeBlock': chain.toggleCodeBlock().run(); break
    case 'blockquote': chain.toggleBlockquote().run(); break
    case 'horizontalRule': chain.setHorizontalRule().run(); break
  }
}

interface MarkdownStorage {
  getMarkdown(): string
}

interface NotionEditorProps {
  content: string
  onContentChange: (markdown: string) => void
  editorRef?: React.MutableRefObject<Editor | null>
}

export function NotionEditor({ content, onContentChange, editorRef }: NotionEditorProps) {
  const [slashMenu, setSlashMenu] = useState<{
    position: { top: number; left: number }
    query: string
    selectedIndex: number
    range: { from: number; to: number }
  } | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const slashMenuElRef = useRef<HTMLDivElement>(null)
  const lastContentRef = useRef(content)

  const getFilteredCommands = useCallback((query: string) => {
    if (!query) return SLASH_COMMANDS
    const q = query.toLowerCase()
    return SLASH_COMMANDS.filter(cmd =>
      cmd.label.toLowerCase().includes(q) ||
      cmd.keywords.some(k => k.includes(q))
    )
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
      Placeholder.configure({ placeholder: "Press '/' for commands..." }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline underline-offset-4 hover:text-primary/80 transition-colors cursor-pointer',
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Underline,
      Highlight,
      Typography,
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'notion-editor outline-none min-h-[300px]',
      },
    },
    onUpdate: ({ editor }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const md = ((editor.storage as any).markdown as MarkdownStorage).getMarkdown()
      lastContentRef.current = md
      onContentChange(md)

      // Slash command detection
      const { $from, empty } = editor.state.selection
      if (!empty) { setSlashMenu(null); return }

      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset)
      const slashMatch = textBefore.match(/\/(\w*)$/)

      if (slashMatch && $from.parent.type.name === 'paragraph') {
        const from = $from.pos - slashMatch[0].length
        const to = $from.pos
        const coords = editor.view.coordsAtPos(from)
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          setSlashMenu({
            position: { top: coords.bottom - rect.top + 4, left: coords.left - rect.left },
            query: slashMatch[1],
            selectedIndex: 0,
            range: { from, to },
          })
        }
      } else {
        setSlashMenu(null)
      }
    },
    onCreate: ({ editor }) => {
      if (editorRef) editorRef.current = editor
    },
  })

  // Sync content on note switch
  useEffect(() => {
    if (editor && content !== lastContentRef.current) {
      lastContentRef.current = content
      editor.commands.setContent(content)
    }
  }, [content, editor])

  // Keep editorRef in sync
  useEffect(() => {
    if (editor && editorRef) editorRef.current = editor
  }, [editor, editorRef])

  // Keyboard handling for slash menu - uses document listener so we always have fresh state
  useEffect(() => {
    if (!slashMenu || !editor) return

    const items = getFilteredCommands(slashMenu.query)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setSlashMenu(null)
        return
      }

      if (items.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        setSlashMenu(s => s ? { ...s, selectedIndex: Math.min(s.selectedIndex + 1, items.length - 1) } : s)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        e.stopPropagation()
        setSlashMenu(s => s ? { ...s, selectedIndex: Math.max(s.selectedIndex - 1, 0) } : s)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        const cmd = items[slashMenu.selectedIndex]
        if (cmd) {
          executeSlashCommand(editor, cmd.command, slashMenu.range)
          setSlashMenu(null)
        }
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [slashMenu, editor, getFilteredCommands])

  // Close slash menu on outside click
  useEffect(() => {
    if (!slashMenu) return
    const handle = (e: MouseEvent) => {
      if (slashMenuElRef.current && !slashMenuElRef.current.contains(e.target as Node)) {
        setSlashMenu(null)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [slashMenu])

  // Scroll selected slash item into view
  useEffect(() => {
    if (!slashMenu) return
    const el = slashMenuElRef.current?.querySelector('[data-selected="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  }, [slashMenu])

  const filteredCommands = slashMenu ? getFilteredCommands(slashMenu.query) : []

  if (!editor) return null

  return (
    <div ref={containerRef} className="relative">
      {/* Bubble Menu - appears on text selection */}
      <BubbleMenu
        editor={editor}
        shouldShow={({ editor: ed, from, to }) => {
          if (ed.isActive('codeBlock')) return false
          return from !== to
        }}
        options={{ placement: 'top' }}
      >
        <div className="flex items-center gap-0.5 bg-popover border border-border rounded-lg px-1 py-1 shadow-lg">
          <BubbleBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
            <Bold className="h-3.5 w-3.5" />
          </BubbleBtn>
          <BubbleBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
            <Italic className="h-3.5 w-3.5" />
          </BubbleBtn>
          <BubbleBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
            <UnderlineIcon className="h-3.5 w-3.5" />
          </BubbleBtn>
          <BubbleBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
            <Strikethrough className="h-3.5 w-3.5" />
          </BubbleBtn>
          <div className="w-px h-4 bg-border mx-0.5" />
          <BubbleBtn active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} title="Code">
            <Code className="h-3.5 w-3.5" />
          </BubbleBtn>
          <BubbleBtn active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Highlight">
            <Highlighter className="h-3.5 w-3.5" />
          </BubbleBtn>
          <div className="w-px h-4 bg-border mx-0.5" />
          <BubbleBtn
            active={editor.isActive('link')}
            onClick={() => {
              if (editor.isActive('link')) {
                editor.chain().focus().unsetLink().run()
              } else {
                const url = window.prompt('Enter URL:')
                if (url) editor.chain().focus().setLink({ href: url }).run()
              }
            }}
            title="Link"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </BubbleBtn>
        </div>
      </BubbleMenu>

      {/* Slash Command Menu */}
      <AnimatePresence>
        {slashMenu && filteredCommands.length > 0 && (
          <motion.div
            ref={slashMenuElRef}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            onMouseDown={(e) => e.preventDefault()}
            className="absolute z-50 bg-popover border border-border rounded-lg shadow-lg py-1 w-[220px] max-h-[280px] overflow-y-auto"
            style={{ top: slashMenu.position.top, left: slashMenu.position.left }}
          >
            {filteredCommands.map((cmd, i) => (
              <button
                key={cmd.label}
                data-selected={i === slashMenu.selectedIndex}
                onClick={() => {
                  if (editor) {
                    executeSlashCommand(editor, cmd.command, slashMenu.range)
                    setSlashMenu(null)
                  }
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors duration-100 ${
                  i === slashMenu.selectedIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'text-foreground hover:bg-accent/50'
                }`}
              >
                <div className="h-8 w-8 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
                  <cmd.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium">{cmd.label}</div>
                  <div className="text-[11px] text-muted-foreground">{cmd.description}</div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  )
}

function BubbleBtn({ active, onClick, title, children }: {
  active: boolean; onClick: () => void; title: string; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-colors duration-100 ${
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}
