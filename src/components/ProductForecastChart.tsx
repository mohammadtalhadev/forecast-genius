
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface ProductForecastChartProps {
  product: {
    product_name: string;
    forecast_7d: number;
    forecast_30d: number;
    forecast_90d: number;
    forecast_365d: number;
    confidence_score: number;
    trend_status: string;
  };
  currency: string;
}

const ProductForecastChart = ({ product, currency }: ProductForecastChartProps) => {
  const chartData = [
    { period: '7 Days', forecast: product.forecast_7d, timeframe: 'Short' },
    { period: '30 Days', forecast: product.forecast_30d, timeframe: 'Medium' },
    { period: '90 Days', forecast: product.forecast_90d, timeframe: 'Long' },
    { period: '365 Days', forecast: product.forecast_365d, timeframe: 'Annual' }
  ];

  const getBarColor = (value: number) => {
    if (value < 50) return '#ef4444';
    if (value < 100) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="space-y-4">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip 
              formatter={(value) => [`${value} units`, 'Forecast']}
              labelFormatter={(label) => `Period: ${label}`}
            />
            <Bar dataKey="forecast" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.forecast)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Product:</span>
          <span className="ml-2 font-medium">{product.product_name}</span>
        </div>
        <div>
          <span className="text-gray-600">Confidence:</span>
          <span className="ml-2 font-medium">{product.confidence_score}%</span>
        </div>
        <div>
          <span className="text-gray-600">Trend:</span>
          <span className="ml-2 font-medium capitalize">{product.trend_status}</span>
        </div>
        <div>
          <span className="text-gray-600">Currency:</span>
          <span className="ml-2 font-medium">{currency}</span>
        </div>
      </div>
    </div>
  );
};

export default ProductForecastChart;
