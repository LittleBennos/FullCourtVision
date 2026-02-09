"use client";

import { useState, useRef, useCallback } from "react";
import { Share2, Link2, Download, X, Check } from "lucide-react";

interface ShareButtonProps {
  /** "player" or "team" */
  type: "player" | "team";
  /** Display name */
  name: string;
  /** Stats to render on the card */
  stats: { label: string; value: string | number; accent?: boolean }[];
  /** Optional archetype badge text (e.g. "🎯 Sharpshooter") */
  archetype?: string;
  /** Optional subtitle (team/org name, season) */
  subtitle?: string;
}

export function ShareButton({ type, name, stats, archetype, subtitle }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = window.location.href;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  const downloadCard = useCallback(async () => {
    if (!cardRef.current) return;
    setGenerating(true);
    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#020617", // slate-950
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `${name.replace(/\s+/g, "-").toLowerCase()}-stats.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Failed to generate stats card:", err);
    } finally {
      setGenerating(false);
    }
  }, [name]);

  const nativeShare = useCallback(async () => {
    if (!navigator.share) return;
    try {
      // Try to share with image if possible
      if (cardRef.current) {
        const html2canvas = (await import("html2canvas-pro")).default;
        const canvas = await html2canvas(cardRef.current, {
          backgroundColor: "#020617",
          scale: 2,
          useCORS: true,
        });
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png")
        );
        if (blob) {
          const file = new File([blob], `${name.replace(/\s+/g, "-").toLowerCase()}-stats.png`, {
            type: "image/png",
          });
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({
              title: `${name} Stats — FullCourtVision`,
              url: window.location.href,
              files: [file],
            });
            return;
          }
        }
      }
      // Fallback: share URL only
      await navigator.share({
        title: `${name} Stats — FullCourtVision`,
        url: window.location.href,
      });
    } catch {
      // User cancelled or error
    }
  }, [name]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-400/30 hover:bg-blue-500/25 hover:border-blue-400/50 transition-all text-sm font-medium"
        aria-label="Share stats"
      >
        <Share2 className="w-4 h-4" />
        Share
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Share {type === "player" ? "Player" : "Team"} Stats</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white transition-colors" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stats card preview */}
            <div ref={cardRef} className="rounded-xl overflow-hidden" style={{ backgroundColor: "#020617" }}>
              <div className="p-6" style={{ background: "linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)" }}>
                {/* Logo / branding */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-blue-400 font-bold text-xs tracking-widest uppercase">FullCourtVision</span>
                  <span className="text-slate-500 text-xs">{type === "player" ? "Player Stats" : "Team Stats"}</span>
                </div>

                {/* Name + archetype */}
                <h4 className="text-2xl font-bold text-white mb-1">{name}</h4>
                {subtitle && <p className="text-slate-400 text-sm mb-2">{subtitle}</p>}
                {archetype && (
                  <span className="inline-block text-sm px-3 py-1 rounded-full bg-blue-400/15 text-blue-300 border border-blue-400/30 mb-4">
                    {archetype}
                  </span>
                )}

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {stats.map((s) => (
                    <div key={s.label} className="bg-slate-800/60 rounded-lg p-3">
                      <p className={`text-xl font-bold ${s.accent ? "text-blue-400" : "text-white"}`}>{s.value}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between">
                  <span className="text-slate-500 text-xs">fullcourtvision.vercel.app</span>
                  <span className="text-slate-600 text-xs">🏀</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={copyLink}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-colors border border-slate-700"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Link2 className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <button
                onClick={downloadCard}
                disabled={generating}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {generating ? "Generating..." : "Download Stats Card"}
              </button>
              {typeof navigator !== "undefined" && "share" in navigator && (
                <button
                  onClick={nativeShare}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-colors border border-slate-700"
                >
                  <Share2 className="w-4 h-4" />
                  Share via...
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
