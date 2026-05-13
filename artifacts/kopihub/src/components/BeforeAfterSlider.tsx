import { useRef, useState } from "react";

type Props = {
  beforeUrl: string;
  afterUrl: string;
  className?: string;
  beforeLabel?: string;
  afterLabel?: string;
};

export function BeforeAfterSlider({ beforeUrl, afterUrl, className, beforeLabel = "Sebelum", afterLabel = "Sesudah" }: Props) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  function move(clientX: number) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const p = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, p)));
  }

  return (
    <div
      ref={ref}
      className={`relative w-full overflow-hidden rounded-xl border border-border bg-muted select-none ${className ?? "aspect-video"}`}
      onMouseMove={e => dragging.current && move(e.clientX)}
      onMouseUp={() => (dragging.current = false)}
      onMouseLeave={() => (dragging.current = false)}
      onTouchMove={e => move(e.touches[0].clientX)}
    >
      <img src={afterUrl} alt={afterLabel} className="absolute inset-0 h-full w-full object-cover pointer-events-none" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ width: `${pos}%` }}>
        <img src={beforeUrl} alt={beforeLabel} className="h-full object-cover" style={{ width: `${100 / (pos / 100)}%`, maxWidth: "none" }} />
      </div>
      <span className="absolute top-2 left-2 rounded-full bg-black/60 text-white px-2 py-0.5 text-[10px] font-medium">{beforeLabel}</span>
      <span className="absolute top-2 right-2 rounded-full bg-white/90 text-foreground px-2 py-0.5 text-[10px] font-medium">{afterLabel}</span>
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg cursor-ew-resize"
        style={{ left: `calc(${pos}% - 1px)` }}
        onMouseDown={e => { e.preventDefault(); dragging.current = true; }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white shadow-lg flex items-center justify-center text-xs font-bold text-foreground">⇆</div>
      </div>
    </div>
  );
}
