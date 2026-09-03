"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";

/**
 * ตัวตรวจบาร์โค้ดของเบราว์เซอร์ — ยังไม่มีใน TypeScript lib จึงประกาศเท่าที่ใช้
 * รองรับใน Chrome/Android ส่วน Safari บน iOS ยังไม่รองรับ (กันยายน 2026)
 * จึงต้องมีช่องกรอกเลขเองเสมอ ไม่ใช่ทางเลือกสำรองแบบขอไปที
 */
type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = { detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]> };
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];

export type ScannedFood = {
  id: string;
  name: string;
  nameTh: string | null;
  kcalPer100g: number;
  servings: { id: string; label: string; grams: number; isDefault: boolean }[];
};

function getDetectorCtor(): BarcodeDetectorCtor | null {
  const ctor = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  return typeof ctor === "function" ? ctor : null;
}

export function BarcodeScanner({
  onFound,
  onCancel,
}: {
  onFound: (food: ScannedFood) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);

  const supported = typeof window !== "undefined" && getDetectorCtor() !== null;

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  const lookup = useCallback(
    async (code: string) => {
      setLooking(true);
      setError(null);
      setStatus(`กำลังค้นหาบาร์โค้ด ${code}`);
      try {
        const response = await fetch(`/api/foods/barcode/${code}`);
        const data = await response.json();
        if (!response.ok) {
          setStatus(null);
          setError(data.error ?? "ค้นหาไม่สำเร็จ");
          return;
        }
        stopCamera();
        onFound({
          id: data.food.id,
          name: data.food.name,
          nameTh: data.food.nameTh,
          kcalPer100g: data.food.kcalPer100g,
          servings: data.food.servings ?? [],
        });
      } finally {
        setLooking(false);
      }
    },
    [onFound, stopCamera],
  );

  // ปิดกล้องเสมอเมื่อออกจากหน้านี้ ไม่งั้นไฟกล้องค้างติดทั้งที่ปิดแผ่นไปแล้ว
  useEffect(() => stopCamera, [stopCamera]);

  async function startCamera() {
    setError(null);
    const Detector = getDetectorCtor();
    if (!Detector) return setError("เบราว์เซอร์นี้ยังสแกนบาร์โค้ดไม่ได้ กรอกเลขใต้บาร์โค้ดแทนได้");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCameraOn(true);
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      const detector = new Detector({ formats: FORMATS });
      const scan = async () => {
        if (!streamRef.current) return;
        try {
          const found = await detector.detect(video);
          const code = found[0]?.rawValue;
          if (code) {
            await lookup(code);
            return;
          }
        } catch {
          // เฟรมที่อ่านไม่ออกเป็นเรื่องปกติระหว่างเล็ง — วนอ่านเฟรมถัดไป
        }
        requestAnimationFrame(scan);
      };
      requestAnimationFrame(scan);
    } catch {
      setError("เปิดกล้องไม่ได้ — อนุญาตการใช้กล้อง หรือกรอกเลขใต้บาร์โค้ดแทน");
    }
  }

  return (
    <div className="space-y-4">
      <button type="button" onClick={onCancel} className="text-sm text-ink-3">
        ← กลับไปค้นหา
      </button>

      {cameraOn ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-black">
          <video ref={videoRef} playsInline muted className="aspect-[3/4] w-full object-cover" />
        </div>
      ) : (
        supported && (
          <Button type="button" onClick={startCamera}>
            เปิดกล้องสแกนบาร์โค้ด
          </Button>
        )
      )}

      {status && <p className="text-sm text-ink-3">{status}</p>}

      <form
        action={(formData) => {
          const code = String(formData.get("code") ?? "").trim();
          void lookup(code);
        }}
        className="space-y-3"
      >
        <Field
          label="หรือกรอกเลขใต้บาร์โค้ด"
          hint={supported ? undefined : "เบราว์เซอร์นี้ยังเปิดกล้องสแกนไม่ได้"}
        >
          <Input
            name="code"
            inputMode="numeric"
            pattern="\d{8,14}"
            minLength={8}
            maxLength={14}
            placeholder="8850253000019"
            required
          />
        </Field>
        <Button type="submit" variant="ghost" disabled={looking}>
          {looking ? "กำลังค้นหา…" : "ค้นหาจากเลขบาร์โค้ด"}
        </Button>
      </form>

      {error && <Alert>{error}</Alert>}
    </div>
  );
}
