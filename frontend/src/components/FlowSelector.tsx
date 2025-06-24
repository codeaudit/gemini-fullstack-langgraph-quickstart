import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import { Network, Users, Brain, Info, Zap } from "lucide-react"; // Added Zap for Claude icon

export type FlowType = "single-agent" | "multi-agent" | "claude";

interface FlowSelectorProps {
  flowType: FlowType;
  onFlowTypeChange: (flow: FlowType) => void;
  disabled?: boolean;
}

interface FlowInfo {
  id: FlowType;
  name: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  estimatedTime: string;
  complexity: "Simple" | "Advanced";
}

const FLOW_CONFIGS: FlowInfo[] = [
  {
    id: "single-agent",
    name: "Single Agent Research",
    description: "Traditional iterative research with one intelligent agent",
    icon: <Brain className="h-4 w-4" />,
    features: [
      "Iterative web research",
      "Knowledge gap analysis", 
      "Source validation",
      "Coherent final synthesis"
    ],
    estimatedTime: "2-5 minutes",
    complexity: "Simple"
  },
  {
    id: "multi-agent",
    name: "Multi-Agent Research System",
    description: "Advanced parallel research with specialized agents",
    icon: <Network className="h-4 w-4" />,
    features: [
      "Lead agent orchestration",
      "Parallel specialized subagents",
      "Citations validation agent",
      "Memory integration",
      "Cross-reference analysis"
    ],
    estimatedTime: "3-7 minutes",
    complexity: "Advanced"
  },
  {
    id: "claude",
    name: "Claude Research",
    description: "Research powered by Anthropic's Claude model",
    icon: <Zap className="h-4 w-4 text-purple-500" />, // Using Zap icon, styled purple
    features: [
      "Iterative research using Claude",
      "Knowledge synthesis by Claude",
      "Direct LLM mode with Claude",
      "(Web search via placeholder - full integration pending)"
    ],
    estimatedTime: "2-6 minutes", // Placeholder
    complexity: "Simple" // Based on single-agent graph structure
  }
];

export function FlowSelector({ flowType, onFlowTypeChange, disabled = false }: FlowSelectorProps) {
  const [showMultiAgentDialog, setShowMultiAgentDialog] = useState(false);
  const [pendingFlow, setPendingFlow] = useState<FlowType | null>(null);
  const [availableFlows, setAvailableFlows] = useState<Record<string, string>>({});

  useEffect(() => {
    // Fetch available flows from the backend
    fetch('/api/flows')
      .then(res => res.json())
      .then(flows => setAvailableFlows(flows))
      .catch(err => console.error('Failed to fetch flows:', err));
  }, []);

  const handleFlowChange = (flow: FlowType) => {
    if (flow === "multi-agent" && flowType !== "multi-agent") {
      // Show confirmation dialog when switching to multi-agent
      setPendingFlow(flow);
      setShowMultiAgentDialog(true);
    } else {
      // Direct change for single-agent
      onFlowTypeChange(flow);
    }
  };

  const confirmMultiAgent = () => {
    if (pendingFlow) {
      onFlowTypeChange(pendingFlow);
      setPendingFlow(null);
    }
    setShowMultiAgentDialog(false);
  };

  const cancelMultiAgent = () => {
    setPendingFlow(null);
    setShowMultiAgentDialog(false);
  };

  const getCurrentFlow = () => FLOW_CONFIGS.find(f => f.id === flowType) || FLOW_CONFIGS[0];
  const currentFlow = getCurrentFlow();

  return (
    <>
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex flex-col space-y-3 p-4 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm">
          <div className="flex items-center justify-center space-x-2 py-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Research Flow</span>
          </div>
          
          <Select value={flowType} onValueChange={handleFlowChange} disabled={disabled}>
            <SelectTrigger className="w-full bg-card border-border rounded-xl h-20 hover:bg-card/80 transition-colors py-4">
              <div className="flex items-center space-x-3">
                {currentFlow.icon}
                <div className="flex flex-col text-left py-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{currentFlow.name}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      currentFlow.complexity === "Simple" 
                        ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                        : "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
                    }`}>
                      {currentFlow.complexity}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{currentFlow.description}</span>
                </div>
              </div>
            </SelectTrigger>
            <SelectContent className="bg-card border-border rounded-xl shadow-lg max-h-96 overflow-y-auto">
              {FLOW_CONFIGS.map((flow) => (
                <SelectItem key={flow.id} value={flow.id} className="py-6">
                  <div className="flex items-start space-x-3 py-1 w-full">
                    <div className="mt-1">{flow.icon}</div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium">{flow.name}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          flow.complexity === "Simple" 
                            ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
                        }`}>
                          {flow.complexity}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground mb-2">{flow.description}</span>
                      <div className="text-xs text-muted-foreground">
                        <div className="mb-1">⏱️ {flow.estimatedTime}</div>
                        <div className="space-y-1">
                          {flow.features.slice(0, 3).map((feature, idx) => (
                            <div key={idx}>• {feature}</div>
                          ))}
                          {flow.features.length > 3 && (
                            <div>• And {flow.features.length - 3} more features...</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {flowType === "multi-agent" && (
            <div className="flex items-center justify-center space-x-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 rounded-lg py-2">
              <Network className="h-3 w-3" />
              <span>Multi-Agent System Active</span>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showMultiAgentDialog} onOpenChange={setShowMultiAgentDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Network className="h-5 w-5 text-orange-500" />
              <span>Enable Multi-Agent Research System?</span>
            </DialogTitle>
            <DialogDescription>
              This advanced research flow uses multiple specialized agents working in parallel for comprehensive analysis.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Advanced Research Architecture</AlertTitle>
              <AlertDescription>
                The Multi-Agent System orchestrates specialized agents to research different aspects of your query simultaneously.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 gap-4 text-sm">
              <div className="space-y-3">
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-700 dark:text-blue-400 flex items-center space-x-1">
                    <Brain className="h-4 w-4" />
                    <span>Single Agent Research:</span>
                  </h4>
                  <ul className="space-y-1 text-muted-foreground text-xs ml-5">
                    <li>• Sequential iterative research</li>
                    <li>• Single agent handles all tasks</li>
                    <li>• Simpler, faster completion</li>
                    <li>• Good for straightforward queries</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-orange-700 dark:text-orange-400 flex items-center space-x-1">
                    <Network className="h-4 w-4" />
                    <span>Multi-Agent Research System:</span>
                  </h4>
                  <ul className="space-y-1 text-muted-foreground text-xs ml-5">
                    <li>• Lead agent orchestrates research plan</li>
                    <li>• Multiple specialized search subagents work in parallel</li>
                    <li>• Dedicated citations validation agent</li>
                    <li>• Memory integration for context</li>
                    <li>• Cross-reference analysis and synthesis</li>
                    <li>• More comprehensive but takes longer</li>
                  </ul>
                </div>
              </div>
            </div>

            <Alert variant="warning">
              <Network className="h-4 w-4" />
              <AlertTitle>Processing Time</AlertTitle>
              <AlertDescription>
                Multi-Agent research typically takes 3-7 minutes due to the parallel agent coordination and comprehensive analysis.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={cancelMultiAgent}>
              Keep Single Agent
            </Button>
            <Button onClick={confirmMultiAgent} className="bg-orange-600 hover:bg-orange-700">
              Enable Multi-Agent System
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 