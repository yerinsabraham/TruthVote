// src/components/tvdashboard.tsx
'use client'

import { useState, useEffect } from "react";
import { useReadContract } from "thirdweb/react";
import { contract } from "@/constants/contracts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketCard } from "./marketCard";
import { Navbar } from "./navbar";
import { MarketCardSkeleton } from "./market-card-skeleton";
import { Footer } from "./footer";
import { readContract } from "thirdweb";

const API_URL = process.env.NODE_ENV === "development" ? "http://localhost:3001/banner" : "/api/banner";

export function TruthVoteDashboard() {
    const { data: marketCount, isLoading: isLoadingMarketCount } = useReadContract({
        contract,
        method: "function marketCount() view returns (uint256)",
        params: [],
    });

    const { data: categoryCount } = useReadContract({
        contract,
        method: "function categoryCount() view returns (uint256)",
        params: [],
    });

    const [categories, setCategories] = useState<{ name: string; id: number }[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const [banner, setBanner] = useState<string>("/assets/banner1.png");

    useEffect(() => {
        async function fetchCategories() {
            if (categoryCount) {
                const catList: { name: string; id: number }[] = [];
                for (let i = 0; i < Number(categoryCount); i++) {
                    const name = await readContract({
                        contract,
                        method: "function categoryNames(uint256) view returns (string)",
                        params: [BigInt(i)],
                    });
                    catList.push({ name, id: i });
                }
                catList.sort((a, b) => b.id - a.id);
                setCategories([{ name: "All", id: -1 }, ...catList]);
            }
        }
        fetchCategories();
    }, [categoryCount]);

    useEffect(() => {
        async function fetchBanner() {
            try {
                const response = await fetch(API_URL);
                if (!response.ok) {
                    console.warn("Banner fetch failed, using default:", response.status);
                    setBanner("/assets/banner1.png");
                    return;
                }
                const data = await response.json();
                setBanner(data.banner);
            } catch (error) {
                console.error("Error fetching banner:", error);
                setBanner("/assets/banner1.png");
            }
        }
        fetchBanner();
    }, []);

    const handleBannerUpdate = (newBanner: string) => {
        setBanner(newBanner);
    };

    const skeletonCards = Array.from({ length: 6 }, (_, i) => (
        <MarketCardSkeleton key={`skeleton-${i}`} />
    ));

    return (
        <div className="min-h-screen flex flex-col">
            <div className="flex-grow container mx-auto p-4">
                <Navbar onBannerUpdate={handleBannerUpdate} />
                <div className="mb-4">
                    <img 
                        src={banner}
                        alt="TruthVote Banner"
                        width={800}
                        height={300}
                        className="w-full h-auto rounded-lg" 
                    />
                </div>
                <div className="mb-4 overflow-x-auto whitespace-nowrap">
                    {categories.map((category, index) => (
                        <button
                            key={index}
                            onClick={() => setSelectedCategory(category.name)}
                            className={`inline-block px-4 py-2 mr-2 rounded-md text-sm font-medium transition-colors ${
                                selectedCategory === category.name
                                    ? "bg-[#0076a3] text-white"
                                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                            }`}
                        >
                            {category.name}
                        </button>
                    ))}
                </div>
                <Tabs defaultValue="active" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="active">Active</TabsTrigger>
                        <TabsTrigger value="pending">Pending</TabsTrigger>
                        <TabsTrigger value="resolved">Resolved</TabsTrigger>
                    </TabsList>
                    {isLoadingMarketCount ? (
                        <TabsContent value="active" className="mt-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {skeletonCards}
                            </div>
                        </TabsContent>
                    ) : (
                        <>
                            <TabsContent value="active">
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {Array.from({ length: Number(marketCount) }, (_, index) => (
                                        <MarketCard 
                                            key={index} 
                                            index={index} 
                                            filter="active"
                                            selectedCategory={selectedCategory}
                                            categories={categories}
                                        />
                                    ))}
                                </div>
                            </TabsContent>
                            <TabsContent value="pending">
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {Array.from({ length: Number(marketCount) }, (_, index) => (
                                        <MarketCard 
                                            key={index} 
                                            index={index}
                                            filter="pending"
                                            selectedCategory={selectedCategory}
                                            categories={categories}
                                        />
                                    ))}
                                </div>
                            </TabsContent>
                            <TabsContent value="resolved">
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {Array.from({ length: Number(marketCount) }, (_, index) => (
                                        <MarketCard 
                                            key={index} 
                                            index={index}
                                            filter="resolved"
                                            selectedCategory={selectedCategory}
                                            categories={categories}
                                        />
                                    ))}
                                </div>
                            </TabsContent>
                        </>
                    )}
                </Tabs>
            </div>
            <Footer />
        </div>
    );
}