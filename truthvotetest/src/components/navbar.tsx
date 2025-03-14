// src/components/navbar.tsx
import { createThirdwebClient } from "thirdweb";
import { ConnectButton, lightTheme, useActiveAccount } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { sepolia } from "thirdweb/chains";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreatePredictionForm } from "./CreatePredictionForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "2379aac3fbf5c0eeda20f0e96947328b",
});

const wallets = [
  inAppWallet({
    auth: {
      options: ["google", "email", "x", "passkey", "facebook"],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("io.zerion.wallet"),
];

const ADMIN_ADDRESSES = [
  "0x50864E907632D310D19280bD972ceC1d5b2fbBf3", // Existing admin
  "0x82C002854d3de56b2089d0FD6346fFEF33e10c95", // New admin
];

export function Navbar() {
  const account = useActiveAccount();
  const [openCreate, setOpenCreate] = useState(false);
  const [openAdmin, setOpenAdmin] = useState(false);
  const [bannerUrl, setBannerUrl] = useState("");

  console.log("Connected account:", account?.address);

  const handleBannerSubmit = async () => {
    if (!account || !ADMIN_ADDRESSES.includes(account.address) || !bannerUrl) return;

    try {
      const response = await fetch("/api/banner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: account.address, bannerUrl }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      console.log("Banner updated:", data);
      setOpenAdmin(false);
      setBannerUrl("");
    } catch (error) {
      console.error("Error updating banner:", error);
    }
  };

  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold">TruthVote</h1>
      <div className="items-center flex gap-2">
        {account && (
          <Button
            onClick={() => setOpenCreate(true)}
            variant="default"
            className="h-8"
          >
            Create
          </Button>
        )}
        {account && ADMIN_ADDRESSES.includes(account.address) && (
          <Button
            onClick={() => setOpenAdmin(true)}
            variant="default"
            className="h-8"
          >
            Admin
          </Button>
        )}
        <ConnectButton
          client={client}
          wallets={wallets}
          chain={sepolia}
          theme={lightTheme()}
          connectModal={{ size: "compact" }}
          connectButton={{
            style: {
              height: "2.25rem",
              width: "3.75rem",
              fontSize: "0.875rem",
            },
            label: "Connect",
          }}
          detailsButton={{
            displayBalanceToken: {
              [sepolia.id]: "0xD48C5Aa57Aedf48a2DEc248F8bBE8bFC4A56d642",
            },
          }}
          accountAbstraction={{
            chain: sepolia,
            sponsorGas: true,
          }}
        />
      </div>
      <CreatePredictionForm open={openCreate} setOpen={setOpenCreate} />
      <Dialog open={openAdmin} onOpenChange={setOpenAdmin}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin: Change Banner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter new banner URL"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
            />
            <Button onClick={handleBannerSubmit}>Submit</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}