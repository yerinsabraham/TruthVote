// src/components/marketcard.tsx
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { contract } from "@/constants/contracts";
import { MarketProgress } from "./market-progress";
import { MarketTime } from "./market-time";
import { MarketCardSkeleton } from "./market-card-skeleton";
import { MarketResolved } from "./market-resolved";
import { MarketPending } from "./market-pending";
import { MarketBuyInterface } from "./market-buy-interface";
import { MarketSharesDisplay } from "./market-shares-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

interface MarketCardProps {
  index: number;
  filter: "active" | "pending" | "resolved";
  selectedCategory: string;
  categories: { name: string; id: number }[];
}

interface Market {
  question: string;
  optionA: string;
  optionB: string;
  endTime: bigint;
  outcome: number;
  totalOptionAStake: bigint;
  totalOptionBStake: bigint;
  resolved: boolean;
  category: bigint;
}

interface StakeBalance {
  optionAStake: bigint;
  optionBStake: bigint;
}

export function MarketCard({ index, filter, selectedCategory, categories }: MarketCardProps) {
  const account = useActiveAccount();

  const { data: marketData, isLoading: isLoadingMarketData } = useReadContract({
    contract,
    method: "function getMarketInfo(uint256 _marketId) view returns (string question, string optionA, string optionB, uint256 endTime, uint8 outcome, uint256 totalOptionAShares, uint256 totalOptionBShares, bool resolved, uint256 category)",
    params: [BigInt(index)],
  });

  const { data: stakeBalanceData } = useReadContract({
    contract,
    method: "function getSharesBalance(uint256 _marketId, address _user) view returns (uint256 optionAShares, uint256 optionBShares)",
    params: [BigInt(index), account?.address || "0x0000000000000000000000000000000000000000"],
  });

  const [mode, setMode] = useState<"vote" | "stake">("vote");
  const [stakeOption, setStakeOption] = useState<"A" | "B" | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string>("");
  const [potentialWinnings, setPotentialWinnings] = useState<number>(0);
  const [votes, setVotes] = useState<{ [marketId: string]: { [address: string]: "yes" | "no" | null } }>({});
  const [voteCounts, setVoteCounts] = useState<{ yes: number; no: number }>({ yes: 0, no: 0 });
  const [hasVoted, setHasVoted] = useState<boolean>(false);

  const market: Market | undefined = marketData
    ? {
        question: marketData[0],
        optionA: marketData[1],
        optionB: marketData[2],
        endTime: marketData[3],
        outcome: marketData[4],
        totalOptionAStake: marketData[5],
        totalOptionBStake: marketData[6],
        resolved: marketData[7],
        category: marketData[8],
      }
    : undefined;

  const stakeBalance: StakeBalance | undefined = account && stakeBalanceData
    ? {
        optionAStake: stakeBalanceData[0],
        optionBStake: stakeBalanceData[1],
      }
    : undefined;

  const isExpired = market ? new Date(Number(market.endTime) * 1000) < new Date() : false;
  const isResolved = market?.resolved || false;

  // Fetch votes from local server on mount and account change
  useEffect(() => {
    const fetchVotes = async () => {
      try {
        const response = await fetch("http://localhost:3001/votes");
        const data = await response.json();
        setVotes(data);
      } catch (error) {
        console.error("Error fetching votes:", error);
      }
    };
    fetchVotes();
  }, [account]);

  // Update vote counts when votes or market changes
  useEffect(() => {
    if (!market) return;

    const marketVotes = votes[index] || {};
    const yesCount = Object.values(marketVotes).filter((v) => v === "yes").length;
    const noCount = Object.values(marketVotes).filter((v) => v === "no").length;
    const newVoteCounts = { yes: yesCount, no: noCount };
    const newHasVoted = account ? !!marketVotes[account.address] : false;

    if (voteCounts.yes !== yesCount || voteCounts.no !== noCount) {
      setVoteCounts(newVoteCounts);
    }
    if (hasVoted !== newHasVoted) {
      setHasVoted(newHasVoted);
    }
  }, [votes, index, market, account]);

  useEffect(() => {
    if (!market || !stakeAmount || !stakeOption || Number(stakeAmount) <= 0) {
      if (potentialWinnings !== 0) setPotentialWinnings(0);
      return;
    }

    const amount = Number(stakeAmount) * 1_000_000;
    const totalA = Number(market.totalOptionAStake);
    const totalB = Number(market.totalOptionBStake);
    const winningPool = stakeOption === "A" ? totalA + amount : totalB + amount;
    const losingPool = stakeOption === "A" ? totalB : totalA;

    if (winningPool === 0) {
      if (potentialWinnings !== 0) setPotentialWinnings(0);
      return;
    }

    const rewardRatio = (losingPool * 1e18) / winningPool;
    const winnings = amount + (amount * rewardRatio) / 1e18;
    const newWinnings = winnings / 1_000_000;
    if (potentialWinnings !== newWinnings) setPotentialWinnings(newWinnings);
  }, [stakeAmount, stakeOption, market, potentialWinnings]);

  const handleVote = async (option: "yes" | "no") => {
    if (!account || votes[index]?.[account.address]) return;

    const newVotes = {
      ...votes,
      [index]: {
        ...(votes[index] || {}),
        [account.address]: option,
      },
    };
    setVotes(newVotes);

    try {
      await fetch("http://localhost:3001/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketId: index.toString(),
          address: account.address,
          option,
        }),
      });
    } catch (error) {
      console.error("Error saving vote:", error);
    }
  };

  const handleStakePrompt = () => {
    if (!account) {
      alert("Please connect a wallet to stake.");
      return;
    }
    setMode("stake");
  };

  const totalVotes = voteCounts.yes + voteCounts.no;
  const yesPercentage = totalVotes > 0 ? (voteCounts.yes / totalVotes) * 100 : 50;
  const noPercentage = totalVotes > 0 ? (voteCounts.no / totalVotes) * 100 : 50;

  const shouldShow = () => {
    if (!market) return false;

    const selectedCat = categories.find((cat) => cat.name === selectedCategory);
    const selectedCatId = selectedCat ? selectedCat.id : -1;
    if (selectedCatId !== -1 && Number(market.category) !== selectedCatId) {
      return false;
    }

    switch (filter) {
      case "active":
        return !isExpired;
      case "pending":
        return isExpired && !isResolved;
      case "resolved":
        return isExpired && isResolved;
      default:
        return true;
    }
  };

  if (!shouldShow()) {
    return null;
  }

  return (
    <Card key={index} className="flex flex-col">
      {isLoadingMarketData ? (
        <MarketCardSkeleton />
      ) : (
        <>
          <CardHeader className="flex flex-row justify-between items-center">
            {market && <MarketTime endTime={market.endTime} />}
            <Button
              variant="outline"
              className="bg-white border-[#0076a3] border text-[#0076a3] hover:bg-[#0076a3] hover:text-white h-8"
              onClick={() => setMode(mode === "vote" ? "stake" : "vote")}
              disabled={!account}
            >
              {mode === "vote" ? "Click to Stake" : "Vote"}
            </Button>
          </CardHeader>
          <CardTitle className="px-4 pt-2">{market?.question || "Loading..."}</CardTitle>
          <CardContent>
            {!account && <p className="mt-4 text-sm text-gray-500">Connect wallet to vote or stake</p>}
            {mode === "stake" && market && (
              <MarketProgress
                optionA={market.optionA}
                optionB={market.optionB}
                totalOptionAStake={market.totalOptionAStake}
                totalOptionBStake={market.totalOptionBStake}
              />
            )}
            {mode === "stake" && market && (
              <div className="mt-2 text-sm text-gray-500">
                Yes: {(Number(market.totalOptionAStake) / 1_000_000).toFixed(2)} USDT | No:{" "}
                {(Number(market.totalOptionBStake) / 1_000_000).toFixed(2)} USDT
              </div>
            )}
            {filter === "active" && market ? (
              <div className="mt-4">
                {mode === "vote" && (
                  <div className="mt-2">
                    <div className="flex justify-between text-sm text-gray-500 mb-2">
                      <span className="font-bold">
                        {market.optionA}: {yesPercentage.toFixed(0)}%
                      </span>
                      <span className="font-bold">
                        {market.optionB}: {noPercentage.toFixed(0)}%
                      </span>
                    </div>
                    <div
                      aria-valuemax={100}
                      aria-valuemin={0}
                      role="progressbar"
                      data-state="indeterminate"
                      data-max={100}
                      className="bg-primary/20 relative w-full overflow-hidden rounded-full h-2 mb-4"
                    >
                      <div
                        className="bg-primary h-full w-full flex-1 transition-all"
                        style={{ transform: `translateX(-${100 - yesPercentage}%)` }}
                      ></div>
                    </div>
                  </div>
                )}
                <div className="flex justify-between gap-4 mb-4">
                  <Button
                    className="flex-1"
                    onClick={() => mode === "vote" ? handleVote("yes") : setStakeOption(stakeOption === "A" ? null : "A")}
                    disabled={!account || isExpired || isResolved || (mode === "vote" && !!votes[index]?.[account.address])}
                  >
                    {market.optionA}
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => mode === "vote" ? handleVote("no") : setStakeOption(stakeOption === "B" ? null : "B")}
                    disabled={!account || isExpired || isResolved || (mode === "vote" && !!votes[index]?.[account.address])}
                  >
                    {market.optionB}
                  </Button>
                </div>
                {mode === "stake" && stakeOption && (
                  <div className="mt-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.000001"
                      placeholder="Enter USDT to stake"
                      value={stakeAmount}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "" || Number(value) >= 0) {
                          setStakeAmount(value);
                        }
                      }}
                      className="mb-2"
                    />
                    <p className="text-sm text-gray-500">
                      {stakeAmount && potentialWinnings > 0
                        ? `Stake ${stakeAmount} USDT on ${stakeOption === "A" ? market.optionA : market.optionB} to win ${potentialWinnings.toFixed(2)} USDT if correct`
                        : "Enter an amount to see potential winnings"}
                    </p>
                  </div>
                )}
                {mode === "vote" && hasVoted && account && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2 text-center">
                      You voted <span className="font-bold">{votes[index]?.[account.address] === "yes" ? market.optionA : market.optionB}</span>
                    </p>
                    <Button
                      variant="ghost"
                      className="text-[#0076a3] w-full"
                      onClick={handleStakePrompt}
                    >
                      Stake to Earn from Your Vote
                    </Button>
                  </div>
                )}
              </div>
            ) : isExpired ? (
              market?.resolved ? (
                <MarketResolved
                  marketId={index}
                  outcome={market.outcome}
                  optionA={market.optionA}
                  optionB={market.optionB}
                />
              ) : (
                <MarketPending />
              )
            ) : (
              market && <MarketBuyInterface marketId={index} market={market} />
            )}
          </CardContent>
          <CardFooter>
            {mode === "stake" && market && stakeBalance && (
              <MarketSharesDisplay market={market} stakeBalance={stakeBalance} />
            )}
          </CardFooter>
        </>
      )}
    </Card>
  );
}