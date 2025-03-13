// src/components/AdminForm.tsx
import { useState, useEffect } from "react";
import { useReadContract } from "thirdweb/react";
import { readContract } from "thirdweb";
import { contract } from "@/constants/contracts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AdminFormProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  votes: { [marketId: string]: { [address: string]: "yes" | "no" | null } };
  setVotes: (votes: { [marketId: string]: { [address: string]: "yes" | "no" | null } }) => void;
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

function useMarkets() {
  const { data: marketCount, isLoading: isLoadingCount } = useReadContract({
    contract,
    method: "function marketCount() view returns (uint256)",
    params: [],
  });

  const [markets, setMarkets] = useState<Market[]>([]);

  useEffect(() => {
    async function fetchMarkets() {
      if (!marketCount || isLoadingCount) return;

      const marketList: Market[] = [];
      for (let i = 0; i < Number(marketCount); i++) {
        const data = await readContract({
          contract,
          method: "function getMarketInfo(uint256 _marketId) view returns (string question, string optionA, string optionB, uint256 endTime, uint8 outcome, uint256 totalOptionAShares, uint256 totalOptionBShares, bool resolved, uint256 category)",
          params: [BigInt(i)],
        });
        marketList.push({
          question: data[0],
          optionA: data[1],
          optionB: data[2],
          endTime: data[3],
          outcome: data[4],
          totalOptionAStake: data[5],
          totalOptionBStake: data[6],
          resolved: data[7],
          category: data[8],
        });
      }
      setMarkets(marketList);
    }
    fetchMarkets();
  }, [marketCount, isLoadingCount]);

  return { markets, isLoading: isLoadingCount };
}

export function AdminForm({ open, setOpen, votes, setVotes }: AdminFormProps) {
  const { markets, isLoading } = useMarkets();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMarketId, setSelectedMarketId] = useState<string>("");
  const [selectedOption, setSelectedOption] = useState<"A" | "B" | "">("");
  const [voteCount, setVoteCount] = useState<number>(0);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const filteredMarkets = markets.filter(market => 
    market.question.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedMarket = markets.find((_, idx) => idx === Number(selectedMarketId));

  const handleSubmit = () => {
    if (selectedMarketId && selectedOption && voteCount > 0) {
      const newVotes = { ...votes };
      const marketVotes = newVotes[selectedMarketId] || {};
      const optionKey = selectedOption === "A" ? "yes" : "no";
      
      for (let i = 0; i < voteCount; i++) {
        const uniqueKey = `admin_${Date.now()}_${i}`;
        marketVotes[uniqueKey] = optionKey;
      }
      
      newVotes[selectedMarketId] = marketVotes;
      setVotes(newVotes);
      // Persist to localStorage immediately
      if (typeof window !== "undefined") {
        localStorage.setItem("truthvote_votes", JSON.stringify(newVotes));
      }
    }

    if (bannerFile) {
      console.log("Banner file selected:", bannerFile.name);
      // Future: Upload to Vercel storage
    }

    setSearchQuery("");
    setSelectedMarketId("");
    setSelectedOption("");
    setVoteCount(0);
    setBannerFile(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Admin Controls</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Search markets (e.g., 'Davido')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isLoading}
          />
          <Select value={selectedMarketId} onValueChange={setSelectedMarketId} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue placeholder={isLoading ? "Loading markets..." : "Select a market"} />
            </SelectTrigger>
            <SelectContent>
              {filteredMarkets.map((market, idx) => (
                <SelectItem key={idx} value={idx.toString()}>
                  {market.question}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedMarket && (
            <Select value={selectedOption} onValueChange={(val: "A" | "B") => setSelectedOption(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">{selectedMarket.optionA}</SelectItem>
                <SelectItem value="B">{selectedMarket.optionB}</SelectItem>
              </SelectContent>
            </Select>
          )}
          {selectedOption && (
            <Input
              type="number"
              placeholder="Number of votes to add"
              value={voteCount}
              onChange={(e) => setVoteCount(Number(e.target.value))}
              min={0}
            />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
          />
          <Button onClick={handleSubmit}>Submit</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}