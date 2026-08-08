"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { ClinicLogoMark, type LogoShape } from "@/components/ClinicLogoMark";
import { removeOrgLogoAction, saveOrgLogoAction } from "@/app/actions";

const VIEW = 280;
const OUT = 256;

type Labels = {
  title: string;
  hint: string;
  choose: string;
  zoom: string;
  shape: string;
  shapeRound: string;
  shapeSquare: string;
  previewRound: string;
  previewSquare: string;
  save: string;
  remove: string;
  saving: string;
  dragHint: string;
};

export function ClinicLogoEditor({
  initialUrl,
  initialShape,
  labels,
}: {
  initialUrl?: string | null;
  initialShape?: LogoShape | null;
  labels: Labels;
}) {
  const [shape, setShape] = useState<LogoShape>(
    initialShape === "square" ? "square" : "round"
  );
  const [savedUrl, setSavedUrl] = useState(initialUrl || "");
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null
  );
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync prop → local state during render when the parent loads a new logo.
  const [prevUrl, setPrevUrl] = useState(initialUrl);
  if (initialUrl !== prevUrl) {
    setPrevUrl(initialUrl);
    setSavedUrl(initialUrl || "");
  }
  const [prevShape, setPrevShape] = useState(initialShape);
  if (initialShape !== prevShape) {
    setPrevShape(initialShape);
    setShape(initialShape === "square" ? "square" : "round");
  }

  function onPick(file: File | null) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || "");
      const img = new Image();
      img.onload = () => {
        setNatural({ w: img.naturalWidth, h: img.naturalHeight });
        setSrc(url);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  }

  const baseScale =
    natural.w && natural.h ? Math.max(VIEW / natural.w, VIEW / natural.h) : 1;
  const scale = baseScale * zoom;
  const drawW = natural.w * scale;
  const drawH = natural.h * scale;

  const clampOffset = useCallback(
    (x: number, y: number, z = zoom) => {
      const s = baseScale * z;
      const w = natural.w * s;
      const h = natural.h * s;
      const minX = Math.min(0, VIEW - w);
      const minY = Math.min(0, VIEW - h);
      return {
        x: Math.max(minX, Math.min(0, x)),
        y: Math.max(minY, Math.min(0, y)),
      };
    },
    [baseScale, natural.h, natural.w, zoom]
  );

  function onPointerDown(e: React.PointerEvent) {
    if (!src) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const nx = drag.current.ox + (e.clientX - drag.current.x);
    const ny = drag.current.oy + (e.clientY - drag.current.y);
    setOffset(clampOffset(nx, ny));
  }

  function onPointerUp() {
    drag.current = null;
  }

  function exportDataUrl(): Promise<string | null> {
    return new Promise((resolve) => {
      if (!src || !natural.w) {
        resolve(null);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = OUT;
        canvas.height = OUT;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, OUT, OUT);
        const ratio = OUT / VIEW;
        ctx.drawImage(
          img,
          offset.x * ratio,
          offset.y * ratio,
          drawW * ratio,
          drawH * ratio
        );
        // JPEG keeps payload small for Server Actions + DB text column.
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("logo_shape", shape);
      if (src) {
        const dataUrl = await exportDataUrl();
        if (!dataUrl) {
          setError("Could not crop image");
          return;
        }
        if (dataUrl.length > 900_000) {
          setError("Logo too large — try a simpler image");
          return;
        }
        fd.set("logo_data_url", dataUrl);
      } else if (!savedUrl) {
        setError("Choose a logo image first");
        return;
      }
      const res = await saveOrgLogoAction(fd);
      if (res && "error" in res && res.error) {
        setError(res.error);
        return;
      }
      if (res && "data" in res && res.data?.logo_url) {
        setSavedUrl(res.data.logo_url);
        setSrc(null);
      } else if (src) {
        setError("Save finished but logo was not stored. Run migration 017 STEP 1 (logo columns).");
        return;
      }
      router.refresh();
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const res = await removeOrgLogoAction();
      if (res && "error" in res && res.error) {
        setError(res.error);
        return;
      }
      setSavedUrl("");
      setSrc(null);
      router.refresh();
    });
  }

  const previewSrc = src || savedUrl || null;

  return (
    <div className="surface" style={{ padding: "1.25rem" }}>
      <h3 style={{ marginTop: 0 }}>{labels.title}</h3>
      <p className="muted" style={{ marginTop: 0 }}>{labels.hint}</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.25rem",
          alignItems: "start",
        }}
      >
        <div className="stack" style={{ gap: "0.75rem" }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => onPick(e.target.files?.[0] || null)}
          />
          <button
            type="button"
            className="btn btn-soft"
            style={{ alignSelf: "flex-start" }}
            onClick={() => fileRef.current?.click()}
          >
            {labels.choose}
          </button>

          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              width: VIEW,
              height: VIEW,
              maxWidth: "100%",
              aspectRatio: "1",
              borderRadius: shape === "round" ? "50%" : 16,
              overflow: "hidden",
              border: "1px solid var(--line)",
              background: "rgba(15, 23, 42, 0.04)",
              position: "relative",
              cursor: src ? "grab" : "default",
              touchAction: "none",
              userSelect: "none",
            }}
          >
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt=""
                draggable={false}
                style={{
                  position: "absolute",
                  left: offset.x,
                  top: offset.y,
                  width: drawW,
                  height: drawH,
                  maxWidth: "none",
                  pointerEvents: "none",
                }}
              />
            ) : savedUrl ? (
              <ClinicLogoMark url={savedUrl} shape={shape} size={VIEW} alt="Current logo" style={{ border: "none", borderRadius: shape === "round" ? "50%" : 16 }} />
            ) : (
              <div
                className="muted"
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  placeItems: "center",
                  fontSize: "0.85rem",
                  padding: 16,
                  textAlign: "center",
                }}
              >
                {labels.dragHint}
              </div>
            )}
          </div>

          {src ? (
            <div className="field">
              <label>{labels.zoom}</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                className="input"
                onChange={(e) => {
                  const z = Number(e.target.value);
                  setZoom(z);
                  setOffset((o) => clampOffset(o.x, o.y, z));
                }}
              />
            </div>
          ) : null}

          <div className="field">
            <label>{labels.shape}</label>
            <div className="row" style={{ gap: 8 }}>
              <button
                type="button"
                className={shape === "round" ? "btn btn-primary" : "btn btn-soft"}
                onClick={() => setShape("round")}
              >
                {labels.shapeRound}
              </button>
              <button
                type="button"
                className={shape === "square" ? "btn btn-primary" : "btn btn-soft"}
                onClick={() => setShape("square")}
              >
                {labels.shapeSquare}
              </button>
            </div>
          </div>
        </div>

        <div className="stack" style={{ gap: "1rem" }}>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem", marginBottom: 8 }}>
              {labels.previewRound}
            </div>
            <div className="row" style={{ gap: 12, alignItems: "center" }}>
              <PreviewFrame src={previewSrc} shape="round" crop={src ? { offset, drawW, drawH } : null} />
              <span className="muted" style={{ fontSize: "0.9rem" }}>Nav / invoice</span>
            </div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: "0.8rem", marginBottom: 8 }}>
              {labels.previewSquare}
            </div>
            <div className="row" style={{ gap: 12, alignItems: "center" }}>
              <PreviewFrame src={previewSrc} shape="square" crop={src ? { offset, drawW, drawH } : null} />
              <span className="muted" style={{ fontSize: "0.9rem" }}>Nav / invoice</span>
            </div>
          </div>

          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={pending || (!src && !savedUrl)}
              onClick={save}
            >
              {pending ? labels.saving : labels.save}
            </button>
            {savedUrl ? (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={pending}
                onClick={remove}
              >
                {labels.remove}
              </button>
            ) : null}
          </div>
          {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

function PreviewFrame({
  src,
  shape,
  crop,
}: {
  src: string | null;
  shape: LogoShape;
  crop: { offset: { x: number; y: number }; drawW: number; drawH: number } | null;
}) {
  const size = 72;
  if (!src) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: shape === "round" ? "50%" : 12,
          border: "1px dashed var(--line)",
          background: "rgba(15,23,42,0.03)",
        }}
      />
    );
  }

  if (!crop) {
    return <ClinicLogoMark url={src} shape={shape} size={size} />;
  }

  const scale = size / VIEW;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: shape === "round" ? "50%" : 12,
        overflow: "hidden",
        border: "1px solid rgba(28,27,25,0.12)",
        position: "relative",
        background: "#fff",
        flexShrink: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        style={{
          position: "absolute",
          left: crop.offset.x * scale,
          top: crop.offset.y * scale,
          width: crop.drawW * scale,
          height: crop.drawH * scale,
          maxWidth: "none",
        }}
      />
    </div>
  );
}
