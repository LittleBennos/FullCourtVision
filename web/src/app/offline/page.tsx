"use client";

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="text-6xl mb-6">🏀</div>
      <h1 className="text-3xl font-bold mb-3">You&apos;re Offline</h1>
      <p className="text-muted-foreground max-w-md mb-6">
        It looks like you&apos;ve lost your internet connection. Check your
        connection and try again to access FullCourtVision analytics.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
