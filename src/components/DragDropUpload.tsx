import { useState, useRef, DragEvent } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DragDropUploadProps {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
  uploadedFile?: File | null;
  onRemoveFile?: () => void;
}

const DragDropUpload = ({ onFileSelect, isUploading = false, uploadedFile, onRemoveFile }: DragDropUploadProps) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileValidation(file);
    }
  };

  const handleFileValidation = (file: File) => {
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      onFileSelect(file);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileValidation(file);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? "border-blue-500 bg-blue-50"
              : uploadedFile
              ? "border-green-500 bg-green-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />

          {uploadedFile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <FileSpreadsheet className="w-8 h-8 text-green-600" />
                <div className="text-left">
                  <p className="font-medium text-green-900">{uploadedFile.name}</p>
                  <p className="text-sm text-green-600">
                    {(uploadedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                {onRemoveFile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRemoveFile}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {!isUploading && (
                <p className="text-sm text-green-600">
                  File ready for upload. Click "Process & Upload" to continue.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Upload className="w-12 h-12 text-gray-400" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  Drop your CSV file here, or{" "}
                  <button
                    onClick={handleFileSelect}
                    className="text-blue-600 hover:text-blue-700 underline"
                    disabled={isUploading}
                  >
                    browse
                  </button>
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Supports CSV files up to 10MB
                </p>
              </div>
            </div>
          )}

          {dragActive && (
            <div className="absolute inset-0 bg-blue-100 bg-opacity-50 flex items-center justify-center rounded-lg">
              <p className="text-blue-700 font-medium">Drop your CSV file here!</p>
            </div>
          )}
        </div>

        {isUploading && (
          <div className="mt-4">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">Processing file...</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DragDropUpload;