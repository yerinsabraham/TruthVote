'use client';

import { Dashboard } from "@/components/Dashboard";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useState } from "react";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <main className="flex-1 py-8 bg-background">
        <div className="container mx-auto px-4">
          <Dashboard searchQuery={searchQuery} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
