import { useState, useRef } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (content: string) => void;
  isLoading: boolean;
}

export const FileUpload = ({ onFileSelect, isLoading }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      onFileSelect(content);
    };
    reader.readAsText(file);
  };

  return (
    <Card
      className={cn(
        "p-8 border-2 border-dashed transition-all duration-300 cursor-pointer hover:border-primary",
        isDragging && "border-primary bg-primary/5",
        isLoading && "opacity-50 pointer-events-none"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileInput}
        className="hidden"
      />
      
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        {isLoading ? (
          <>
            <Loader2 className="h-16 w-16 text-primary animate-spin" />
            <p className="text-lg font-medium">Analyzing load curve...</p>
            <p className="text-sm text-muted-foreground">This may take a moment</p>
          </>
        ) : fileName ? (
          <>
            <FileText className="h-16 w-16 text-primary" />
            <p className="text-lg font-medium">{fileName}</p>
            <Button variant="outline" size="sm">
              Change File
            </Button>
          </>
        ) : (
          <>
            <Upload className="h-16 w-16 text-muted-foreground" />
            <div>
              <p className="text-lg font-medium">Upload Load Curve Data</p>
              <p className="text-sm text-muted-foreground mt-2">
                Drag and drop your CSV file here, or click to browse
              </p>
            </div>
            <Button variant="default">Select CSV File</Button>
          </>
        )}
      </div>
    </Card>
  );
};