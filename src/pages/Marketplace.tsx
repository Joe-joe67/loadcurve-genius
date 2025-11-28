import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogOut, Battery, Wind, Sun, TrendingUp } from "lucide-react";
import { TradeDialog } from "@/components/TradeDialog";
import { PortfolioCard } from "@/components/PortfolioCard";
import { TransactionHistory } from "@/components/TransactionHistory";

type Asset = {
  id: string;
  name: string;
  type: "PV" | "Wind" | "Battery";
  description: string;
  total_capacity_kw: number;
  location: string;
  price_per_percent: number;
  image_url: string;
};

type UserAsset = {
  id: string;
  asset_id: string;
  ownership_percent: number;
  asset: Asset;
};

const Marketplace = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [userAssets, setUserAssets] = useState<UserAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [tradeMode, setTradeMode] = useState<"buy" | "sell">("buy");
  const [showTradeDialog, setShowTradeDialog] = useState(false);

  useEffect(() => {
    checkAuth();
    loadAssets();
    loadUserAssets();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadAssets = async () => {
    const { data, error } = await supabase
      .from("assets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load assets",
        variant: "destructive",
      });
    } else {
      setAssets(data || []);
    }
    setLoading(false);
  };

  const loadUserAssets = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("user_assets")
      .select("*, asset:assets(*)")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error loading user assets:", error);
    } else {
      setUserAssets(data || []);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const openTradeDialog = (asset: Asset, mode: "buy" | "sell") => {
    setSelectedAsset(asset);
    setTradeMode(mode);
    setShowTradeDialog(true);
  };

  const handleTradeComplete = () => {
    loadUserAssets();
    setShowTradeDialog(false);
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case "PV":
        return <Sun className="h-5 w-5" />;
      case "Wind":
        return <Wind className="h-5 w-5" />;
      case "Battery":
        return <Battery className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const getUserOwnership = (assetId: string) => {
    const userAsset = userAssets.find((ua) => ua.asset_id === assetId);
    return userAsset ? Number(userAsset.ownership_percent) : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Energy Asset Marketplace
          </h1>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="marketplace" className="space-y-6">
          <TabsList>
            <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
            <TabsTrigger value="portfolio">My Portfolio</TabsTrigger>
            <TabsTrigger value="history">Transaction History</TabsTrigger>
          </TabsList>

          <TabsContent value="marketplace" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assets.map((asset) => {
                const ownership = getUserOwnership(asset.id);
                return (
                  <Card key={asset.id} className="overflow-hidden">
                    <img
                      src={asset.image_url}
                      alt={asset.name}
                      className="w-full h-48 object-cover"
                    />
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          {getAssetIcon(asset.type)}
                          {asset.name}
                        </CardTitle>
                        <Badge variant="secondary">{asset.type}</Badge>
                      </div>
                      <CardDescription>{asset.location}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">{asset.description}</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Capacity:</span>
                        <span className="font-medium">{asset.total_capacity_kw} kW</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Price per %:</span>
                        <span className="font-medium">${asset.price_per_percent}</span>
                      </div>
                      {ownership > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Your ownership:</span>
                          <span className="font-bold text-primary">{ownership.toFixed(2)}%</span>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => openTradeDialog(asset, "buy")}
                          className="flex-1"
                        >
                          Buy
                        </Button>
                        {ownership > 0 && (
                          <Button
                            onClick={() => openTradeDialog(asset, "sell")}
                            variant="outline"
                            className="flex-1"
                          >
                            Sell
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="portfolio">
            <PortfolioCard userAssets={userAssets} />
          </TabsContent>

          <TabsContent value="history">
            <TransactionHistory />
          </TabsContent>
        </Tabs>
      </div>

      {selectedAsset && (
        <TradeDialog
          asset={selectedAsset}
          mode={tradeMode}
          open={showTradeDialog}
          onOpenChange={setShowTradeDialog}
          currentOwnership={getUserOwnership(selectedAsset.id)}
          onTradeComplete={handleTradeComplete}
        />
      )}
    </div>
  );
};

export default Marketplace;
