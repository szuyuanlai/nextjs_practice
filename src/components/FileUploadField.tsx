"use client";

import { useEffect, useMemo, useRef } from "react";
import { ImageIcon, RefreshCw, UploadCloud, X } from "lucide-react";

type Props = {
  id: string;
  accept?: string;
  multiple?: boolean;
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
  buttonText?: string;
  emptyText?: string;
  className?: string;
  showPreview?: boolean;
};

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileUploadField({
  id,
  accept,
  multiple = false,
  files,
  onFilesChange,
  disabled = false,
  buttonText = "選擇檔案",
  emptyText = "未選擇任何檔案",
  className,
  showPreview = true,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const previews = useMemo(() => {
    if (!showPreview) return [];
    return files
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
      }));
  }, [files, showPreview]);

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previews]);

  const chooseFiles = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFilesChange(Array.from(event.target.files ?? []));
  };

  const handleRemoveAll = () => {
    onFilesChange([]);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleRemoveSingle = (indexToRemove: number) => {
    const nextFiles = files.filter((_, index) => index !== indexToRemove);
    onFilesChange(nextFiles);
    if (!nextFiles.length && inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className={className}>
      <input
        id={id}
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={chooseFiles}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          <UploadCloud className="h-4 w-4" />
          {buttonText}
        </button>

        {files.length > 0 ? (
          <>
            <button
              type="button"
              onClick={chooseFiles}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              重新選擇
            </button>
            <button
              type="button"
              onClick={handleRemoveAll}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X className="h-3.5 w-3.5" />
              移除檔案
            </button>
          </>
        ) : null}
      </div>

      {files.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{emptyText}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {files.map((file, index) => (
            <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-700">{file.name}</p>
                <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
              </div>
              {multiple ? (
                <button
                  type="button"
                  onClick={() => handleRemoveSingle(index)}
                  disabled={disabled}
                  className="ml-3 inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  移除
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {showPreview && previews.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {previews.map((preview, index) => (
            <div key={`${preview.name}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <img src={preview.url} alt={`預覽 ${index + 1}`} className="h-24 w-full object-cover" />
              <div className="flex items-center gap-1 px-2 py-1.5 text-[11px] text-slate-600">
                <ImageIcon className="h-3.5 w-3.5" />
                <span className="truncate">圖片預覽</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
