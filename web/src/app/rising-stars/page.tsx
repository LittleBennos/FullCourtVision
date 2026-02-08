import { getRisingStars } from "@/lib/data";
import { RisingStarsClient } from "./rising-stars-client";

export const metadata = {
  title: "Rising Stars — FullCourtVision",
  description: "Players with the biggest PPG improvement between their most recent and previous seasons in Victorian basketball.",
};

export const revalidate = 3600;

export default async function RisingStarsPage() {
  const risingStars = await getRisingStars();
  
  return <RisingStarsClient risingStars={risingStars} />;
}
