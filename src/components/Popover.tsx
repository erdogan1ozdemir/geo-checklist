import { ReactNode, RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  anchorRef: RefObject<HTMLElement>;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  minWidth?: number;
  align?: 'left' | 'right';
}

/**
 * Theme-matched popover rendered in a portal at document.body so it escapes the
 * table's overflow clipping. Anchored under the trigger, flips up when there's no
 * room below, and re-anchors on scroll/resize.
 */
export function Popover({ anchorRef, open, onClose, children, minWidth = 200, align = 'left' }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    const compute = () => {
      const a = anchorRef.current;
      const p = panelRef.current;
      if (!a) return;
      const r = a.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.max(r.width, minWidth);
      let left = align === 'right' ? r.right - w : r.left;
      left = Math.max(8, Math.min(left, vw - w - 8));
      const h = p?.offsetHeight ?? 0;
      let top = r.bottom + 5;
      if (h && top + h > vh - 8) top = Math.max(8, r.top - h - 5);
      setPos({ top, left, width: w });
    };
    compute();
    const raf = requestAnimationFrame(compute);
    const onScroll = () => compute();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, anchorRef, minWidth, align]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(t) && !anchorRef.current?.contains(t)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown, true);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;
  return createPortal(
    <div
      ref={panelRef}
      className="pop"
      style={{
        position: 'fixed',
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width: pos?.width,
        visibility: pos ? 'visible' : 'hidden',
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
