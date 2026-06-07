'use client'

import { useEffect, useState, useRef } from 'react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxWords?: number
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter your text here...',
  maxWords = 300,
}: RichTextEditorProps) {
  const [wordCount, setWordCount] = useState(0)
  const editorRef = useRef<HTMLDivElement>(null)

  const countWords = (text: string) => {
    // Remove HTML tags and count words
    const plainText = text.replace(/<[^>]*>/g, ' ').trim()
    const words = plainText.split(/\s+/).filter((word) => word.length > 0)
    return words.length
  }

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML
      const words = countWords(html)
      setWordCount(words)
      onChange(html)
    }
  }

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value
      setWordCount(countWords(value))
    }
  }, [value])

  useEffect(() => {
    if (value) {
      setWordCount(countWords(value))
    }
  }, [value])

  return (
    <div>
      {/* Toolbar */}
      <div className="flex gap-1 p-2 border border-gray-300 rounded-t-lg bg-gray-50 flex-wrap">
        <button
          type="button"
          onClick={() => execCommand('bold')}
          className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-200 font-bold"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => execCommand('italic')}
          className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-200 italic"
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => execCommand('underline')}
          className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-200 underline"
          title="Underline"
        >
          U
        </button>
        <div className="w-px bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => execCommand('insertUnorderedList')}
          className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-200"
          title="Bullet List"
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => execCommand('insertOrderedList')}
          className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-200"
          title="Numbered List"
        >
          1. List
        </button>
        <div className="w-px bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => execCommand('formatBlock', 'p')}
          className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-200 text-sm"
          title="Paragraph"
        >
          P
        </button>
        <button
          type="button"
          onClick={() => execCommand('formatBlock', 'h3')}
          className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-200 text-sm font-semibold"
          title="Heading"
        >
          H
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="min-h-[200px] p-4 border border-t-0 border-gray-300 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        style={{
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word'
        }}
        data-placeholder={placeholder}
      />

      {/* Word Count */}
      <div className="mt-2 flex justify-between items-center text-sm">
        <span className={wordCount > maxWords ? 'text-accent-red font-semibold' : 'text-gray-500'}>
          Word count: {wordCount} / {maxWords}
        </span>
        {wordCount > maxWords && (
          <span className="text-accent-red">Exceeded maximum word count!</span>
        )}
      </div>

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        [contenteditable]:focus:before {
          content: '';
        }
      `}</style>
    </div>
  )
}
