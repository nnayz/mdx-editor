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
import defaultMdx from '../sample.mdx?raw';

export function MDXEditor() {
  const [mdxContent, setMdxContent] = useState(defaultMdx);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleEditorChange = (value: string | undefined) => {
    setMdxContent(value || '');
  };

  const handleEditorDidMount = (_editor: unknown, monaco: typeof import('monaco-editor')) => {
    // Define custom dark theme with matching background
    monaco.editor.defineTheme('custom-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0f0f0f', // Slightly darker than default
        'editor.lineHighlightBackground': '#1a1a1a',
        'editorLineNumber.foreground': '#3b3b3b',
        'editorLineNumber.activeForeground': '#5b5b5b',
        'editor.selectionBackground': '#2563eb40',
        'editor.inactiveSelectionBackground': '#2563eb20',
      },
    });

    // Define custom light theme with matching background
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
    // Update Monaco theme when dark mode changes
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
      await navigator.clipboard.writeText(mdxContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center p-8">
      <div className="h-full w-full max-w-[calc(100vw-4rem)] max-h-[calc(100vh-4rem)] flex flex-col bg-background rounded-2xl overflow-hidden shadow-2xl border border-border/20">
        {/* Header */}
        <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm px-6 py-3.5 flex items-center justify-between flex-shrink-0">
          <h1 className="text-lg font-semibold tracking-tight">MDX Editor</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={copyToClipboard}
              aria-label="Copy content"
              className="hover:bg-muted"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open('https://github.com/nnayz/mdx-editor', '_blank')}
              aria-label="View on GitHub"
              className="hover:bg-muted"
            >
              <FaGithub className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="hover:bg-muted"
            >
              {isDarkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
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
          <div className="h-full flex flex-col border-r border-border">
            <div className="px-4 py-2 border-b border-border/50 bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Editor
            </div>
            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%"
                defaultLanguage="markdown"
                value={mdxContent}
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
                  lineDecorationsWidth: 10,
                  roundedSelection: true,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 20, bottom: 20 },
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
                    verticalScrollbarSize: 10,
                    horizontalScrollbarSize: 10,
                  },
                }}
              />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col bg-background border-l border-border">
            <div className="px-4 py-2 border-b border-border/50 bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Preview
            </div>
            <div className="flex-1 overflow-hidden">
              <MDXPreview content={mdxContent} isDarkMode={isDarkMode} />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      </div>
    </div>
  );
}
