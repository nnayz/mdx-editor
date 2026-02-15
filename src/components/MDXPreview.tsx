import { useEffect, useState, useMemo } from 'react';
import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import { Card } from '@/components/ui/card';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion, AnimatePresence } from 'motion/react';

interface MDXPreviewProps {
  content: string;
  isDarkMode?: boolean;
}

interface CodeBlockProps {
  className?: string;
  children?: React.ReactNode;
  isDarkMode?: boolean;
  [key: string]: unknown;
}

const CodeBlock = ({ className, children, isDarkMode, ...props }: CodeBlockProps) => {
  const match = /language-(\w+)/.exec(className || '');

  return match ? (
    <div className="relative group">
      <div className="absolute top-1.5 right-2.5 text-[10px] text-muted-foreground/50 font-mono">
        {match[1]}
      </div>
      <SyntaxHighlighter
        style={isDarkMode ? vscDarkPlus : prism}
        language={match[1]}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: '1rem',
          paddingTop: '1.75rem',
          background: isDarkMode ? 'oklch(0.09 0 0)' : 'oklch(0.98 0 0)',
          fontSize: '0.8125rem',
          lineHeight: '1.5',
          borderRadius: '0.375rem',
          border: 'none',
        }}
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  ) : (
    <code className={className} {...props}>
      {children}
    </code>
  );
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export function MDXPreview({ content, isDarkMode = false }: MDXPreviewProps) {
  const [MDXContent, setMDXContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [compiling, setCompiling] = useState(false);

  const components = useMemo(() => ({
    code: (props: CodeBlockProps) => <CodeBlock {...props} isDarkMode={isDarkMode} />,
    pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  }), [isDarkMode]);
/* eslint-enable @typescript-eslint/no-explicit-any */

  useEffect(() => {
    const compileMDX = async () => {
      if (!content.trim()) {
        setMDXContent(null);
        setError(null);
        return;
      }

      setCompiling(true);
      try {
        setError(null);
        const { default: MDXModule } = await evaluate(content, {
          ...runtime,
          development: false,
        });
        setMDXContent(() => MDXModule);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to compile MDX');
        console.error('MDX compilation error:', err);
      } finally {
        setCompiling(false);
      }
    };

    compileMDX();
  }, [content]);

  const previewContent = useMemo(() => {
    if (error) {
      return (
        <Card className="p-4 bg-red-50 dark:bg-red-950/30">
          <h3 className="text-red-700 dark:text-red-300 font-semibold mb-1.5 text-sm">
            Compilation Error
          </h3>
          <pre className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap font-mono">
            {error}
          </pre>
        </Card>
      );
    }

    if (!MDXContent) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <svg
              className="mx-auto h-10 w-10 text-gray-400 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium opacity-70">Start writing MDX</h3>
            <p className="mt-0.5 text-xs opacity-50">Your rendered content will appear here</p>
          </div>
        </div>
      );
    }

    return (
      <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none">
        <MDXContent components={components} />
      </div>
    );
  }, [MDXContent, error, components]);

  return (
    <div className="h-full overflow-auto relative">
      <AnimatePresence>
        {compiling && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-0 right-0 z-10 h-0.5 bg-muted overflow-hidden"
          >
            <motion.div
              className="h-full w-1/3 bg-primary/60 rounded-full"
              animate={{ x: ['-100%', '400%'] }}
              transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="p-4">
        {previewContent}
      </div>
    </div>
  );
}
