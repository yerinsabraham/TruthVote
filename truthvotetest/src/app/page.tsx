// ~/truthvotemainn/truthvotetest/src/app/page.tsx
import { TruthVoteDashboard } from "../components/tvdashboard";

export async function getServerSideProps() {
  try {
    const response = await fetch("https://truth-vote.vercel.app/api/banner");
    if (!response.ok) throw new Error("Failed to fetch banner");
    const data = await response.json();
    return {
      props: { initialBanner: data.banner },
    };
  } catch (error) {
    console.error("SSR fetch banner error:", error);
    return {
      props: { initialBanner: "/assets/banner1.png" },
    };
  }
}

export default function Page({ initialBanner }: { initialBanner: string }) {
  return <TruthVoteDashboard initialBanner={initialBanner} />;
}