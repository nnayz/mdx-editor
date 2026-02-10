import { useState, useEffect } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import { MDXPreview } from './MDXPreview';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Copy, Check } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';

interface MDXEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  saveStatus: 'saved' | 'saving' | 'idle';
  noteTitle?: string;
}

export function MDXEditor({ content, onContentChange, saveStatus, noteTitle }: MDXEditorProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleEditorChange = (value: string | undefined) => {
    onContentChange(value || '');
  };

  const handleEditorDidMount = (_editor: unknown, monaco: typeof import('monaco-editor')) => {
    monaco.editor.defineTheme('custom-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0f0f0f',
        'editor.lineHighlightBackground': '#1a1a1a',
        'editorLineNumber.foreground': '#3b3b3b',
        'editorLineNumber.activeForeground': '#5b5b5b',
        'editor.selectionBackground': '#2563eb40',
        'editor.inactiveSelectionBackground': '#2563eb20',
      },
    });

    monaco.editor.defineTheme('custom-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#ffffff',
        'editor.lineHighlightBackground': '#f9fafb',
        'editorLineNumber.foreground': '#9ca3af',
        'editorLineNumber.activeForeground': '#6b7280',
      },
    });

    monaco.editor.setTheme(isDarkMode ? 'custom-dark' : 'custom-light');
  };

  useEffect(() => {
    loader.init().then((monaco) => {
      monaco.editor.setTheme(isDarkMode ? 'custom-dark' : 'custom-light');
    });
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-sm px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold tracking-tight">
            {noteTitle || 'MDX Editor'}
          </h1>
          {saveStatus === 'saved' && (
            <span className="text-[11px] text-muted-foreground/80 flex items-center gap-1.5 transition-opacity duration-300">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500/80" />
              Saved
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="text-[11px] text-muted-foreground/80 flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500/80 animate-pulse" />
              Saving
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={copyToClipboard}
            aria-label="Copy content"
            className="h-8 w-8 hover:bg-muted/50 transition-all duration-200"
            title="Copy content"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.open('https://github.com/nnayz/mdx-editor', '_blank')}
            aria-label="View on GitHub"
            className="h-8 w-8 hover:bg-muted/50 transition-all duration-200"
            title="View on GitHub"
          >
            <FaGithub className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="h-8 w-8 hover:bg-muted/50 transition-all duration-200"
            title="Toggle theme"
          >
            {isDarkMode ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </header>

      {/* Editor and Preview */}
      <ResizablePanelGroup
        orientation="horizontal"
        className="flex-1 overflow-hidden"
      >
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col">
            <Editor
              height="100%"
              defaultLanguage="markdown"
              value={content}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              theme={isDarkMode ? 'custom-dark' : 'custom-light'}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                lineNumbersMinChars: 2,
                glyphMargin: false,
                folding: false,
                lineDecorationsWidth: 8,
                roundedSelection: true,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 16, bottom: 16 },
                wordWrap: 'on',
                wrappingStrategy: 'advanced',
                fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Monaco, Consolas, monospace',
                fontLigatures: true,
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                scrollbar: {
                  vertical: 'auto',
                  horizontal: 'auto',
                  verticalScrollbarSize: 8,
                  horizontalScrollbarSize: 8,
                },
              }}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col bg-background">
            <MDXPreview content={content} isDarkMode={isDarkMode} />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
