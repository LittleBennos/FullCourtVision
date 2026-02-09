import { ConferencesClient } from "./conferences-client";

export const metadata = {
  title: "Conference Standings — FullCourtVision",
  description: "Conference and division standings with playoff seeding for Victorian basketball competitions.",
};

export default function ConferencesPage() {
  return <ConferencesClient />;
}
