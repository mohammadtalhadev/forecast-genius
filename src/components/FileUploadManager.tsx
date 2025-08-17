
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, FileText, Calendar, Package, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UploadFile {
  id: string;
  filename: string;
  upload_date: string;
  product_count: number;
  status: string;
  file_size: number | null;
}

const FileUploadManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUploadFiles();
    }
  }, [user]);

  const fetchUploadFiles = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('upload_files')
        .select('*')
        .eq('user_id', user.id)
        .order('upload_date', { ascending: false });

      if (error) throw error;
      setUploadFiles(data || []);
    } catch (error) {
      console.error('Error fetching upload files:', error);
      toast({
        title: "Error",
        description: "Failed to fetch upload history",
        variant: "destructive"
      });
    }
  };

  const deleteFile = async (fileId: string, filename: string) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Delete related data first
      const { error: salesError } = await supabase
        .from('sales_data')
        .delete()
        .eq('user_id', user.id);

      const { error: productsError } = await supabase
        .from('products')
        .delete()
        .eq('user_id', user.id);

      const { error: forecastError } = await supabase
        .from('forecast_data')
        .delete()
        .eq('user_id', user.id);

      const { error: inventoryError } = await supabase
        .from('inventory_metrics')
        .delete()
        .eq('user_id', user.id);

      const { error: geminiError } = await supabase
        .from('gemini_insights')
        .delete()
        .eq('user_id', user.id);

      // Delete the file record
      const { error: fileError } = await supabase
        .from('upload_files')
        .delete()
        .eq('id', fileId);

      if (salesError || productsError || forecastError || inventoryError || geminiError || fileError) {
        throw new Error('Failed to delete file and related data');
      }

      toast({
        title: "File deleted",
        description: `${filename} and all related data have been removed`,
      });

      fetchUploadFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      ['date', 'productName', 'quantitySold', 'unitPrice', 'sku', 'category'],
      ['2024-01-15', 'iPhone 15 Pro', '5', '999.99', 'IPH-15-PRO', 'Electronics'],
      ['2024-01-15', 'MacBook Air M2', '2', '1199.00', 'MBA-M2-13', 'Electronics'],
      ['2024-01-16', 'AirPods Pro', '8', '249.99', 'APP-2GEN', 'Electronics'],
      ['2024-01-16', 'iPad Pro', '3', '799.00', 'IPD-PRO-11', 'Electronics'],
      ['2024-01-17', 'Apple Watch Series 9', '6', '399.99', 'AW-S9-45', 'Electronics'],
      ['2024-01-18', 'Samsung Galaxy S24', '4', '899.99', 'SGS-24-128', 'Electronics'],
      ['2024-01-19', 'Nike Air Max 270', '12', '130.00', 'NAM-270-BLK', 'Footwear'],
      ['2024-01-20', 'Adidas Ultraboost 22', '8', '180.00', 'AUB-22-WHT', 'Footwear']
    ];

    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_sales_data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please log in to manage upload files.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>File Upload History</span>
              </CardTitle>
              <CardDescription>
                Manage your uploaded CSV files and their associated data
              </CardDescription>
            </div>
            <Button onClick={downloadSampleCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download Sample CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {uploadFiles.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Files Uploaded</h3>
              <p className="text-gray-600">Upload your first CSV file to get started with AI forecasting.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {uploadFiles.map((file) => (
                  <Card key={file.id} className="relative">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{file.filename}</h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {new Date(file.upload_date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteFile(file.id, file.filename)}
                          disabled={isLoading}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Products:</span>
                          <div className="flex items-center space-x-1">
                            <Package className="w-3 h-3 text-blue-500" />
                            <span className="text-sm font-medium">{file.product_count}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Size:</span>
                          <span className="text-sm font-medium">{formatFileSize(file.file_size)}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Status:</span>
                          <Badge 
                            className={
                              file.status === 'processed' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }
                          >
                            {file.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Total Files Uploaded: {uploadFiles.length}</span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Total Products: {uploadFiles.reduce((sum, file) => sum + file.product_count, 0)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FileUploadManager;
