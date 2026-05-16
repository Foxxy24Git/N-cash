'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  className?: string
}

export function Combobox({ value, onChange, options, placeholder, className }: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered =
    value.trim() === ''
      ? options
      : options.filter((o) => o.toLowerCase().includes(value.toLowerCase()))

  useEffect(() => {
    if (!open) return
    function handleMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-1 z-50 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md p-1">
          {filtered.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                className={cn(
                  'w-full text-left px-3 py-1.5 text-sm rounded hover:bg-accent hover:text-accent-foreground',
                  value === opt && 'bg-accent text-accent-foreground font-medium',
                )}
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange(opt)
                  setOpen(false)
                }}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
