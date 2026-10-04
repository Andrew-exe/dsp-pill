"use client";

import { useId, useState, type DragEvent } from "react";

export interface PdfDropzoneProps {
  busy: boolean;
  onFile(file: File): void;
}

/** A sheet-of-paper drop target; the real file input stays keyboard reachable. */
export function PdfDropzone({ busy, onFile }: PdfDropzoneProps) {
  const inputId = useId();
  const hintId = useId();
  const [dragging, setDragging] = useState(false);

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && !busy) onFile(file);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={
        "flex flex-col justify-between rounded-sm border bg-white/80 p-6 sm:p-7 shadow-[0_1px_0_#e5dcc6,0_18px_40px_-24px_rgba(15,76,74,0.45)] transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-amber " +
        (dragging ? "border-teal bg-teal-soft/60" : "border-ink/10")
      }
    >
      <div>
        <p className="font-display text-2xl text-teal">Upload a lab report</p>
        <p id={hintId} className="mt-1 text-ink-muted">
          Text PDF, read only in this browser.
        </p>
      </div>
      {/* Ruled lines evoke a printed lab report. */}
      <div aria-hidden className="my-6 space-y-3 opacity-70">
        {[78, 64, 70, 58].map((w, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="h-1.5 rounded-full bg-ink/10" style={{ width: `${w * 0.45}%` }} />
            <span className="h-1.5 w-10 rounded-full bg-teal/20" />
            <span className="ml-auto h-1.5 w-16 rounded-full bg-ink/10" />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label
          htmlFor={inputId}
          className={
            "cursor-pointer rounded-full bg-teal px-6 py-3 font-semibold text-ivory transition-colors hover:bg-teal/90 " +
            (busy ? "pointer-events-none opacity-60" : "")
          }
        >
          {busy ? "Reading your report…" : "Choose a PDF"}
        </label>
        <span className="text-sm text-ink-muted">or drag it onto this page</span>
        <input
          id={inputId}
          type="file"
          accept="application/pdf"
          aria-label="Upload a lab report PDF"
          aria-describedby={hintId}
          disabled={busy}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onFile(file);
          }}
        />
      </div>
    </div>
  );
}
