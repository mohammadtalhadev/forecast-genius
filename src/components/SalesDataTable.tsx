
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Search, RefreshCw, Download } from "lucide-react";

interface SalesDataRow {
  id: string;
  date: string;
  quantity_sold: number;
  unit_price: number;
  product_name: string;
  total_revenue: number;
  sku?: string;
  category?: string;
  supplier?: string;
  region?: string;
  cost_price?: number;
}

const SalesDataTable = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [salesData, setSalesData] = useState<SalesDataRow[]>([]);
  const [filteredData, setFilteredData] = useState<SalesDataRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currency, setCurrency] = useState<'USD' | 'PKR'>('USD');
  const rowsPerPage = 50; // Increased to show more data

  useEffect(() => {
    if (user) {
      fetchUserCurrency();
      fetchSalesData();
    }
  }, [user]);

  useEffect(() => {
    // Filter data based on search term
    if (searchTerm.trim() === "") {
      setFilteredData(salesData);
    } else {
      const filtered = salesData.filter(row =>
        row.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.date.includes(searchTerm) ||
        (row.sku && row.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (row.category && row.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (row.supplier && row.supplier.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredData(filtered);
    }
    setCurrentPage(1); // Reset to first page when filtering
  }, [salesData, searchTerm]);

  const fetchUserCurrency = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('notification_settings')
        .select('currency')
        .eq('user_id', user.id)
        .single();
      
      if (data?.currency) {
        setCurrency(data.currency as 'USD' | 'PKR');
      }
    } catch (error) {
      console.log('No currency setting found, using default USD');
    }
  };

  const fetchSalesData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch sales data with product details
      const { data: salesData, error: salesError } = await supabase
        .from('sales_data')
        .select(`
          id,
          date,
          quantity_sold,
          unit_price,
          products!inner (
            name,
            sku,
            category,
            supplier,
            cost_price
          )
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(10000); // Support up to 10,000 entries

      if (salesError) throw salesError;

      // Also fetch raw uploads for additional data
      const { data: rawData } = await supabase
        .from('raw_uploads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10000);

      const formattedSalesData = salesData?.map(item => ({
        id: item.id,
        date: item.date,
        quantity_sold: item.quantity_sold,
        unit_price: item.unit_price,
        product_name: (item.products as any)?.name || 'Unknown Product',
        total_revenue: item.quantity_sold * item.unit_price,
        sku: (item.products as any)?.sku || '',
        category: (item.products as any)?.category || '',
        supplier: (item.products as any)?.supplier || '',
        cost_price: (item.products as any)?.cost_price || 0
      })) || [];

      // Add raw upload data if available
      const formattedRawData = rawData?.map((item, index) => ({
        id: `raw_${item.id}`,
        date: item.date || new Date().toISOString().split('T')[0],
        quantity_sold: item.quantitysold || 0,
        unit_price: item.unitprice || 0,
        product_name: item.productname || 'Unknown Product',
        total_revenue: (item.quantitysold || 0) * (item.unitprice || 0),
        sku: '',
        category: '',
        supplier: '',
        cost_price: 0
      })) || [];

      const allData = [...formattedSalesData, ...formattedRawData];
      setSalesData(allData);
    } catch (error) {
      console.error('Error fetching sales data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch sales data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    const symbol = currency === 'PKR' ? 'Rs.' : '$';
    const multiplier = currency === 'PKR' ? 280 : 1; // Convert USD to PKR if needed
    return `${symbol}${(amount * multiplier).toLocaleString()}`;
  };

  const exportToCSV = () => {
    if (filteredData.length === 0) {
      toast({
        title: "No data to export",
        description: "There's no data available to export.",
        variant: "destructive"
      });
      return;
    }

    const headers = ['Date', 'Product Name', 'SKU', 'Category', 'Supplier', 'Quantity Sold', 'Unit Price', 'Cost Price', 'Total Revenue'];
    const csvData = [
      headers,
      ...filteredData.map(row => [
        row.date,
        row.product_name,
        row.sku || '',
        row.category || '',
        row.supplier || '',
        row.quantity_sold.toString(),
        (row.unit_price * (currency === 'PKR' ? 280 : 1)).toFixed(2),
        ((row.cost_price || 0) * (currency === 'PKR' ? 280 : 1)).toFixed(2),
        (row.total_revenue * (currency === 'PKR' ? 280 : 1)).toFixed(2)
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sales_data_export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: `Exported ${filteredData.length} sales records to CSV`,
    });
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  const totalRevenue = filteredData.reduce((sum, row) => sum + row.total_revenue, 0);
  const totalQuantity = filteredData.reduce((sum, row) => sum + row.quantity_sold, 0);

  if (!user) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Sales Data Records</CardTitle>
            <CardDescription>
              View and manage your uploaded sales data ({salesData.length} total records) - Currency: {currency}
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={fetchSalesData} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {salesData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No sales data found. Upload a CSV file to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900">Total Records</h4>
                <div className="text-2xl font-bold text-blue-800">{filteredData.length}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-900">Total Quantity</h4>
                <div className="text-2xl font-bold text-green-800">{totalQuantity.toLocaleString()}</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-semibold text-purple-900">Total Revenue</h4>
                <div className="text-2xl font-bold text-purple-800">{formatCurrency(totalRevenue)}</div>
              </div>
            </div>

            {/* Search */}
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search by product name, SKU, category, supplier, or date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>

            {/* Data Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Cost Price</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentData.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.date}</TableCell>
                      <TableCell className="font-medium">{row.product_name}</TableCell>
                      <TableCell>{row.sku || '-'}</TableCell>
                      <TableCell>{row.category || '-'}</TableCell>
                      <TableCell>{row.supplier || '-'}</TableCell>
                      <TableCell className="text-right">{row.quantity_sold}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.unit_price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.cost_price || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.total_revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} records
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                      if (page > totalPages) return null;
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SalesDataTable;
