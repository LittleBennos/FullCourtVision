import { Metadata } from "next";
import { AnalyticsClient } from "./analytics-client";

export const metadata: Metadata = {
  title: "Coach's Corner - Analytics | FullCourtVision",
  description: "Deep dive into league analytics and trends with comprehensive statistical analysis",
};

export default function AnalyticsPage() {
  return <AnalyticsClient />;
}