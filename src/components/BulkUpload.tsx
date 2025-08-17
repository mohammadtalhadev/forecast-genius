import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle, AlertCircle, Download, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UploadJob {
  id: string;
  filename: string;
  total_rows: number;
  processed_rows: number;
  failed_rows: number;
  status: string;
  error_log: string | null;
  created_at: string;
  completed_at: string | null;
}

const BulkUpload = () => {
  const { user } = useAuth();
  const [uploadJobs, setUploadJobs] = useState<UploadJob[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchUploadJobs = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('bulk_upload_jobs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch upload jobs",
        variant: "destructive"
      });
    } else {
      setUploadJobs(data || []);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to upload files",
        variant: "destructive"
      });
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Error",
        description: "Please upload a CSV file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      toast({
        title: "Error",
        description: "File size must be less than 50MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Read CSV file
      const text = await file.text();
      const lines = text.split('\n');
      const totalRows = lines.length - 1; // Exclude header

      // Create upload job
      const { data: jobData, error: jobError } = await supabase
        .from('bulk_upload_jobs')
        .insert([{
          filename: file.name,
          total_rows: totalRows,
          status: 'processing',
          user_id: user.id
        }])
        .select()
        .single();

      if (jobError) throw jobError;

      // Parse CSV header
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const requiredFields = ['name', 'sku', 'category', 'cost_price', 'current_price'];
      const missingFields = requiredFields.filter(field => !headers.includes(field));

      if (missingFields.length > 0) {
        await supabase
          .from('bulk_upload_jobs')
          .update({
            status: 'failed',
            error_log: `Missing required fields: ${missingFields.join(', ')}`
          })
          .eq('id', jobData.id);

        toast({
          title: "Error",
          description: `Missing required fields: ${missingFields.join(', ')}`,
          variant: "destructive"
        });
        setIsUploading(false);
        return;
      }

      // Process rows in batches
      const batchSize = 100;
      let processedRows = 0;
      let failedRows = 0;

      for (let i = 1; i < lines.length; i += batchSize) {
        const batch = lines.slice(i, i + batchSize);
        const batchProducts = [];

        for (const line of batch) {
          if (!line.trim()) continue;

          try {
            const values = line.split(',').map(v => v.trim());
            const product: any = { user_id: user.id };

            headers.forEach((header, index) => {
              if (values[index] !== undefined) {
                product[header] = values[index];
              }
            });

            // Validate and convert data types
            if (!product.name || !product.sku) {
              failedRows++;
              continue;
            }

            product.cost_price = parseFloat(product.cost_price) || 0;
            product.current_price = parseFloat(product.current_price) || 0;
            product.is_perishable = product.is_perishable === 'true' || product.is_perishable === '1';
            product.shelf_life_days = parseInt(product.shelf_life_days) || null;

            batchProducts.push(product);
          } catch (error) {
            failedRows++;
          }
        }

        // Insert batch to database
        if (batchProducts.length > 0) {
          const { error } = await supabase
            .from('products')
            .insert(batchProducts);

          if (error) {
            failedRows += batchProducts.length;
          } else {
            processedRows += batchProducts.length;
          }
        }

        // Update progress
        const progress = ((i + batchSize) / lines.length) * 100;
        setUploadProgress(Math.min(progress, 100));

        // Update job status
        await supabase
          .from('bulk_upload_jobs')
          .update({
            processed_rows: processedRows,
            failed_rows: failedRows
          })
          .eq('id', jobData.id);

        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Final job update
      await supabase
        .from('bulk_upload_jobs')
        .update({
          status: 'completed',
          processed_rows: processedRows,
          failed_rows: failedRows,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobData.id);

      toast({
        title: "Success",
        description: `Upload completed! Processed: ${processedRows}, Failed: ${failedRows}`,
      });

      fetchUploadJobs();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process upload",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadTemplate = () => {
    const csvContent = "name,sku,category,cost_price,current_price,is_perishable,shelf_life_days\n" +
                      "Sample Product,SP001,Electronics,25.99,39.99,false,\n" +
                      "Fresh Milk,FM001,Dairy,1.50,2.99,true,7\n" +
                      "Wireless Headphones,WH001,Electronics,45.00,79.99,false,";
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'bulk_upload_template.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'processing': return BarChart3;
      case 'failed': return AlertCircle;
      default: return FileText;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please log in to access bulk upload functionality.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>Bulk Upload Products</span>
          </CardTitle>
          <CardDescription>
            Upload thousands of SKUs at once using CSV files. Maximum file size: 50MB
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex-1"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Choose CSV File'}
            </Button>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />

          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing...</span>
                <span>{uploadProgress.toFixed(0)}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">CSV Format Requirements:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Required fields: name, sku, category, cost_price, current_price</li>
              <li>• Optional fields: is_perishable (true/false), shelf_life_days (number)</li>
              <li>• Use comma-separated values</li>
              <li>• Include header row</li>
              <li>• Maximum 10,000 rows per file</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Upload History */}
      <Card>
        <CardHeader>
          <CardTitle>Upload History</CardTitle>
          <CardDescription>
            Track your bulk upload jobs and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {uploadJobs.map((job) => {
              const StatusIcon = getStatusIcon(job.status);
              const successRate = job.total_rows > 0 ? ((job.processed_rows / job.total_rows) * 100).toFixed(1) : 0;
              
              return (
                <div key={job.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <StatusIcon className="w-5 h-5 text-gray-600" />
                      <div>
                        <h4 className="font-semibold">{job.filename}</h4>
                        <p className="text-sm text-gray-600">{formatDate(job.created_at)}</p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(job.status)}>
                      {job.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-sm text-gray-600">Total Rows</div>
                      <div className="text-lg font-semibold">{job.total_rows}</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <div className="text-sm text-green-600">Processed</div>
                      <div className="text-lg font-semibold text-green-800">{job.processed_rows}</div>
                    </div>
                    <div className="bg-red-50 p-3 rounded">
                      <div className="text-sm text-red-600">Failed</div>
                      <div className="text-lg font-semibold text-red-800">{job.failed_rows}</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="text-sm text-blue-600">Success Rate</div>
                      <div className="text-lg font-semibold text-blue-800">{successRate}%</div>
                    </div>
                  </div>

                  {job.status === 'processing' && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progress</span>
                        <span>{job.total_rows > 0 ? ((job.processed_rows / job.total_rows) * 100).toFixed(0) : 0}%</span>
                      </div>
                      <Progress 
                        value={job.total_rows > 0 ? (job.processed_rows / job.total_rows) * 100 : 0} 
                        className="h-2" 
                      />
                    </div>
                  )}

                  {job.error_log && (
                    <div className="bg-red-50 p-3 rounded mb-4">
                      <div className="text-sm text-red-800">
                        <strong>Error:</strong> {job.error_log}
                      </div>
                    </div>
                  )}

                  {job.completed_at && (
                    <div className="text-sm text-gray-600">
                      Completed: {formatDate(job.completed_at)}
                    </div>
                  )}
                </div>
              );
            })}
            {uploadJobs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No upload jobs yet. Upload your first CSV file to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkUpload;
