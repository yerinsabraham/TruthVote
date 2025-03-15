// ~/truthvotemainn/truthvotetest/src/app/page.tsx
import { TruthVoteDashboard } from "../components/tvdashboard";

async function fetchInitialBanner() {
  try {
    const response = await fetch("https://truth-vote.vercel.app/api/banner", {
      cache: "no-store", // Ensure fresh data
    });
    if (!response.ok) throw new Error("Failed to fetch banner");
    const data = await response.json();
    return data.banner;
  } catch (error) {
    console.error("Fetch banner error:", error);
    return "/assets/banner1.png";
  }
}

export default async function Page() {
  const initialBanner = await fetchInitialBanner();
  return <TruthVoteDashboard initialBanner={initialBanner} />;
}