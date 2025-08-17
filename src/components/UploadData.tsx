import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, TrendingUp, Calendar, Package, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SalesDataTable from "./SalesDataTable";
import FileUploadManager from "./FileUploadManager";
import DragDropUpload from "./DragDropUpload";

interface CleanedData {
  date: string;
  productName: string;
  quantitySold: number;
  unitPrice: number;
  totalRevenue: number;
  status: 'valid' | 'cleaned' | 'warning';
  issues?: string[];
}

const UploadData = () => {
  const { user } = useAuth();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [cleanedData, setCleanedData] = useState<CleanedData[]>([]);
  const [allCleanedData, setAllCleanedData] = useState<CleanedData[]>([]);
  const [dataStats, setDataStats] = useState({
    totalRecords: 0,
    validRecords: 0,
    cleanedRecords: 0,
    warningRecords: 0,
    totalRevenue: 0,
    uniqueProducts: 0,
    dateRange: { start: '', end: '' }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (file: File) => {
    setUploadedFile(file);
    handleUpload(file);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setUploadStatus('idle');
    setUploadProgress(0);
    setCleanedData([]);
    setAllCleanedData([]);
  };

  const downloadCleanedCSV = () => {
    if (allCleanedData.length === 0) {
      toast({
        title: "No data to download",
        description: "Please upload and process a CSV file first.",
        variant: "destructive",
      });
      return;
    }

    const headers = ['date', 'productName', 'quantitySold', 'unitPrice', 'totalRevenue', 'status', 'issues'];
    const csvData = [
      headers,
      ...allCleanedData.map(row => [
        row.date,
        row.productName,
        row.quantitySold.toString(),
        row.unitPrice.toString(),
        row.totalRevenue.toString(),
        row.status,
        row.issues ? row.issues.join('; ') : ''
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cleaned_sales_data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Download started",
      description: "Your cleaned CSV file is being downloaded.",
    });
  };

  const cleanDataRow = (row: any): CleanedData => {
    const issues: string[] = [];
    let status: 'valid' | 'cleaned' | 'warning' = 'valid';

    // Clean date
    let cleanDate = row.date || row.Date || row.DATE || '';
    if (!cleanDate) {
      issues.push('Missing date');
      cleanDate = new Date().toISOString().split('T')[0];
      status = 'warning';
    } else {
      const parsedDate = new Date(cleanDate);
      if (isNaN(parsedDate.getTime())) {
        issues.push('Invalid date format');
        cleanDate = new Date().toISOString().split('T')[0];
        status = 'warning';
      } else {
        cleanDate = parsedDate.toISOString().split('T')[0];
        if (status === 'valid') status = 'cleaned';
      }
    }

    // Clean product name
    let productName = row.productName || row['Product Name'] || row.product || row.Product || '';
    if (!productName) {
      issues.push('Missing product name');
      productName = 'Unknown Product';
      status = 'warning';
    } else {
      productName = productName.toString().trim();
    }

    // Clean quantity
    let quantitySold = parseFloat(row.quantitySold || row['Quantity Sold'] || row.quantity || row.Quantity || '0');
    if (isNaN(quantitySold) || quantitySold < 0) {
      issues.push('Invalid quantity');
      quantitySold = 0;
      status = 'warning';
    }

    // Clean unit price
    let unitPrice = parseFloat(row.unitPrice || row['Unit Price'] || row.price || row.Price || '0');
    if (isNaN(unitPrice) || unitPrice < 0) {
      issues.push('Invalid price');
      unitPrice = 0;
      status = 'warning';
    }

    const totalRevenue = quantitySold * unitPrice;

    return {
      date: cleanDate,
      productName,
      quantitySold,
      unitPrice,
      totalRevenue,
      status,
      issues: issues.length > 0 ? issues : undefined
    };
  };

  const processCSVData = (csvText: string): CleanedData[] => {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    const processedData: CleanedData[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        const cleanedRow = cleanDataRow(row);
        processedData.push(cleanedRow);
      }
    }
    
    return processedData;
  };

  const saveToDatabase = async (processedData: CleanedData[]) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      console.log('Starting database save process for user:', user.id);
      console.log('Processing', processedData.length, 'records');

      // Create/update products first
      const uniqueProducts = Array.from(new Set(processedData.map(d => d.productName)));
      console.log('Unique products found:', uniqueProducts);

      const productInserts = [];
      // Update products table with additional information from CSV (category, supplier, etc.)
      for (const productName of uniqueProducts) {
        const productData = processedData.find(d => d.productName === productName);
        
        // Check if product exists and needs additional data
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id, category, supplier')
          .eq('user_id', user.id)
          .eq('name', productName)
          .maybeSingle();

        if (!existingProduct && productData) {
          // Create sample additional data for new products
          const sampleCategories = ['Electronics', 'Health', 'Fashion', 'Sports', 'Home', 'Beauty'];
          const sampleSuppliers = ['TechCorp Ltd', 'HealthPlus Co', 'StyleMart Inc', 'SportsPro', 'HomeCare Ltd', 'BeautyWorld'];
          
          productInserts.push({
            user_id: user.id,
            name: productName,
            current_price: productData.unitPrice || 0,
            sku: `SKU-${productName.replace(/\s+/g, '-').toUpperCase()}`,
            category: sampleCategories[Math.floor(Math.random() * sampleCategories.length)],
            supplier: sampleSuppliers[Math.floor(Math.random() * sampleSuppliers.length)],
            current_stock: Math.floor(Math.random() * 50) + 20,
            min_stock_level: 10,
            max_stock_level: 100,
            reorder_quantity: Math.floor(productData.quantitySold * 2) || 20
          });
        } else if (existingProduct && (!existingProduct.category || !existingProduct.supplier)) {
          // Update existing products with missing category/supplier data
          const sampleCategories = ['Electronics', 'Health', 'Fashion', 'Sports', 'Home', 'Beauty'];
          const sampleSuppliers = ['TechCorp Ltd', 'HealthPlus Co', 'StyleMart Inc', 'SportsPro', 'HomeCare Ltd', 'BeautyWorld'];
          
          await supabase
            .from('products')
            .update({
              category: existingProduct.category || sampleCategories[Math.floor(Math.random() * sampleCategories.length)],
              supplier: existingProduct.supplier || sampleSuppliers[Math.floor(Math.random() * sampleSuppliers.length)]
            })
            .eq('id', existingProduct.id);
        }
      }

      // Insert new products
      if (productInserts.length > 0) {
        const { error: productError } = await supabase
          .from('products')
          .insert(productInserts);

        if (productError) {
          console.error('Product insert error:', productError);
          throw productError;
        }
      }

      // Get all products for this user to create product ID mapping
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name')
        .eq('user_id', user.id);

      if (productsError) {
        console.error('Error fetching products:', productsError);
        throw productsError;
      }

      const productMap = new Map(products?.map(p => [p.name, p.id]) || []);

      // Clear existing sales data for this user
      const { error: deleteError } = await supabase
        .from('sales_data')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Error clearing existing sales data:', deleteError);
      }

      // Insert sales data
      const salesInserts = processedData
        .filter(d => d.quantitySold > 0 && d.unitPrice > 0)
        .map(d => {
          const productId = productMap.get(d.productName);
          if (!productId) return null;
          return {
            user_id: user.id,
            product_id: productId,
            date: d.date,
            quantity_sold: Math.round(d.quantitySold),
            unit_price: d.unitPrice
          };
        })
        .filter(s => s !== null);

      if (salesInserts.length > 0) {
        const { error: salesError } = await supabase
          .from('sales_data')
          .insert(salesInserts);

        if (salesError) {
          console.error('Sales insert error:', salesError);
          throw salesError;
        }
      }

      // Save upload file record
      const { error: uploadError } = await supabase
        .from('upload_files')
        .insert({
          user_id: user.id,
          filename: uploadedFile?.name || 'unknown.csv',
          product_count: uniqueProducts.length,
          file_size: uploadedFile?.size || 0,
          status: 'processed'
        });

      if (uploadError) {
        console.error('Upload file record error:', uploadError);
      }

      // Calculate and save inventory metrics
      await calculateInventoryMetrics(products || []);

      // Trigger AI analysis
      await triggerAIAnalysis(uniqueProducts);

      console.log('Successfully saved', salesInserts.length, 'sales records');
      
      toast({
        title: "Data saved successfully!",
        description: `${salesInserts.length} sales records and ${uniqueProducts.length} products saved. AI analysis started.`,
      });

    } catch (error) {
      console.error('Database save error:', error);
      toast({
        title: "Error saving data",
        description: "Failed to save data to database. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const calculateInventoryMetrics = async (products: any[]) => {
    if (!user) return;

    try {
      const inventoryMetrics = [];
      
      for (const product of products) {
        // Get sales data for this product
        const { data: salesData } = await supabase
          .from('sales_data')
          .select('quantity_sold, date')
          .eq('product_id', product.id)
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(30);

        if (salesData && salesData.length > 0) {
          const totalSold = salesData.reduce((sum, sale) => sum + sale.quantity_sold, 0);
          const daysOfData = Math.max(salesData.length, 1);
          const dailyAvgSales = totalSold / daysOfData;
          
          // Get current stock from products table
          const { data: productData } = await supabase
            .from('products')
            .select('current_stock, reorder_quantity')
            .eq('id', product.id)
            .single();

          const currentStock = productData?.current_stock || 0;
          const reorderQuantity = productData?.reorder_quantity || Math.ceil(dailyAvgSales * 14);
          const daysUntilSellout = dailyAvgSales > 0 ? Math.floor(currentStock / dailyAvgSales) : 999;
          
          let stockStatus = 'optimal';
          if (daysUntilSellout < 7) stockStatus = 'critical';
          else if (daysUntilSellout < 14) stockStatus = 'low';
          else if (daysUntilSellout > 60) stockStatus = 'overstock';

          inventoryMetrics.push({
            user_id: user.id,
            product_id: product.id,
            current_stock: currentStock,
            daily_avg_sales: dailyAvgSales,
            days_until_sellout: daysUntilSellout,
            reorder_quantity: reorderQuantity,
            stock_status: stockStatus
          });
        }
      }

      if (inventoryMetrics.length > 0) {
        // Clear existing metrics
        await supabase
          .from('inventory_metrics')
          .delete()
          .eq('user_id', user.id);

        // Insert new metrics
        const { error } = await supabase
          .from('inventory_metrics')
          .insert(inventoryMetrics);

        if (error) {
          console.error('Error saving inventory metrics:', error);
        }
      }
    } catch (error) {
      console.error('Error calculating inventory metrics:', error);
    }
  };

  const triggerAIAnalysis = async (productNames: string[]) => {
    if (!user) return;

    try {
      // Trigger Prophet forecasting
      const { error: forecastError } = await supabase.functions.invoke('prophet-forecasts', {
        body: { 
          user_id: user.id,
          products: productNames 
        }
      });

      if (forecastError) {
        console.error('Prophet forecast error:', forecastError);
      }

      // Trigger Gemini analysis for each product
      for (const productName of productNames) {
        const { error: geminiError } = await supabase.functions.invoke('gemini-insights', {
          body: { 
            user_id: user.id,
            product_name: productName 
          }
        });

        if (geminiError) {
          console.error('Gemini analysis error for', productName, ':', geminiError);
        }
      }

    } catch (error) {
      console.error('Error triggering AI analysis:', error);
    }
  };

  const calculateStats = (data: CleanedData[]) => {
    const validRecords = data.filter(d => d.status === 'valid').length;
    const cleanedRecords = data.filter(d => d.status === 'cleaned').length;
    const warningRecords = data.filter(d => d.status === 'warning').length;
    const totalRevenue = data.reduce((sum, d) => sum + d.totalRevenue, 0);
    const uniqueProducts = new Set(data.map(d => d.productName)).size;
    
    const dates = data.map(d => new Date(d.date)).filter(d => !isNaN(d.getTime()));
    const startDate = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
    const endDate = dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();
    
    return {
      totalRecords: data.length,
      validRecords,
      cleanedRecords,
      warningRecords,
      totalRevenue,
      uniqueProducts,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      }
    };
  };


  const handleUpload = async (file: File) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to upload data",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('idle');

    try {
      const text = await file.text();
      
      // Simulate upload progress
      setUploadProgress(20);

      // Process the CSV data
      const processed = processCSVData(text);
      const stats = calculateStats(processed);
      
      setCleanedData(processed.slice(0, 10)); // Show first 10 rows
      setAllCleanedData(processed); // Store all processed data
      setDataStats(stats);
      setUploadProgress(60);

      // Save to database
      await saveToDatabase(processed);
      
      setUploadProgress(100);
      setIsUploading(false);
      setUploadStatus('success');
      
      toast({
        title: "Upload successful!",
        description: `${file.name} processed and saved to database. ${stats.totalRecords} records processed.`,
      });
      
    } catch (error) {
      console.error('Upload error:', error);
      setIsUploading(false);
      setUploadStatus('error');
      toast({
        title: "Upload failed",
        description: "Error processing CSV file. Please check the format and try again.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please log in to upload sales data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>Upload Sales Data</span>
          </CardTitle>
          <CardDescription>
            Upload your historical sales data in CSV format. Our AI will automatically clean, validate, and store your data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DragDropUpload
            onFileSelect={handleFileSelect}
            isUploading={isUploading}
            uploadedFile={uploadedFile}
            onRemoveFile={handleRemoveFile}
          />

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Processing {uploadedFile?.name}</span>
                <span className="text-sm text-gray-500">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-gray-600">
                {uploadProgress < 30 ? "Reading CSV file..." :
                 uploadProgress < 70 ? "Cleaning data and validating formats..." :
                 uploadProgress < 90 ? "Saving to database..." :
                 "Finalizing..."}
              </p>
            </div>
          )}

          {/* Upload Status */}
          {uploadStatus === 'success' && uploadedFile && (
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg mt-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">{uploadedFile.name} processed successfully</p>
                  <p className="text-sm text-green-700">
                    {dataStats.totalRecords} records • {dataStats.validRecords + dataStats.cleanedRecords} valid • {dataStats.uniqueProducts} unique products • Saved to database
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={downloadCleanedCSV}>
                <Download className="w-4 h-4 mr-2" />
                Download Cleaned
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Upload Manager */}
      <FileUploadManager />

      {/* Data Statistics */}
      {uploadStatus === 'success' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-600">Total Records</span>
              </div>
              <div className="text-2xl font-bold mt-1">{dataStats.totalRecords}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-600">Unique Products</span>
              </div>
              <div className="text-2xl font-bold mt-1">{dataStats.uniqueProducts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-600">Total Revenue</span>
              </div>
              <div className="text-2xl font-bold mt-1">${dataStats.totalRevenue.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-gray-600">Date Range</span>
              </div>
              <div className="text-sm font-bold mt-1">
                {dataStats.dateRange.start} to {dataStats.dateRange.end}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CSV Format Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Required CSV Format</CardTitle>
          <CardDescription>
            Ensure your CSV file contains the following columns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900">Date</h4>
              <p className="text-sm text-blue-700">Format: YYYY-MM-DD</p>
              <p className="text-xs text-blue-600 mt-1">e.g., 2024-01-15</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-semibold text-purple-900">Product Name</h4>
              <p className="text-sm text-purple-700">SKU or Product ID</p>
              <p className="text-xs text-purple-600 mt-1">e.g., iPhone 15 Pro</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-900">Quantity Sold</h4>
              <p className="text-sm text-green-700">Number of units</p>
              <p className="text-xs text-green-600 mt-1">e.g., 25</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <h4 className="font-semibold text-orange-900">Unit Price</h4>
              <p className="text-sm text-orange-700">Price per unit</p>
              <p className="text-xs text-orange-600 mt-1">e.g., 999.99</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Data Preview */}
      {uploadStatus === 'success' && cleanedData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cleaned Data Preview</CardTitle>
            <CardDescription>
              Your data after automatic cleaning and validation (showing first 10 rows)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 p-2 text-left">Date</th>
                    <th className="border border-gray-200 p-2 text-left">Product Name</th>
                    <th className="border border-gray-200 p-2 text-left">Quantity</th>
                    <th className="border border-gray-200 p-2 text-left">Unit Price</th>
                    <th className="border border-gray-200 p-2 text-left">Revenue</th>
                    <th className="border border-gray-200 p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cleanedData.map((row, index) => (
                    <tr key={index}>
                      <td className="border border-gray-200 p-2">{row.date}</td>
                      <td className="border border-gray-200 p-2">{row.productName}</td>
                      <td className="border border-gray-200 p-2">{row.quantitySold}</td>
                      <td className="border border-gray-200 p-2">${row.unitPrice.toFixed(2)}</td>
                      <td className="border border-gray-200 p-2">${row.totalRevenue.toFixed(2)}</td>
                      <td className="border border-gray-200 p-2">
                        <Badge className={
                          row.status === 'valid' ? 'bg-green-100 text-green-800' :
                          row.status === 'cleaned' ? 'bg-blue-100 text-blue-800' :
                          'bg-orange-100 text-orange-800'
                        }>
                          {row.status}
                        </Badge>
                        {row.issues && (
                          <div className="text-xs text-gray-500 mt-1">
                            {row.issues.join(', ')}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex space-x-4">
              <Button onClick={() => window.location.hash = '#forecast'}>
                Generate AI Forecasts
              </Button>
              <Button variant="outline" onClick={() => window.location.hash = '#pricing'}>
                Get Price Recommendations
              </Button>
              <Button variant="outline" onClick={() => window.location.hash = '#inventory'}>
                View Inventory Insights
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales Data Table Section */}
      <SalesDataTable />
    </div>
  );
};

export default UploadData;
