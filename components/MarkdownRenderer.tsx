import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  return (
    <div className={`prose prose-slate max-w-none prose-headings:font-semibold prose-a:text-blue-600 ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4 mt-6 text-slate-900 border-b pb-2" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-xl font-semibold mb-3 mt-5 text-slate-800" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-lg font-medium mb-2 mt-4 text-slate-800" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc list-outside ml-6 mb-4 space-y-1" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-6 mb-4 space-y-1" {...props} />,
          li: ({node, ...props}) => <li className="text-slate-700" {...props} />,
          p: ({node, ...props}) => <p className="mb-4 text-slate-700 leading-relaxed" {...props} />,
          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-slate-300 pl-4 italic my-4 text-slate-600" {...props} />,
          strong: ({node, ...props}) => <strong className="font-semibold text-slate-900" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;