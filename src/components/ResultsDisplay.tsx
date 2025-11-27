import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Battery as BatteryIcon, Sun as SunIcon, Wind as WindIcon, type LucideIcon } from "lucide-react";

interface RecommendedMix {
  PV: number;
  Wind: number;
  Battery: number;
}

interface ResultsDisplayProps {
  result: {
    recommended_mix: RecommendedMix;
  };
}

interface InvestmentItem {
  icon: LucideIcon;
  label: string;
  percentage: number;
  color: string;
  bgColor: string;
}

export const ResultsDisplay = ({ result }: ResultsDisplayProps) => {
  const { PV, Wind, Battery } = result.recommended_mix;

  const items: InvestmentItem[] = [
    {
      icon: SunIcon,
      label: "Solar PV",
      percentage: PV,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      icon: WindIcon,
      label: "Wind Power",
      percentage: Wind,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: BatteryIcon,
      label: "Battery Storage",
      percentage: Battery,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-700">
      <Card>
        <CardHeader>
          <CardTitle>Investment Recommendations</CardTitle>
          <CardDescription>
            Optimized energy mix based on your load curve analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className={`p-3 rounded-full ${item.bgColor}`}>
                  <Icon className={`h-6 w-6 ${item.color}`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{item.label}</p>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color.replace('text-', 'bg-')} transition-all duration-1000 ease-out`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{item.percentage}%</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Raw JSON Result</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};