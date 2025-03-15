// ~/truthvotemainn/truthvotetest/src/components/CreatePredictionForm.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSendAndConfirmTransaction } from "thirdweb/react";
import { contract } from "@/constants/contracts";
import { prepareContractCall } from "thirdweb";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format as formatDate } from "date-fns"; // Correct ESM import

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
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const { mutate: sendAndConfirmTx, isPending } = useSendAndConfirmTransaction();

  const handleSubmit = async () => {
    if (!question || !optionA || !optionB || !link || !category || !endDate) {
      toast.error("All fields are required.");
      return;
    }

    const now = new Date();
    if (endDate <= now) {
      toast.error("End date must be in the future.");
      return;
    }

    const durationInSeconds = Math.floor((endDate.getTime() - now.getTime()) / 1000);
    if (durationInSeconds <= 0) {
      toast.error("Duration must be positive.");
      return;
    }

    try {
      const transaction = prepareContractCall({
        contract,
        method: "function createMarket(string _question, string _optionA, string _optionB, uint256 _duration, string _link, uint256 _categoryId)",
        params: [question, optionA, optionB, BigInt(durationInSeconds), link, BigInt(category)],
      });

      await sendAndConfirmTx(transaction);
      toast.success("Market created successfully!");
      setOpen(false);
      setQuestion("");
      setOptionA("");
      setOptionB("");
      setLink("");
      setCategory("");
      setEndDate(undefined);
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
            <Label htmlFor="link">Link</Label>
            <Input
              id="link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="e.g., https://example.com"
            />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">General</SelectItem>
                <SelectItem value="1">Sports</SelectItem>
                <SelectItem value="2">Politics</SelectItem>
                {/* Add more categories as needed */}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  {endDate ? formatDate(endDate, "PPP") : "Pick an end date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date: Date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Creating..." : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}