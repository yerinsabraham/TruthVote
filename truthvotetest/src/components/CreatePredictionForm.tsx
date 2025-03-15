// ~/truthvotemainn/truthvotetest/src/components/CreatePredictionForm.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSendAndConfirmTransaction } from "thirdweb/react";
import { contract } from "@/constants/contracts";
import { prepareContractCall } from "thirdweb";
import { toast } from "sonner";

interface CreatePredictionFormProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function CreatePredictionForm({ open, setOpen }: CreatePredictionFormProps) {
  const [question, setQuestion] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [link, setLink] = useState("");
  const [category, setCategory] = useState("");
  const [endDate, setEndDate] = useState("");
  const { mutate: sendAndConfirmTx, isPending } = useSendAndConfirmTransaction();

  const handleSubmit = async () => {
    if (!question || !optionA || !optionB || !link || !category || !endDate) {
      toast.error("All fields are required.");
      return;
    }

    const selectedDate = new Date(endDate);
    const now = new Date();
    if (selectedDate <= now) {
      toast.error("End date must be in the future.");
      return;
    }

    const durationInSeconds = Math.floor((selectedDate.getTime() - now.getTime()) / 1000);
    if (durationInSeconds <= 0) {
      toast.error("Duration must be positive.");
      return;
    }

    try {
      const transaction = prepareContractCall({
        contract,
        method: "function createMarket(string _question, string _optionA, string _optionB, uint256 _duration, string _link, uint256 _categoryId)",
        params: [question, optionA, optionB, BigInt(durationInSeconds), link, BigInt(0)], // Assuming category as text, adjust if numeric
      });

      await sendAndConfirmTx(transaction);
      toast.success("Market created successfully! Submission lasts 24-48 hours before approval.");
      setOpen(false);
      setQuestion("");
      setOptionA("");
      setOptionB("");
      setLink("");
      setCategory("");
      setEndDate("");
    } catch (error) {
      console.error("Error creating market:", error);
      toast.error("Failed to create market.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Prediction</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="question">Question</Label>
            <Input
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., Will it rain this afternoon?"
            />
          </div>
          <div>
            <Label htmlFor="optionA">Option A</Label>
            <Input
              id="optionA"
              value={optionA}
              onChange={(e) => setOptionA(e.target.value)}
              placeholder="e.g., Yes"
            />
          </div>
          <div>
            <Label htmlFor="optionB">Option B</Label>
            <Input
              id="optionB"
              value={optionB}
              onChange={(e) => setOptionB(e.target.value)}
              placeholder="e.g., No"
            />
          </div>
          <div>
            <Label htmlFor="link">Link to support the prediction</Label>
            <Input
              id="link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="e.g., https://example.com (link to support the market)"
            />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Weather"
            />
          </div>
          <div>
            <Label htmlFor="endDate">End Date (MM/DD/YYYY)</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="e.g., 03/15/2025"
              className="w-full"
            />
          </div>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Creating..." : "Create"}
          </Button>
          <p className="text-sm text-gray-500">
            Submission lasts 24-48 hours before approval.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}