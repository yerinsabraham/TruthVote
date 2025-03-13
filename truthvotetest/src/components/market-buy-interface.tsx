// src/components/market-buy-interface.tsx
"use client";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useState, useRef, useEffect } from "react";
import { useActiveAccount, useSendAndConfirmTransaction } from "thirdweb/react";
import { prepareContractCall, readContract } from "thirdweb";
import { contract, tokenContract } from "@/constants/contracts";
import { approve } from "thirdweb/extensions/erc20";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner"; // Import toast from sonner

interface MarketBuyInterfaceProps {
  marketId: number;
  market: {
    optionA: string;
    optionB: string;
    question: string;
    endTime: bigint;
    resolved: boolean;
    totalOptionAStake: bigint;
    totalOptionBStake: bigint;
  };
}

type BuyingStep = "initial" | "allowance" | "confirm";
type Option = "A" | "B" | null;

export function MarketBuyInterface({ marketId, market }: MarketBuyInterfaceProps) {
  const account = useActiveAccount();
  const { mutateAsync: mutateTransaction } = useSendAndConfirmTransaction();

  const [isBuying, setIsBuying] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [containerHeight, setContainerHeight] = useState("auto");
  const contentRef = useRef<HTMLDivElement>(null);

  const [selectedOption, setSelectedOption] = useState<Option>(null);
  const [amount, setAmount] = useState(0);
  const [buyingStep, setBuyingStep] = useState<BuyingStep>("initial");
  const [isApproving, setIsApproving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (contentRef.current) {
      setTimeout(() => {
        setContainerHeight(`${contentRef.current?.offsetHeight || 0}px`);
      }, 0);
    }
  }, [isBuying, buyingStep, isVisible, error]);

  const handleBuy = (option: "A" | "B") => {
    setIsVisible(false);
    setTimeout(() => {
      setIsBuying(true);
      setSelectedOption(option);
      setIsVisible(true);
    }, 200);
  };

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => {
      setIsBuying(false);
      setBuyingStep("initial");
      setSelectedOption(null);
      setAmount(0);
      setError(null);
      setIsVisible(true);
    }, 200);
  };

  const checkApproval = async () => {
    if (!account) {
      setError("Please connect your wallet");
      return;
    }
    if (amount <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    if (new Date(Number(market.endTime) * 1000) < new Date()) {
      setError("Staking period has ended");
      return;
    }
    if (market.resolved) {
      setError("Market is already resolved");
      return;
    }
    setError(null);

    try {
      const userAllowance = await readContract({
        contract: tokenContract,
        method: "function allowance(address owner, address spender) view returns (uint256)",
        params: [account.address, contract.address],
      });

      const amountInUnits = BigInt(Math.floor(amount * 1_000_000)); // USDT uses 6 decimals
      setBuyingStep(userAllowance < amountInUnits ? "allowance" : "confirm");
    } catch (error) {
      console.error("Check approval error:", error);
      setError("Failed to check allowance");
    }
  };

  const handleSetApproval = async () => {
    setIsApproving(true);
    try {
      const tx = await approve({
        contract: tokenContract,
        spender: contract.address,
        amount: amount.toString(),
      });
      await mutateTransaction(tx);
      setBuyingStep("confirm");
      toast("Approval Successful", { description: "USDT approved for staking" });
    } catch (error) {
      console.error("Approval error:", error);
      toast("Approval Failed", {
        description: "Failed to approve USDT",
        style: { background: "#fee2e2", color: "#dc2626" }, // Custom destructive style
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedOption || amount <= 0) {
      setError("Must select an option and enter an amount greater than 0");
      return;
    }

    setIsConfirming(true);
    try {
      const amountInUnits = BigInt(Math.floor(amount * 1_000_000)); // USDT uses 6 decimals
      const tx = await prepareContractCall({
        contract,
        method: "function buyShares(uint256 _marketId, bool _isOptionA, uint256 _amount)",
        params: [BigInt(marketId), selectedOption === "A", amountInUnits],
      });
      await mutateTransaction(tx);
      toast("Stake Successful!", {
        description: `You staked ${amount} USDT on ${selectedOption === "A" ? market.optionA : market.optionB}`,
        duration: 5000,
      });
      handleCancel();
    } catch (error) {
      console.error("Stake error:", error);
      toast("Stake Failed", {
        description: "Failed to process your stake",
        style: { background: "#fee2e2", color: "#dc2626" }, // Custom destructive style
      });
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="relative transition-[height] duration-200 ease-in-out overflow-hidden" style={{ height: containerHeight }}>
      <div
        ref={contentRef}
        className={cn(
          "w-full transition-all duration-200 ease-in-out",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        {!isBuying ? (
          <div className="flex justify-between gap-4 mb-4">
            <Button
              className="flex-1"
              onClick={() => handleBuy("A")}
              aria-label={`Stake on ${market.optionA} for "${market.question}"`}
              disabled={!account}
            >
              {market.optionA}
            </Button>
            <Button
              className="flex-1"
              onClick={() => handleBuy("B")}
              aria-label={`Stake on ${market.optionB} for "${market.question}"`}
              disabled={!account}
            >
              {market.optionB}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col mb-4">
            {buyingStep === "allowance" ? (
              <div className="flex flex-col border-2 border-gray-200 rounded-lg p-4">
                <h2 className="text-lg font-bold mb-4">Approval Needed</h2>
                <p className="mb-4">You need to approve the transaction before staking with USDT.</p>
                <div className="flex justify-end">
                  <Button onClick={handleSetApproval} className="mb-2" disabled={isApproving}>
                    {isApproving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      "Set Approval"
                    )}
                  </Button>
                  <Button onClick={handleCancel} className="ml-2" variant="outline" disabled={isApproving}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : buyingStep === "confirm" ? (
              <div className="flex flex-col border-2 border-gray-200 rounded-lg p-4">
                <h2 className="text-lg font-bold mb-4">Confirm Transaction</h2>
                <p className="mb-4">
                  You are about to stake <span className="font-bold">{amount} USDT</span> on{" "}
                  <span className="font-bold">{selectedOption === "A" ? market.optionA : market.optionB}</span>.
                </p>
                <div className="flex justify-end">
                  <Button onClick={handleConfirm} className="mb-2" disabled={isConfirming}>
                    {isConfirming ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      "Confirm"
                    )}
                  </Button>
                  <Button onClick={handleCancel} className="ml-2" variant="outline" disabled={isConfirming}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 mb-1">{`Enter USDT to stake on ${selectedOption === "A" ? market.optionA : market.optionB}`}</span>
                <div className="flex flex-col gap-1 mb-4">
                  <div className="flex items-center gap-2 overflow-visible">
                    <div className="flex-grow relative">
                      <Input
                        type="number"
                        min="0"
                        step="0.000001"
                        placeholder="Enter USDT amount"
                        value={amount}
                        onChange={(e) => {
                          const value = Math.max(0, Number(e.target.value));
                          setAmount(value);
                          setError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "-" || e.key === "e") {
                            e.preventDefault();
                          }
                        }}
                        className={cn("w-full", error && "border-red-500 focus-visible:ring-red-500")}
                      />
                    </div>
                    <span className="font-bold whitespace-nowrap">USDT</span>
                  </div>
                  <div className="min-h-[20px]">
                    {error && <span className="text-sm text-red-500">{error}</span>}
                  </div>
                </div>
                <div className="flex justify-between gap-4">
                  <Button onClick={checkApproval} className="flex-1">Confirm</Button>
                  <Button onClick={handleCancel} variant="outline" className="flex-1">Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}