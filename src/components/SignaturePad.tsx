import React, { useRef, useState, useEffect } from "react";
import { Trash2 } from "lucide-react";

interface SignaturePadProps {
  value: string; // Base64 image
  onChange: (value: string) => void;
  lang: string;
}

export default function SignaturePad({ value, onChange, lang }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(!!value);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Adjust canvas resolution for high-DPI screens
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(2, 2);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#ffffff"; // White ink for dark mode / contrasting signature drawing
      
      // If there's an existing signature image, load and draw it
      if (value) {
        const img = new Image();
        img.src = value;
        img.onload = () => {
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
        };
      }
    }
  }, [value]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    if ("touches" in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      setIsDrawing(true);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      setHasDrawn(true);
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Convert drawn canvas content to Base64
    const dataURL = canvas.toDataURL("image/png");
    onChange(dataURL);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
      onChange("");
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-slate-400 font-sans">
          {lang === "BN" ? "নিচে আপনার স্বাক্ষর আঁকুন" : "Draw your signature below"}
        </span>
        {hasDrawn && (
          <button
            type="button"
            onClick={clearCanvas}
            className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{lang === "BN" ? "মুছে ফেলুন" : "Clear"}</span>
          </button>
        )}
      </div>

      <div className="relative w-full h-32 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden touch-none shadow-inner">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full cursor-crosshair"
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <span className="text-xs text-slate-600 font-sans italic">
              {lang === "BN" ? "স্বাক্ষর করার স্থান" : "Sign Here"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
