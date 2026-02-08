import { Suspense } from "react";
import CompareClient from "./compare-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Compare Players",
  description: "Compare basketball players side by side. View stats, trends, and head-to-head performance across Victorian competitions.",
};

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8 text-muted-foreground">Loading...</div>}>
      <CompareClient />
    </Suspense>
  );
}
