"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Check, X, ZoomIn } from "lucide-react";

export type CropKind = "profile" | "background" | "share";

type ImageCropModalProps = {
  imageSrc: string;
  kind: CropKind;
  onCancel: () => void;
  onComplete: (dataUrl: string) => void;
};

type AspectMode = {
  key: string;
  label: string;
  aspect: number;
  outputWidth: number;
  outputHeight: number;
};

const PROFILE_MODES: AspectMode[] = [
  {
    key: "square",
    label: "Square",
    aspect: 1,
    outputWidth: 512,
    outputHeight: 512,
  },
];

const BACKGROUND_MODES: AspectMode[] = [
  {
    key: "banner",
    label: "Banner",
    aspect: 16 / 9,
    outputWidth: 1400,
    outputHeight: 788,
  },
  {
    key: "square",
    label: "Square",
    aspect: 1,
    outputWidth: 1080,
    outputHeight: 1080,
  },
];

const SHARE_MODES: AspectMode[] = [
  {
    key: "square",
    label: "Square",
    aspect: 1,
    outputWidth: 1080,
    outputHeight: 1080,
  },
];

function modesFor(kind: CropKind) {
  if (kind === "profile") return PROFILE_MODES;
  if (kind === "background") return BACKGROUND_MODES;
  return SHARE_MODES;
}

function titleFor(kind: CropKind) {
  if (kind === "profile") return "Crop profile photo";
  if (kind === "background") return "Crop background image";
  return "Crop share image";
}

async function getCroppedDataUrl(
  imageSrc: string,
  crop: Area,
  outputWidth: number,
  outputHeight: number,
  quality = 0.82,
): Promise<string> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outputWidth, outputHeight);
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  return canvas.toDataURL("image/jpeg", quality);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", () =>
      reject(new Error("Failed to load image")),
    );
    img.src = src;
  });
}

export default function ImageCropModal({
  imageSrc,
  kind,
  onCancel,
  onComplete,
}: ImageCropModalProps) {
  const modes = modesFor(kind);
  const [modeKey, setModeKey] = useState(modes[0].key);
  const mode = modes.find((m) => m.key === modeKey) || modes[0];
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const round = kind === "profile";

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleApply() {
    if (!croppedAreaPixels || saving) return;
    setSaving(true);
    try {
      const dataUrl = await getCroppedDataUrl(
        imageSrc,
        croppedAreaPixels,
        mode.outputWidth,
        mode.outputHeight,
        kind === "profile" ? 0.85 : 0.78,
      );
      onComplete(dataUrl);
    } catch {
      window.alert("Could not crop this image. Please try another photo.");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-modal-title"
    >
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-black/[0.06] px-5 py-4">
          <div>
            <p
              id="crop-modal-title"
              className="font-dashboard text-lg font-extrabold tracking-[-0.02em] text-[#141414]"
            >
              {titleFor(kind)}
            </p>
            <p className="mt-0.5 text-xs text-[#6b6560]">
              Drag to reposition · zoom to frame · export {mode.outputWidth}×
              {mode.outputHeight}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5c5346] hover:bg-[#FAFAF8]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {modes.length > 1 ? (
          <div className="flex gap-2 border-b border-black/[0.06] px-5 py-3">
            {modes.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setModeKey(item.key);
                  setZoom(1);
                  setCrop({ x: 0, y: 0 });
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  modeKey === item.key
                    ? "bg-[#BC7C10] text-white"
                    : "bg-[#FAFAF8] text-[#5c5346] hover:bg-[#F3F1EC]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="relative h-[320px] bg-[#141414] sm:h-[380px]">
          <Cropper
            key={`${kind}-${modeKey}`}
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={mode.aspect}
            cropShape={round ? "round" : "rect"}
            showGrid={!round}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            objectFit="contain"
          />
        </div>

        <div className="space-y-4 px-5 py-4">
          <label className="flex items-center gap-3">
            <ZoomIn className="h-4 w-4 shrink-0 text-[#8a8174]" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#E8E4DC] accent-[#BC7C10]"
            />
            <span className="w-10 text-right text-xs font-semibold tabular-nums text-[#8a8174]">
              {zoom.toFixed(1)}x
            </span>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-black/[0.08] px-4 py-2.5 text-sm font-semibold text-[#141414] hover:bg-[#FAFAF8]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleApply()}
              disabled={saving || !croppedAreaPixels}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#BC7C10] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#9a650d] disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              {saving ? "Saving…" : "Apply crop"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Read a local image file as a data URL for the cropper */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Invalid file result"));
    };
    reader.onerror = () => reject(reader.error || new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}
