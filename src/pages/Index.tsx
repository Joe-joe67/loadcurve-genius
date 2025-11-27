import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileUpload } from "@/components/FileUpload";
import { ResultsDisplay } from "@/components/ResultsDisplay";
import { useToast } from "@/hooks/use-toast";
import { Zap } from "lucide-react";

const Index = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleFileSelect = async (fileContent: string) => {
    setIsAnalyzing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-load-curve', {
        body: { fileContent }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data.result);
      toast({
        title: "Analysis Complete",
        description: "Your load curve has been analyzed successfully.",
      });
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze the load curve. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Zap className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Energy Load Curve Analyzer
          </h1>
          <p className="text-muted-foreground text-lg">
            Upload your 15-minute load curve data and get AI-powered investment recommendations
          </p>
        </div>

        <div className="space-y-8">
          <FileUpload onFileSelect={handleFileSelect} isLoading={isAnalyzing} />
          
          {result && <ResultsDisplay result={result} />}
        </div>
      </div>
    </div>
  );
};

export default Index;