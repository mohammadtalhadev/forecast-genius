import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, X } from "lucide-react";
interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}
const DemoModal = ({
  isOpen,
  onClose
}: DemoModalProps) => {
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>ForecastGenius Demo</span>
            
          </DialogTitle>
          <DialogDescription>
            See how ForecastGenius transforms your sales data into actionable insights
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Video placeholder */}
          <div className="relative aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="w-8 h-8 text-white ml-1" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Demo Video</h3>
              <p className="text-gray-600">Watch how to upload data and get forecasts in 3 minutes</p>
            </div>
          </div>
          
          {/* Demo features */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">📊 Upload & Clean Data</h4>
              <p className="text-sm text-gray-600">See automatic data cleaning and validation in action</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">🔮 AI Forecasting</h4>
              <p className="text-sm text-gray-600">Watch predictions being generated for 365 days</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">📈 Inventory Insights</h4>
              <p className="text-sm text-gray-600">Learn about restock recommendations and alerts</p>
            </div>
          </div>
          
          <div className="flex space-x-4">
            <Button className="flex-1">
              Start Free Trial
            </Button>
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Close Demo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
};
export default DemoModal;