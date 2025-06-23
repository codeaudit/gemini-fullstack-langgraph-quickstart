import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import { Clock, AlertTriangle, Search, Zap, Brain, MessageSquare } from "lucide-react";

export type SearchMode = "no-search" | "standard" | "deep";

interface SearchModeSelectorProps {
  searchMode: SearchMode;
  onSearchModeChange: (mode: SearchMode) => void;
  disabled?: boolean;
}

export function SearchModeSelector({ searchMode, onSearchModeChange, disabled = false }: SearchModeSelectorProps) {
  const [showDeepResearchDialog, setShowDeepResearchDialog] = useState(false);
  const [pendingMode, setPendingMode] = useState<SearchMode | null>(null);

  const handleModeChange = (mode: SearchMode) => {
    if (mode === "deep" && searchMode !== "deep") {
      // Show confirmation dialog when switching to deep research
      setPendingMode(mode);
      setShowDeepResearchDialog(true);
    } else {
      // Direct change for no-search and standard modes
      onSearchModeChange(mode);
    }
  };

  const confirmDeepResearch = () => {
    if (pendingMode) {
      onSearchModeChange(pendingMode);
      setPendingMode(null);
    }
    setShowDeepResearchDialog(false);
  };

  const cancelDeepResearch = () => {
    setPendingMode(null);
    setShowDeepResearchDialog(false);
  };

  const getModeIcon = (mode: SearchMode) => {
    switch (mode) {
      case "no-search":
        return <Brain className="h-4 w-4" />;
      case "standard":
        return <Search className="h-4 w-4" />;
      case "deep":
        return <Zap className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getModeLabel = (mode: SearchMode) => {
    switch (mode) {
      case "no-search":
        return "No Search";
      case "standard":
        return "Standard Search";
      case "deep":
        return "Deep Research";
      default:
        return "Select Mode";
    }
  };

  const getModeDescription = (mode: SearchMode) => {
    switch (mode) {
      case "no-search":
        return "LLM knowledge only";
      case "standard":
        return "Web search enabled";
      case "deep":
        return "Comprehensive research";
      default:
        return "";
    }
  };

  return (
    <>
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex flex-col space-y-3 p-4 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm">
          <div className="flex items-center justify-center space-x-2 py-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Research Mode</span>
          </div>
          
          <Select value={searchMode} onValueChange={handleModeChange} disabled={disabled}>
            <SelectTrigger className="w-full bg-card border-border rounded-xl h-16 hover:bg-card/80 transition-colors py-4">
              <div className="flex items-center space-x-3">
                {getModeIcon(searchMode)}
                <div className="flex flex-col text-left py-1">
                  <span className="text-sm font-medium">{getModeLabel(searchMode)}</span>
                  <span className="text-xs text-muted-foreground">{getModeDescription(searchMode)}</span>
                </div>
              </div>
            </SelectTrigger>
            <SelectContent className="bg-card border-border rounded-xl shadow-lg">
              <SelectItem value="no-search" className="py-4">
                <div className="flex items-center space-x-3 py-1">
                  <Brain className="h-4 w-4 text-blue-500" />
                  <div className="flex flex-col">
                    <span className="font-medium">No Search</span>
                    <span className="text-xs text-muted-foreground">Use LLM knowledge only (fastest)</span>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="standard" className="py-4">
                <div className="flex items-center space-x-3 py-1">
                  <Search className="h-4 w-4 text-green-500" />
                  <div className="flex flex-col">
                    <span className="font-medium">Standard Search</span>
                    <span className="text-xs text-muted-foreground">Web research with moderate depth (2-5 min)</span>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="deep" className="py-4">
                <div className="flex items-center space-x-3 py-1">
                  <Zap className="h-4 w-4 text-orange-500" />
                  <div className="flex flex-col">
                    <span className="font-medium">Deep Research</span>
                    <span className="text-xs text-muted-foreground">Comprehensive analysis (5-15 min)</span>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {searchMode === "deep" && (
            <div className="flex items-center justify-center space-x-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 rounded-lg py-2">
              <Zap className="h-3 w-3" />
              <span>Deep Research Active</span>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showDeepResearchDialog} onOpenChange={setShowDeepResearchDialog}>
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

            <div className="grid grid-cols-1 gap-4 text-sm">
              <div className="space-y-3">
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-700 dark:text-blue-400 flex items-center space-x-1">
                    <Brain className="h-4 w-4" />
                    <span>No Search Mode:</span>
                  </h4>
                  <ul className="space-y-1 text-muted-foreground text-xs ml-5">
                    <li>• Uses LLM knowledge only</li>
                    <li>• Instant responses</li>
                    <li>• No web research</li>
                    <li>• Knowledge cutoff limitations</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-green-700 dark:text-green-400 flex items-center space-x-1">
                    <Search className="h-4 w-4" />
                    <span>Standard Search:</span>
                  </h4>
                  <ul className="space-y-1 text-muted-foreground text-xs ml-5">
                    <li>• 1-5 search queries</li>
                    <li>• Up to 10 research loops</li>
                    <li>• Basic source validation</li>
                    <li>• Faster completion (2-5 min)</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-orange-700 dark:text-orange-400 flex items-center space-x-1">
                    <Zap className="h-4 w-4" />
                    <span>Deep Research:</span>
                  </h4>
                  <ul className="space-y-1 text-muted-foreground text-xs ml-5">
                    <li>• 8-12 initial search queries</li>
                    <li>• Up to 15 research loops</li>
                    <li>• Cross-reference validation</li>
                    <li>• Source credibility analysis</li>
                    <li>• Comprehensive fact-checking</li>
                  </ul>
                </div>
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