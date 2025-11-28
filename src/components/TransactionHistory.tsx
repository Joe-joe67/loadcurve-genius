import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

type Transaction = {
  id: string;
  asset_id: string;
  percent_traded: number;
  price_per_percent: number;
  total_price: number;
  transaction_type: string;
  created_at: string;
  asset: {
    name: string;
    type: string;
  };
};

export const TransactionHistory = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("transactions")
      .select("*, asset:assets(name, type)")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading transactions:", error);
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No transactions yet. Start trading to see your history!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Percentage</TableHead>
              <TableHead className="text-right">Price per %</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell>
                  {format(new Date(tx.created_at), "MMM dd, yyyy HH:mm")}
                </TableCell>
                <TableCell className="font-medium">{tx.asset.name}</TableCell>
                <TableCell>
                  <Badge variant={tx.transaction_type === "buy" ? "default" : "secondary"}>
                    {tx.transaction_type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {Number(tx.percent_traded).toFixed(2)}%
                </TableCell>
                <TableCell className="text-right">
                  ${Number(tx.price_per_percent).toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-bold">
                  ${Number(tx.total_price).toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
