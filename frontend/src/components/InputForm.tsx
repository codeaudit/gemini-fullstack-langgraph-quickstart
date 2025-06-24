import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SquarePen, Brain, Send, StopCircle, Zap, Cpu, Search, Settings } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchModeSelector, SearchMode } from "./SearchModeSelector";
import { FlowType } from "./FlowSelector";

// Updated InputFormProps
interface InputFormProps {
  onSubmit: (inputValue: string, effort: string, model: string, searchMode: SearchMode, flowType?: FlowType) => void;
  onCancel: () => void;
  isLoading: boolean;
  hasHistory: boolean;
  searchMode: SearchMode;
  setSearchMode: (mode: SearchMode) => void;
  flowType?: FlowType;
  setFlowType?: (flow: FlowType) => void;
}

export const InputForm: React.FC<InputFormProps> = ({
  onSubmit,
  onCancel,
  isLoading,
  hasHistory,
  searchMode,
  setSearchMode,
  flowType,
  setFlowType,
}) => {
  const [internalInputValue, setInternalInputValue] = useState("");
  const [effort, setEffort] = useState("medium");
  const [model, setModel] = useState("gemini-2.5-flash");

  const handleInternalSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!internalInputValue.trim()) return;
    onSubmit(internalInputValue, effort, model, searchMode, flowType);
    setInternalInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit with Ctrl+Enter (Windows/Linux) or Cmd+Enter (Mac)
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleInternalSubmit();
    }
  };

  const isSubmitDisabled = !internalInputValue.trim() || isLoading;

  return (
    <div className="w-full space-y-6">
      <form onSubmit={handleInternalSubmit} className="space-y-4">
        {/* Main input container - larger with buttons inside */}
        <div className="relative w-full">
          <div className="relative bg-muted/30 border border-border/40 rounded-3xl shadow-sm hover:shadow-md transition-shadow duration-200 min-h-[180px] p-4">
            
            {/* Multi-Agent Research System Toggle - inside container with outline */}
            {setFlowType && (
              <div className="absolute top-4 right-4 z-10">
                <div className={`flex items-center space-x-3 px-4 py-2 rounded-3xl border-2 backdrop-blur-sm transition-all duration-200 ${
                  flowType === "multi-agent" 
                    ? "bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-blue-500 shadow-lg" 
                    : "bg-muted/40 border-border/60"
                }`}>
                  <span className="text-xs text-muted-foreground font-medium tracking-wide whitespace-nowrap">MULTI-AGENT RESEARCH SYSTEM</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFlowType(flowType === "multi-agent" ? "single-agent" : "multi-agent")}
                    className={`h-7 px-3 rounded-2xl text-xs font-medium transition-all duration-200 border ${
                      flowType === "multi-agent" 
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 border-blue-500 text-white hover:from-blue-700 hover:to-purple-700" 
                        : "bg-background border-border text-muted-foreground hover:bg-muted/50"
                    }`}
                    disabled={isLoading}
                  >
                    {flowType === "multi-agent" ? "ON" : "OFF"}
                  </Button>
                </div>
              </div>
            )}
            
            <Textarea
              value={internalInputValue}
              onChange={(e) => setInternalInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI anything..."
              className="w-full resize-none border-0 bg-transparent text-lg placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 pt-4 pb-16 pr-80 pl-4 min-h-[100px] max-h-[120px]"
              rows={4}
              disabled={isLoading}
            />
            
            {/* Start Button - inside container at bottom right */}
            <div className="absolute bottom-4 right-4 z-10">
              <Button
                type="submit"
                onClick={handleInternalSubmit}
                disabled={isLoading || !internalInputValue.trim()}
                className="h-10 px-6 rounded-2xl bg-muted-foreground hover:bg-muted-foreground/80 text-background font-medium flex items-center gap-2 shadow-md border border-border/20"
              >
                {isLoading ? (
                  <>
                    <StopCircle className="h-4 w-4" />
                    Stop
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    start
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Three compact dropdowns below input */}
        <div className="flex items-center gap-4 mt-4">
          {/* Research Mode Dropdown */}
          <Select 
            value={searchMode === "no-search" ? "none" : searchMode === "deep" ? "deep" : "regular"} 
            onValueChange={(value) => setSearchMode(value === "none" ? "no-search" : value === "deep" ? "deep" : "standard")} 
            disabled={isLoading}
          >
            <SelectTrigger className="w-auto h-10 bg-muted/20 border border-border/40 rounded-2xl px-4 text-sm">
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="none">
                <div className="flex items-center space-x-2">
                  <Brain className="h-4 w-4" />
                  <span>None</span>
                </div>
              </SelectItem>
              <SelectItem value="regular">
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4" />
                  <span>Regular</span>
                </div>
              </SelectItem>
              <SelectItem value="deep">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4" />
                  <span>Deep Research</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Model Dropdown */}
          <Select value={model} onValueChange={setModel} disabled={isLoading}>
            <SelectTrigger className="w-auto h-10 bg-muted/20 border border-border/40 rounded-2xl px-4 text-sm">
              <div className="flex items-center space-x-2">
                <Cpu className="h-4 w-4" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="gemini-2.0-flash">GPT 4.1 nano</SelectItem>
              <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
              <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
            </SelectContent>
          </Select>

          {/* Knowledge Base Dropdown */}
          <Select value={effort} onValueChange={setEffort} disabled={isLoading}>
            <SelectTrigger className="w-auto h-10 bg-muted/20 border border-border/40 rounded-2xl px-4 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="low">Low Effort</SelectItem>
              <SelectItem value="medium">Medium Effort</SelectItem>
              <SelectItem value="high">High Effort</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* New search button */}
        {hasHistory && (
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-full"
              onClick={() => window.location.reload()}
            >
              <SquarePen className="h-3.5 w-3.5" />
              <span className="text-sm">New Search</span>
            </Button>
          </div>
        )}
      </form>
    </div>
  );
};
