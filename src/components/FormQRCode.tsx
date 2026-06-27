import React, { useState } from "react";
import { QrCode, Copy, Check, Download, X } from "lucide-react";
import { motion } from "motion/react";

interface FormQRCodeProps {
  url: string;
  title: string;
  onClose: () => void;
}

export default function FormQRCode({ url, title, onClose }: FormQRCodeProps) {
  const [copied, setCopied] = useState(false);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  };

  const downloadQR = async () => {
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${title.replace(/\s+/g, "_")}_QR.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Failed to download QR code", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative"
        style={{
          boxShadow: "0 0 40px -10px rgba(99, 102, 241, 0.25)"
        }}
      >
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500 rounded-full shadow-[0_0_20px_2px_rgba(99,102,241,0.5)]"></div>

        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-indigo-400" />
              <h3 className="font-sans font-semibold text-lg text-white">Share Form</h3>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-slate-300 mb-6 font-sans">
            Scan this QR code or copy the link below to share your form and start collecting live responses.
          </p>

          <div className="flex flex-col items-center justify-center bg-slate-950 p-6 rounded-xl border border-slate-800/80 mb-6 relative">
            <img
              src={qrUrl}
              alt="Form QR Code"
              className="w-48 h-48 rounded-lg bg-white p-2 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
              referrerPolicy="no-referrer"
            />
            <span className="text-xs text-slate-500 mt-3 font-mono">Scan with Phone Camera</span>
          </div>

          {/* Share Link Input */}
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              readOnly
              value={url}
              className="flex-1 min-w-0 bg-slate-950 border border-slate-800 text-slate-300 px-3 py-2.5 rounded-lg text-sm font-mono focus:outline-none focus:border-indigo-500/50"
            />
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg flex items-center justify-center gap-1.5 transition-colors shrink-0"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400 animate-scale-up" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>

          {/* Secondary Action */}
          <button
            onClick={downloadQR}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700/80 text-white font-medium text-sm rounded-lg flex items-center justify-center gap-2 border border-slate-700/50 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Download QR Code Image</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
