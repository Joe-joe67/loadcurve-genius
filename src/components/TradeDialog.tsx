import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type Asset = {
  id: string;
  name: string;
  type: string;
  price_per_percent: number;
};

type TradeDialogProps = {
  asset: Asset;
  mode: "buy" | "sell";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentOwnership: number;
  onTradeComplete: () => void;
};

export const TradeDialog = ({
  asset,
  mode,
  open,
  onOpenChange,
  currentOwnership,
  onTradeComplete,
}: TradeDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [percentage, setPercentage] = useState("");

  const handleTrade = async () => {
    const percent = parseFloat(percentage);
    
    if (isNaN(percent) || percent <= 0) {
      toast({
        title: "Invalid input",
        description: "Please enter a valid percentage",
        variant: "destructive",
      });
      return;
    }

    if (mode === "sell" && percent > currentOwnership) {
      toast({
        title: "Insufficient ownership",
        description: `You only own ${currentOwnership.toFixed(2)}% of this asset`,
        variant: "destructive",
      });
      return;
    }

    if (percent > 100) {
      toast({
        title: "Invalid percentage",
        description: "Percentage cannot exceed 100%",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("execute-trade", {
        body: {
          assetId: asset.id,
          userId: user.id,
          percentage: percent,
          mode: mode,
          pricePerPercent: asset.price_per_percent,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: "Trade successful!",
        description: `You ${mode === "buy" ? "bought" : "sold"} ${percent}% of ${asset.name}`,
      });

      setPercentage("");
      onTradeComplete();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Trade failed",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalCost = parseFloat(percentage) * asset.price_per_percent || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "buy" ? "Buy" : "Sell"} {asset.name}
          </DialogTitle>
          <DialogDescription>
            {mode === "buy"
              ? "Enter the percentage you want to buy"
              : `You own ${currentOwnership.toFixed(2)}%. Enter the percentage you want to sell.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="percentage">Percentage (%)</Label>
            <Input
              id="percentage"
              type="number"
              min="0"
              max={mode === "sell" ? currentOwnership : 100}
              step="0.01"
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Price per %:</span>
              <span className="font-medium">${asset.price_per_percent}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span>Total {mode === "buy" ? "Cost" : "Value"}:</span>
              <span className="text-primary">${totalCost.toFixed(2)}</span>
            </div>
          </div>

          <Button
            onClick={handleTrade}
            disabled={loading || !percentage}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "buy" ? "Buy" : "Sell"} {percentage}%
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
