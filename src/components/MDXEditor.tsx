import { useState, useRef } from 'react'
import type { Editor } from '@tiptap/core'
import { NotionEditor } from './NotionEditor'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Moon, Sun, Copy, Check } from 'lucide-react'
import { FaGithub } from 'react-icons/fa'

interface MDXEditorProps {
  content: string
  onContentChange: (content: string) => void
  saveStatus: 'saved' | 'saving' | 'idle'
  noteTitle?: string
  onRenameNote?: (title: string) => void
  onNotify?: (message: string, type?: 'success' | 'error') => void
}

export function MDXEditor({ content, onContentChange, saveStatus, noteTitle, onRenameNote, onNotify }: MDXEditorProps) {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [copied, setCopied] = useState(false)
  const editorRef = useRef<Editor | null>(null)

  // Title state
  const [titleValue, setTitleValue] = useState(noteTitle || '')
  const [prevNoteTitle, setPrevNoteTitle] = useState(noteTitle)

  if (prevNoteTitle !== noteTitle) {
    setPrevNoteTitle(noteTitle)
    setTitleValue(noteTitle || '')
  }

  const commitTitle = () => {
    if (titleValue.trim() && titleValue.trim() !== noteTitle) {
      onRenameNote?.(titleValue.trim())
    }
  }

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle('dark')
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      onNotify?.('Copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      onNotify?.('Failed to copy content', 'error')
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Subtle utility buttons - top right */}
      <div className="absolute top-3 right-4 flex items-center gap-0.5 z-10">
        {saveStatus === 'saving' && (
          <span className="text-[11px] text-muted-foreground/60 flex items-center gap-1.5 mr-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500/80 animate-pulse" />
            Saving
          </span>
        )}
        {saveStatus === 'saved' && (
          <span className="text-[11px] text-muted-foreground/60 flex items-center gap-1.5 mr-1 transition-opacity duration-300">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500/80" />
            Saved
          </span>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={copyToClipboard}
              aria-label="Copy content"
              className="h-7 w-7 text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {copied ? 'Copied!' : 'Copy markdown'}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open('https://github.com/nnayz/mdx-editor', '_blank')}
              aria-label="View on GitHub"
              className="h-7 w-7 text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50"
            >
              <FaGithub className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            View on GitHub
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="h-7 w-7 text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50"
            >
              {isDarkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {isDarkMode ? 'Light mode' : 'Dark mode'}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[720px] mx-auto px-12 pt-10 pb-32">
          {/* Notion-style large title */}
          <input
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                editorRef.current?.commands.focus('start')
              }
            }}
            placeholder="Untitled"
            spellCheck={false}
            className="w-full text-[40px] font-bold bg-transparent outline-none placeholder:text-muted-foreground/25 leading-tight mb-1 tracking-tight"
          />

          {/* Tiptap Editor */}
          <NotionEditor
            content={content}
            onContentChange={onContentChange}
            editorRef={editorRef}
          />
        </div>
      </div>
    </div>
  )
}
