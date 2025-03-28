// src/components/market-shares-display.tsx
import { Badge } from "./ui/badge";
import { useEffect, useState } from "react";
import { toFixed } from "@/lib/utils";

interface MarketSharesDisplayProps {
    market: {
        optionA: string;
        optionB: string;
        totalOptionAStake: bigint; // Kept as-is for compatibility
        totalOptionBStake: bigint; // Kept as-is for compatibility
    };
    stakeBalance: {
        optionAStake: bigint; // Kept as-is for compatibility
        optionBStake: bigint; // Kept as-is for compatibility
    };
}

export function MarketSharesDisplay({
    market,
    stakeBalance,
}: MarketSharesDisplayProps) {
    const [winnings, setWinnings] = useState<{ A: bigint; B: bigint }>({ 
        A: BigInt(0), 
        B: BigInt(0) 
    });

    const calculateWinnings = (option: 'A' | 'B') => {
        if (!stakeBalance || !market) return BigInt(0);

        const userStake = option === 'A' ? stakeBalance.optionAStake : stakeBalance.optionBStake;
        const totalStakeForOption = option === 'A' ? market.totalOptionAStake : market.totalOptionBStake;
        const totalLosingStake = option === 'A' ? market.totalOptionBStake : market.totalOptionAStake;

        if (totalStakeForOption === BigInt(0)) return BigInt(0);

        // Calculate user's proportion of the winning side
        const userProportion = (userStake * BigInt(1000000)) / totalStakeForOption; // Multiply by 1M for precision
        
        // Calculate their share of the losing side's stake
        const winningsFromLosingStake = (totalLosingStake * userProportion) / BigInt(1000000);
        
        // Total winnings is their original stake plus their proportion of losing stake
        return userStake + winningsFromLosingStake;
    };

    useEffect(() => {
        if (!stakeBalance || !market) return;

        const newWinnings = {
            A: calculateWinnings('A'),
            B: calculateWinnings('B')
        };

        // Only update if values actually changed
        if (newWinnings.A !== winnings.A || newWinnings.B !== winnings.B) {
            setWinnings(newWinnings);
        }
    }, [stakeBalance, market.totalOptionAStake, market.totalOptionBStake]);

    const displayWinningsA = toFixed(Number(winnings.A) / 1_000_000, 2); // Convert 6 decimals to USDT
    const displayWinningsB = toFixed(Number(winnings.B) / 1_000_000, 2); // Convert 6 decimals to USDT

    return (
        <div className="flex flex-col gap-2">
            <div className="w-full text-sm text-muted-foreground">
                Your stakes: {market.optionA} - {(Number(stakeBalance?.optionAStake) / 1_000_000).toFixed(2)} USDT, {market.optionB} - {(Number(stakeBalance?.optionBStake) / 1_000_000).toFixed(2)} USDT {/* Updated text */}
            </div>
            {(winnings.A > 0 || winnings.B > 0) && (
                <div className="flex flex-col gap-1">
                    <div className="text-xs text-muted-foreground">Winnings:</div>
                    <div className="flex gap-2">
                        <Badge variant="secondary">{market.optionA}: {displayWinningsA} USDT</Badge>
                        <Badge variant="secondary">{market.optionB}: {displayWinningsB} USDT</Badge>
                    </div>
                </div>
            )}
        </div>
    );
}