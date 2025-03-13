// src/components/CreatePredictionForm.tsx
"use client";

import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"; // Assuming Shadcn Dialog
import { toast } from "sonner"; // Sonner for toasts

interface CreatePredictionFormProps {
    open: boolean;
    setOpen: (open: boolean) => void;
}

export function CreatePredictionForm({ open, setOpen }: CreatePredictionFormProps) {
    const account = useActiveAccount();
    const [formData, setFormData] = useState({
        question: "",
        option1: "",
        option2: "",
        link: "",
        category: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        if (!formData.question || !formData.option1 || !formData.option2 || !formData.category) {
            toast("Submission Failed", {
                description: "Please fill in all required fields.",
                style: { background: "#fee2e2", color: "#dc2626" },
            });
            return;
        }

        const submission = {
            ...formData,
            submitter: account?.address || "anonymous",
        };
        console.log("Prediction submitted:", submission);

        toast("Prediction Submitted for Review", {
            description: "Your prediction has been submitted and will be reviewed within 12-24 hours.",
            duration: 5000,
        });
        setOpen(false);
        setFormData({ question: "", option1: "", option2: "", link: "", category: "" }); // Reset form
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create a Prediction</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="question" className="block text-sm font-medium">Question</label>
                        <Input
                            id="question"
                            name="question"
                            value={formData.question}
                            onChange={handleChange}
                            placeholder="e.g., Will Bitcoin hit $100K?"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="option1" className="block text-sm font-medium">Option 1</label>
                        <Input
                            id="option1"
                            name="option1"
                            value={formData.option1}
                            onChange={handleChange}
                            placeholder="e.g., Yes"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="option2" className="block text-sm font-medium">Option 2</label>
                        <Input
                            id="option2"
                            name="option2"
                            value={formData.option2}
                            onChange={handleChange}
                            placeholder="e.g., No"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="link" className="block text-sm font-medium">Supporting Link</label>
                        <Input
                            id="link"
                            name="link"
                            value={formData.link}
                            onChange={handleChange}
                            placeholder="e.g., https://example.com/news"
                        />
                    </div>
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium">Category</label>
                        <Input
                            id="category"
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            placeholder="e.g., Crypto"
                            required
                        />
                    </div>
                    <p className="text-sm text-gray-500">Approval takes 12-24 hours.</p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit}>Submit</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}