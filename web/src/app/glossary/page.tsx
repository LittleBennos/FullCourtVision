import { GlossaryClient } from "./glossary-client";

export const metadata = {
  title: "Stats Glossary & Learn",
  description:
    "Comprehensive guide to every basketball statistic and metric used on FullCourtVision — PPG, archetypes, anomalies, chemistry scores and more.",
};

export default function GlossaryPage() {
  return <GlossaryClient />;
}
