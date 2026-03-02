"use client";

import { useCallback, useRef, useState } from "react";

interface FileUploadProps {
  onUpload: (filename: string, content: string) => void;
}

export default function FileUpload({ onUpload }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onUpload(file.name, content);
        setIsProcessing(false);
      };
      reader.onerror = () => setIsProcessing(false);
      setIsProcessing(true);
      reader.readAsText(file);
    },
    [onUpload]
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      Array.from(files).forEach((file) => {
        if (file.name.endsWith(".csv")) processFile(file);
      });
    },
    [processFile]
  );

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
        style={{
          borderColor: isDragging ? "var(--accent-green)" : "var(--border)",
          backgroundColor: isDragging ? "rgba(78, 201, 148, 0.04)" : "transparent",
        }}
        className="relative cursor-pointer rounded-lg border-2 border-dashed p-8 transition-all duration-200 hover:border-[color:var(--accent-blue)]"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          multiple
          onChange={(e) => { handleFiles(e.target.files); if (fileInputRef.current) fileInputRef.current.value = ""; }}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            style={{
              backgroundColor: isDragging ? "rgba(78, 201, 148, 0.1)" : "var(--bg-elevated)",
              color: isDragging ? "var(--accent-green)" : "var(--text-secondary)",
            }}
            className="flex h-12 w-12 items-center justify-center rounded-lg"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div>
            <p style={{ color: "var(--text-primary)" }} className="text-sm font-medium">
              {isDragging ? "Drop CSV files here" : "Drop PokerNow CSV files here"}
            </p>
            <p style={{ color: "var(--text-secondary)" }} className="mt-1 text-xs">
              or click to browse
            </p>
          </div>
          {isProcessing && (
            <div style={{ color: "var(--accent-amber)" }} className="flex items-center gap-2 text-xs">
              <span style={{ borderColor: "var(--accent-amber)" }} className="inline-block h-3 w-3 animate-spin rounded-full border border-t-transparent" />
              Processing...
            </div>
          )}
        </div>
      </div>

      <div style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-surface)" }} className="rounded-md border px-4 py-3">
        <p style={{ color: "var(--text-secondary)" }} className="text-xs leading-relaxed">
          <span style={{ color: "var(--accent-cyan)" }}>Export your hand log from PokerNow:</span>{" "}
          <span style={{ color: "var(--text-primary)" }} className="font-mono">
            Game &rarr; Settings &rarr; Download Hand Log (CSV)
          </span>
        </p>
      </div>
    </div>
  );
}
