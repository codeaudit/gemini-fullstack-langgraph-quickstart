import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SquarePen, Brain, Send, StopCircle, Zap, Cpu, Search, Settings, GitBranch, Target } from "lucide-react";
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

        {/* Four compact dropdowns below input */}
        <div className="flex items-start gap-3 mt-4 max-w-full">
          {/* Research Mode Dropdown */}
          <Select 
            value={searchMode === "no-search" ? "none" : searchMode === "deep" ? "deep" : "regular"} 
            onValueChange={(value) => setSearchMode(value === "none" ? "no-search" : value === "deep" ? "deep" : "standard")} 
            disabled={isLoading}
          >
            <SelectTrigger className="flex-1 h-10 bg-muted/20 border border-border/40 rounded-2xl px-4 text-sm">
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4 text-gray-500" />
                <SelectValue>
                  {searchMode === "no-search" ? "None" : searchMode === "deep" ? "Deep Research" : "Regular"}
                </SelectValue>
              </div>
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="none">
                <div className="flex flex-col text-left">
                  <span>None</span>
                  <span className="text-xs text-muted-foreground">Direct AI response without web search</span>
                </div>
              </SelectItem>
              <SelectItem value="regular">
                <div className="flex flex-col text-left">
                  <span>Regular</span>
                  <span className="text-xs text-muted-foreground">Standard web research with fact-checking</span>
                </div>
              </SelectItem>
              <SelectItem value="deep">
                <div className="flex flex-col text-left">
                  <span>Deep Research</span>
                  <span className="text-xs text-muted-foreground">Enhanced research with source validation</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Model Dropdown */}
          <Select value={model} onValueChange={setModel} disabled={isLoading}>
            <SelectTrigger className="flex-1 h-10 bg-muted/20 border border-border/40 rounded-2xl px-4 text-sm">
              <div className="flex items-center space-x-2">
                <Cpu className="h-4 w-4 text-green-500" />
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
            <SelectTrigger className="flex-1 h-10 bg-muted/20 border border-border/40 rounded-2xl px-4 text-sm">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-red-500" />
                <SelectValue>
                  {effort === "low" ? "Low Effort" : effort === "medium" ? "Medium Effort" : "High Effort"}
                </SelectValue>
              </div>
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="low">
                <div className="flex flex-col text-left">
                  <span>Low Effort</span>
                  <span className="text-xs text-muted-foreground">Regular: 1 query, 1 loop | Deep: 8 queries, 15 loops</span>
                </div>
              </SelectItem>
              <SelectItem value="medium">
                <div className="flex flex-col text-left">
                  <span>Medium Effort</span>
                  <span className="text-xs text-muted-foreground">Regular: 3 queries, 3 loops | Deep: 10 queries, 15 loops</span>
                </div>
              </SelectItem>
              <SelectItem value="high">
                <div className="flex flex-col text-left">
                  <span>High Effort</span>
                  <span className="text-xs text-muted-foreground">Regular: 5 queries, 10 loops | Deep: 12 queries, 15 loops</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Flow Type Dropdown */}
          {setFlowType && (
            <Select 
              value={flowType === "multi-agent" ? "anthropic" : "default"} 
              onValueChange={(value) => setFlowType(value === "anthropic" ? "multi-agent" : "single-agent")} 
              disabled={isLoading}
            >
              <SelectTrigger className="flex-1 h-10 bg-muted/20 border border-border/40 rounded-2xl px-4 text-sm">
                <div className="flex items-center space-x-2">
                  <GitBranch className="h-4 w-4 text-orange-500" />
                  <SelectValue>
                    {flowType === "multi-agent" ? "Anthropic Flow" : "Default Flow"}
                  </SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="default">
                  <div className="flex flex-col text-left">
                    <span>Default Flow</span>
                    <span className="text-xs text-muted-foreground">Single agent iterative research</span>
                  </div>
                </SelectItem>
                <SelectItem value="anthropic">
                  <div className="flex flex-col text-left">
                    <span>Anthropic Flow</span>
                    <span className="text-xs text-muted-foreground">Multi-agent parallel research system</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          )}
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
