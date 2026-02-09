"use client";

import { useState, useEffect } from "react";
import { Mail, Loader2, Check, X } from "lucide-react";

type Props = {
  playerIds: string[];
  teamIds: string[];
};

export function EmailDigest({ playerIds, teamIds }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "subscribed" | "error">("idle");
  const [message, setMessage] = useState("");
  const [subscribedEmail, setSubscribedEmail] = useState<string | null>(null);

  // Check if there's a saved subscription
  useEffect(() => {
    const saved = localStorage.getItem("fcv_digest_email");
    if (saved) {
      setEmail(saved);
      checkSubscription(saved);
    }
  }, []);

  // Update subscription when favourites change
  useEffect(() => {
    if (subscribedEmail && status === "subscribed") {
      updateSubscription(subscribedEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerIds, teamIds]);

  async function checkSubscription(emailToCheck: string) {
    try {
      const res = await fetch(`/api/digest/subscribe?email=${encodeURIComponent(emailToCheck)}`);
      const data = await res.json();
      if (data.subscribed) {
        setStatus("subscribed");
        setSubscribedEmail(emailToCheck);
      }
    } catch {
      // silently fail
    }
  }

  async function updateSubscription(emailToUpdate: string) {
    try {
      await fetch("/api/digest/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToUpdate,
          player_ids: playerIds,
          team_ids: teamIds,
        }),
      });
    } catch {
      // silently fail
    }
  }

  async function handleSubscribe() {
    if (!email) return;
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/digest/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          player_ids: playerIds,
          team_ids: teamIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Failed to subscribe");
        return;
      }

      setStatus("subscribed");
      setSubscribedEmail(email);
      localStorage.setItem("fcv_digest_email", email);
      setMessage("Subscribed! You'll receive weekly digests.");
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Try again.");
    }
  }

  async function handleUnsubscribe() {
    if (!subscribedEmail) return;
    setStatus("loading");

    try {
      await fetch(`/api/digest/subscribe?email=${encodeURIComponent(subscribedEmail)}`, {
        method: "DELETE",
      });

      setStatus("idle");
      setSubscribedEmail(null);
      setMessage("");
      localStorage.removeItem("fcv_digest_email");
    } catch {
      setStatus("error");
      setMessage("Failed to unsubscribe. Try again.");
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6 mb-8">
      <div className="flex items-center gap-3 mb-3">
        <Mail className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-semibold">Weekly Email Digest</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Get a weekly summary of your favourite players&apos; stats delivered to your inbox.
      </p>

      {status === "subscribed" ? (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-green-400">Subscribed as</span>
            <span className="text-foreground font-medium">{subscribedEmail}</span>
          </div>
          <button
            onClick={handleUnsubscribe}
            className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            Unsubscribe
          </button>
        </div>
      ) : (
        <div className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === "error") setStatus("idle");
            }}
            placeholder="your@email.com"
            className="flex-1 bg-slate-950 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-400 transition-colors"
            onKeyDown={(e) => e.key === "Enter" && handleSubscribe()}
          />
          <button
            onClick={handleSubscribe}
            disabled={status === "loading" || !email}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer"
          >
            {status === "loading" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
            Subscribe
          </button>
        </div>
      )}

      {message && status === "error" && (
        <p className="text-sm text-red-400 mt-3">{message}</p>
      )}
      {message && status === "subscribed" && (
        <p className="text-sm text-green-400 mt-3">{message}</p>
      )}
    </div>
  );
}
