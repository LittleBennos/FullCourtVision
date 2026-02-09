import { Suspense } from "react";
import GradeCompareClient from "./compare-client";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const metadata = {
  title: "Compare Grades — FullCourtVision",
  description: "Compare two basketball grades side by side across key metrics including scoring, competitiveness, and more.",
};

export default function GradeComparePage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 pt-8">
        <Breadcrumbs items={[
          { label: "Grades", href: "/grades" },
          { label: "Compare" },
        ]} />
      </div>
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <GradeCompareClient />
      </Suspense>
    </div>
  );
}
