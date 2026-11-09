"use client";
import { useEffect, useRef, type ReactNode } from "react";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
export function Intro({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <div className="k-intro">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
export function Badge({ children }: { children: ReactNode }) {
  return (
    <span
      className={`k-badge k-${String(children).toLowerCase().replaceAll(" ", "-")}`}
    >
      {children}
    </span>
  );
}
export function SearchBox({
  value,
  onChange,
  placeholder = "Cari data...",
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="k-searchbox">
      <Search size={18} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button aria-label="Hapus pencarian" onClick={() => onChange("")}>
          <X size={16} />
        </button>
      )}
    </label>
  );
}
export function Empty({
  title,
  description,
  className = "",
}: {
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div className={`k-empty ${className}`}>
      <span className="k-empty-icon">
        <X size={18} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function Pager({
  page,
  total,
  size = 8,
  onChange,
  noun = "data",
}: {
  page: number;
  total: number;
  size?: number;
  onChange: (n: number) => void;
  noun?: string;
}) {
  return (
    <div className="k-pager">
      <span>
        Menampilkan {total ? (page - 1) * size + 1 : 0}–
        {Math.min(page * size, total)} dari {total} {noun}
      </span>
      <div>
        <button
          className="k-outline"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={14} /> Sebelumnya
        </button>
        <button
          className="k-outline"
          disabled={page * size >= total}
          onClick={() => onChange(page + 1)}
        >
          Berikutnya <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="k-notice" role="status">
      <CheckCircle2 size={18} />
      {children}
    </div>
  );
}
export function Dialog({
  title,
  children,
  onClose,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const el = ref.current;
    el?.querySelector<HTMLElement>("button,input,a")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = el?.querySelectorAll<HTMLElement>(
          "button:not([disabled]),a,input,select",
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div className={`k-backdrop ${className}`} onClick={onClose}>
      <div
        ref={ref}
        className="k-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
