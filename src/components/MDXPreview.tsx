import { useEffect, useState, useMemo } from 'react';
import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import { Card } from '@/components/ui/card';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
      <div className="absolute top-2 right-3 text-xs text-muted-foreground/60 font-mono">
        {match[1]}
      </div>
      <SyntaxHighlighter
        style={isDarkMode ? vscDarkPlus : prism}
        language={match[1]}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: '1.25rem',
          paddingTop: '2rem',
          background: isDarkMode ? 'oklch(0.09 0 0)' : 'oklch(0.98 0 0)',
          fontSize: '0.875rem',
          lineHeight: '1.6',
          borderRadius: '0.5rem',
          border: isDarkMode ? '1px solid oklch(0.18 0 0)' : '1px solid oklch(0.90 0 0)',
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
      }
    };

    compileMDX();
  }, [content]);

  const previewContent = useMemo(() => {
    if (error) {
      return (
        <Card className="p-6 border-red-500 bg-red-50 dark:bg-red-950">
          <h3 className="text-red-700 dark:text-red-300 font-semibold mb-2">
            Compilation Error
          </h3>
          <pre className="text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap font-mono">
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
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium">Start writing MDX</h3>
            <p className="mt-1 text-sm">Your rendered content will appear here</p>
          </div>
        </div>
      );
    }

    return (
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <MDXContent components={components} />
      </div>
    );
  }, [MDXContent, error, components]);

  return (
    <div className="h-full overflow-auto p-6">
      {previewContent}
    </div>
  );
}
