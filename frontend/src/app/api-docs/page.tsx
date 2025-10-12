'use client';

import { useState, useEffect } from 'react';

export default function ApiDocsPage() {
  const [docsContent, setDocsContent] = useState('');

  useEffect(() => {
    fetch('/API_DOCS.md')
      .then(response => response.text())
      .then(text => {
        // Simple markdown to HTML conversion for display
        const html = text
          .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mb-6">$1</h1>')
          .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4">$1</h2>')
          .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-6 mb-3">$1</h3>')
          .replace(/^\*\*([^*]+)\*\*:/gim, '<strong>$1</strong>:')
          .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/gim, '<em>$1</em>')
          .replace(/`(.*?)`/gim, '<code class="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm">$1</code>')
          // Modified to work without the 's' flag by using [\s\S]* instead of .* to match any character including newlines
          .replace(/```([\s\S]*?)```/gim, '<pre class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto my-4"><code>$1</code></pre>')
          .replace(/\n/g, '<br />');
        
        setDocsContent(html);
      })
      .catch(error => {
        console.error('Error loading API docs:', error);
        setDocsContent('<p class="text-red-500">Error loading documentation.</p>');
      });
  }, []);

  return (
    <main className="min-h-screen p-2 sm:p-4 md:p-8 bg-background-light dark:bg-background-dark">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-2 sm:gap-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">API Documentation</h1>
          <a 
            href="/API_DOCS.md" 
            target="_blank"
            className="px-3 py-1 sm:px-4 sm:py-2 bg-primary text-white rounded-md hover:bg-primary/80 transition-colors text-sm sm:text-base"
          >
            View Raw Markdown
          </a>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 md:p-8">
          <div 
            className="prose prose-lg dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: docsContent }}
          />
        </div>
      </div>
    </main>
  );
}