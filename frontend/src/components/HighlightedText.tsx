'use client';

import React from 'react';

interface HighlightedTextProps {
  text: string;
  searchQuery: string;
  className?: string;
}

export default function HighlightedText({ text, searchQuery, className = '' }: HighlightedTextProps) {
  if (!searchQuery.trim()) {
    return <span className={className}>{text}</span>;
  }

  const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) => 
        regex.test(part) ? (
          <mark 
            key={index} 
            className="bg-yellow-200 text-yellow-900 px-1 rounded font-medium animate-pulse"
            style={{ animationDuration: '2s' }}
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
} 