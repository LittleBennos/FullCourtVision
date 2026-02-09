import { Suspense } from "react";
import dynamicImport from "next/dynamic";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Compare Players",
  description: "Compare basketball players side by side. View stats, trends, and head-to-head performance across Victorian competitions.",
};

// Dynamically import the heavy comparison component to reduce initial bundle size
const CompareClient = dynamicImport(() => import("./compare-client"), {
  loading: () => (
    <div className="max-w-7xl mx-auto px-4 py-8 text-muted-foreground">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
          <p>Loading comparison tool...</p>
        </div>
      </div>
    </div>
  )
});

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8 text-muted-foreground">Loading...</div>}>
      <CompareClient />
    </Suspense>
  );
}
