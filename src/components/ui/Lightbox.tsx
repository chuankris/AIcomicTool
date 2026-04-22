'use client'
import { useState } from 'react'

interface Props {
  src: string
  alt?: string
  className?: string
  onClick?: (e: React.MouseEvent) => void
}

export function Lightbox({ src, alt = '', className = '', onClick }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`cursor-zoom-in ${className}`}
        onClick={e => { e.stopPropagation(); onClick?.(e); setOpen(true) }}
      />
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <img
            src={src}
            alt={alt}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white text-2xl w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/80 transition-colors"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
        </div>
      )}
    </>
  )
}
