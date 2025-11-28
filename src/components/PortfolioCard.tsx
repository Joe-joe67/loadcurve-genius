import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Battery, Wind, Sun } from "lucide-react";

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

type PortfolioCardProps = {
  userAssets: UserAsset[];
};

export const PortfolioCard = ({ userAssets }: PortfolioCardProps) => {
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

  const totalValue = userAssets.reduce(
    (sum, ua) =>
      sum + Number(ua.ownership_percent) * ua.asset.price_per_percent,
    0
  );

  if (userAssets.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            You don't own any assets yet. Visit the marketplace to start trading!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Value</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-primary">${totalValue.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Total value of all owned assets
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {userAssets.map((userAsset) => (
          <Card key={userAsset.id}>
            <img
              src={userAsset.asset.image_url}
              alt={userAsset.asset.name}
              className="w-full h-48 object-cover"
            />
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {getAssetIcon(userAsset.asset.type)}
                  {userAsset.asset.name}
                </CardTitle>
                <Badge variant="secondary">{userAsset.asset.type}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ownership:</span>
                <span className="font-bold text-primary">
                  {Number(userAsset.ownership_percent).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Value:</span>
                <span className="font-medium">
                  $
                  {(
                    Number(userAsset.ownership_percent) *
                    userAsset.asset.price_per_percent
                  ).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Capacity share:</span>
                <span className="font-medium">
                  {(
                    (Number(userAsset.ownership_percent) / 100) *
                    userAsset.asset.total_capacity_kw
                  ).toFixed(2)}{" "}
                  kW
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
