import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SquarePen, Brain, Send, StopCircle, Zap, Cpu } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchModeSelector, SearchMode } from "./SearchModeSelector";

// Updated InputFormProps
interface InputFormProps {
  onSubmit: (inputValue: string, effort: string, model: string, searchMode: SearchMode) => void;
  onCancel: () => void;
  isLoading: boolean;
  hasHistory: boolean;
  searchMode: SearchMode;
  setSearchMode: (mode: SearchMode) => void;
}

export const InputForm: React.FC<InputFormProps> = ({
  onSubmit,
  onCancel,
  isLoading,
  hasHistory,
  searchMode,
  setSearchMode,
}) => {
  const [internalInputValue, setInternalInputValue] = useState("");
  const [effort, setEffort] = useState("medium");
  const [model, setModel] = useState("gemini-2.5-flash");

  const handleInternalSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!internalInputValue.trim()) return;
    onSubmit(internalInputValue, effort, model, searchMode);
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
      {/* Search Mode Selector */}
      <SearchModeSelector 
        searchMode={searchMode}
        onSearchModeChange={setSearchMode}
        disabled={isLoading}
      />

      <form onSubmit={handleInternalSubmit} className="space-y-4">
                 {/* Main input container - Gemini style */}
         <div className="relative w-full max-w-3xl mx-auto">
           <div className="relative flex items-center bg-card border border-border rounded-full shadow-sm hover:shadow-md transition-shadow duration-200 min-h-[56px] px-6 py-2">
             <Textarea
               value={internalInputValue}
               onChange={(e) => setInternalInputValue(e.target.value)}
               onKeyDown={handleKeyDown}
               placeholder="Ask me anything..."
               className="flex-1 resize-none border-0 bg-transparent text-base placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 py-2 pl-2 pr-0 min-h-[24px] max-h-[200px]"
               rows={1}
               disabled={isLoading}
             />
             <Button
               type="submit"
               onClick={handleInternalSubmit}
               disabled={isLoading || !internalInputValue.trim()}
               size="sm"
               className="ml-3 h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground p-0 shrink-0"
             >
               <Send className="h-4 w-4" />
             </Button>
           </div>
         </div>

        {/* Controls Row - Only show for search modes, positioned below main input */}
        {searchMode !== "no-search" && (
          <div className="flex gap-3 justify-center max-w-2xl mx-auto">
            <div className="flex-1 max-w-xs">
              <Select value={effort} onValueChange={setEffort} disabled={isLoading}>
                <SelectTrigger className="h-9 bg-card border-border rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="low">Low Effort{searchMode === "deep" ? " (8 queries, 15 loops)" : ""}</SelectItem>
                  <SelectItem value="medium">Medium Effort{searchMode === "deep" ? " (10 queries, 15 loops)" : ""}</SelectItem>
                  <SelectItem value="high">High Effort{searchMode === "deep" ? " (12 queries, 15 loops)" : ""}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 max-w-xs">
              <Select value={model} onValueChange={setModel} disabled={isLoading}>
                <SelectTrigger className="h-9 bg-card border-border rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
                  <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                  <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* New search button */}
        {hasHistory && (
          <div className="flex justify-center">
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
