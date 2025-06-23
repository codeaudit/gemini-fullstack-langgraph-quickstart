import { useState } from "react";
import { Switch } from "./ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import { Clock, AlertTriangle, Search, Zap } from "lucide-react";

interface DeepResearchToggleProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
}

export function DeepResearchToggle({ isEnabled, onToggle, disabled = false }: DeepResearchToggleProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleToggle = (checked: boolean) => {
    if (checked && !isEnabled) {
      // Show confirmation dialog when enabling deep research
      setShowConfirmDialog(true);
    } else if (!checked && isEnabled) {
      // Directly disable without confirmation
      onToggle(false);
    }
  };

  const confirmDeepResearch = () => {
    onToggle(true);
    setShowConfirmDialog(false);
  };

  const cancelDeepResearch = () => {
    setShowConfirmDialog(false);
  };

  return (
    <>
      <div className="flex items-center space-x-3 p-3 rounded-lg border bg-card">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Deep Research Mode</span>
        </div>
        <Switch 
          checked={isEnabled} 
          onCheckedChange={handleToggle}
          disabled={disabled}
        />
        {isEnabled && (
          <div className="flex items-center space-x-1 text-xs text-orange-600 dark:text-orange-400">
            <Zap className="h-3 w-3" />
            <span>Active</span>
          </div>
        )}
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>Enable Deep Research Mode?</span>
            </DialogTitle>
            <DialogDescription>
              Deep Research Mode provides comprehensive analysis but takes significantly longer to complete.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert variant="warning">
              <Clock className="h-4 w-4" />
              <AlertTitle>Extended Processing Time</AlertTitle>
              <AlertDescription>
                This mode may take 5-15 minutes to complete depending on the complexity of your query.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-green-700 dark:text-green-400">Deep Research Features:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• 8-10 initial search queries</li>
                  <li>• Up to 15 research loops</li>
                  <li>• Cross-reference validation</li>
                  <li>• Source credibility analysis</li>
                  <li>• Comprehensive fact-checking</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-blue-700 dark:text-blue-400">Standard Research:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• 3-5 initial search queries</li>
                  <li>• Up to 3 research loops</li>
                  <li>• Basic source validation</li>
                  <li>• Faster completion (2-5 min)</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={cancelDeepResearch}>
              Cancel
            </Button>
            <Button onClick={confirmDeepResearch} className="bg-orange-600 hover:bg-orange-700 text-white">
              Enable Deep Research
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 