import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, RotateCcw, ArrowLeft, Settings, Search, Brain, Download, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SavePromptsModal } from "@/components/SavePromptsModal";
import { LoadPromptsModal } from "@/components/LoadPromptsModal";
import type { AllPrompts } from "@/lib/promptUtils";

interface ConfigurationPageProps {
  onBack: () => void;
}

// Flow-specific prompt interfaces
interface DefaultFlowPrompts {
  route_search_mode?: string | null;
  direct_llm_response?: string | null;
  generate_query: string;
  web_research: string;
  reflection: string;
  validate_sources?: string | null;
  finalize_answer: string;
}

interface AnthropicFlowPrompts {
  lead_agent_orchestrator: string;
  search_subagent: string;
  citations_subagent: string;
  finalize_multi_agent_report: string;
}

interface FlowSpecificPrompts {
  default_flow: DefaultFlowPrompts;
  anthropic_flow: AnthropicFlowPrompts;
}

interface LegacyPromptConfig {
  direct_prompt_template: string;
}

export function ConfigurationPage({ onBack }: ConfigurationPageProps) {
  const [flowPrompts, setFlowPrompts] = useState<FlowSpecificPrompts>({
    default_flow: {
      generate_query: "",
      web_research: "",
      reflection: "",
      finalize_answer: ""
    },
    anthropic_flow: {
      lead_agent_orchestrator: "",
      search_subagent: "",
      citations_subagent: "",
      finalize_multi_agent_report: ""
    }
  });

  const [noSearchPrompt, setNoSearchPrompt] = useState<string>("");
  const [originalFlowPrompts, setOriginalFlowPrompts] = useState<FlowSpecificPrompts>({
    default_flow: {
      generate_query: "",
      web_research: "",
      reflection: "",
      finalize_answer: ""
    },
    anthropic_flow: {
      lead_agent_orchestrator: "",
      search_subagent: "",
      citations_subagent: "",
      finalize_multi_agent_report: ""
    }
  });
  const [originalNoSearchPrompt, setOriginalNoSearchPrompt] = useState<string>("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [activeTab, setActiveTab] = useState<"default" | "anthropic" | "nosearch">("default");
  const [selectedPrompt, setSelectedPrompt] = useState<string>("generate_query");
  
  // Modal states
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);

  // Tab definitions
  const flowTabs = [
    {
      id: "default" as const,
      label: "Default Flow",
      icon: Settings,
      description: "Single-agent research system with web search"
    },
    {
      id: "anthropic" as const,
      label: "Anthropic Flow", 
      icon: Brain,
      description: "Multi-agent research system with specialized roles"
    },
    {
      id: "nosearch" as const,
      label: "No Search",
      icon: Search,
      description: "Direct AI response without web research"
    }
  ];

  // Prompt definitions for each flow
  const defaultFlowPrompts = [
    {
      id: "generate_query",
      label: "Query Generation",
      description: "Controls how search queries are generated from user questions",
      variables: ["{current_date}", "{research_topic}", "{number_queries}"]
    },
    {
      id: "web_research", 
      label: "Web Research",
      description: "Guides how web search results are analyzed and summarized",
      variables: ["{current_date}", "{research_topic}"]
    },
    {
      id: "reflection",
      label: "Reflection",
      description: "Determines how the AI identifies knowledge gaps and generates follow-up queries",
      variables: ["{research_topic}", "{summaries}"]
    },
    {
      id: "finalize_answer",
      label: "Answer Generation", 
      description: "Controls how the final comprehensive answer is generated",
      variables: ["{current_date}", "{research_topic}", "{summaries}"]
    }
  ];

  const anthropicFlowPrompts = [
    {
      id: "lead_agent_orchestrator",
      label: "Lead Agent",
      description: "Research planning and delegation to specialized subagents", 
      variables: ["{current_date}", "{research_topic}"]
    },
    {
      id: "search_subagent",
      label: "Subagent",
      description: "Specialized research subagents for gathering information",
      variables: ["{current_date}", "{search_query}"]
    },
    {
      id: "citations_subagent",
      label: "Citations Agent",
      description: "Adding proper citations to research reports",
      variables: ["{synthesized_text}", "{sources_gathered}"]
    },
    {
      id: "finalize_multi_agent_report",
      label: "Report Synthesis",
      description: "Final synthesis of all subagent research into comprehensive report",
      variables: ["{current_date}", "{research_topic}"]
    }
  ];

  // Load prompts on component mount
  useEffect(() => {
    loadFlowPrompts();
    loadNoSearchPrompt();
  }, []);

  // Set default selected prompt when tab changes
  useEffect(() => {
    if (activeTab === "default") {
      setSelectedPrompt("generate_query");
    } else if (activeTab === "anthropic") {
      setSelectedPrompt("lead_agent_orchestrator");
    }
  }, [activeTab]);

  const loadFlowPrompts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.DEV ? "http://localhost:2024" : "http://localhost:8123"}/api/flow-prompts`);
      if (response.ok) {
        const loadedPrompts = await response.json();
        setFlowPrompts(loadedPrompts);
        setOriginalFlowPrompts(loadedPrompts);
      } else {
        throw new Error("Failed to fetch flow prompts from server");
      }
    } catch (error) {
      console.error("Failed to load flow prompts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNoSearchPrompt = async () => {
    try {
      const response = await fetch(`${import.meta.env.DEV ? "http://localhost:2024" : "http://localhost:8123"}/api/prompts`);
      if (response.ok) {
        const legacyPrompts: LegacyPromptConfig = await response.json();
        setNoSearchPrompt(legacyPrompts.direct_prompt_template || "");
        setOriginalNoSearchPrompt(legacyPrompts.direct_prompt_template || "");
      }
    } catch (error) {
      console.error("Failed to load no search prompt:", error);
    }
  };

  const saveFlowPrompts = async () => {
    setIsLoading(true);
    setSaveStatus("idle");
    try {
      const response = await fetch(`${import.meta.env.DEV ? "http://localhost:2024" : "http://localhost:8123"}/api/flow-prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flowPrompts)
      });
      
      if (response.ok) {
        setOriginalFlowPrompts(flowPrompts);
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        throw new Error("Failed to save flow prompts to server");
      }
    } catch (error) {
      console.error("Failed to save flow prompts:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const saveNoSearchPrompt = async () => {
    setIsLoading(true);
    setSaveStatus("idle");
    try {
      // Get current legacy prompts first
      const getResponse = await fetch(`${import.meta.env.DEV ? "http://localhost:2024" : "http://localhost:8123"}/api/prompts`);
      if (!getResponse.ok) throw new Error("Failed to get current prompts");
      
      const currentPrompts = await getResponse.json();
      const updatedPrompts = {
        ...currentPrompts,
        direct_prompt_template: noSearchPrompt
      };

      const response = await fetch(`${import.meta.env.DEV ? "http://localhost:2024" : "http://localhost:8123"}/api/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPrompts)
      });
      
      if (response.ok) {
        setOriginalNoSearchPrompt(noSearchPrompt);
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        throw new Error("Failed to save no search prompt to server");
      }
    } catch (error) {
      console.error("Failed to save no search prompt:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAllPrompts = async () => {
    await Promise.all([saveFlowPrompts(), saveNoSearchPrompt()]);
  };

  const resetToDefaults = async () => {
    setIsLoading(true);
    try {
      // Reset flow prompts
      const flowResponse = await fetch(`${import.meta.env.DEV ? "http://localhost:2024" : "http://localhost:8123"}/api/flow-prompts/reset`, {
        method: 'POST'
      });
      
      // Reset legacy prompts 
      const legacyResponse = await fetch(`${import.meta.env.DEV ? "http://localhost:2024" : "http://localhost:8123"}/api/prompts/reset`, {
        method: 'POST'
      });
      
      if (flowResponse.ok && legacyResponse.ok) {
        const flowDefaults = await flowResponse.json();
        const legacyDefaults = await legacyResponse.json();
        
        setFlowPrompts(flowDefaults);
        setOriginalFlowPrompts(flowDefaults);
        setNoSearchPrompt(legacyDefaults.direct_prompt_template || "");
        setOriginalNoSearchPrompt(legacyDefaults.direct_prompt_template || "");
        
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        throw new Error("Failed to reset prompts on server");
      }
    } catch (error) {
      console.error("Failed to reset prompts:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const revertChanges = () => {
    setFlowPrompts(originalFlowPrompts);
    setNoSearchPrompt(originalNoSearchPrompt);
  };

  const hasChanges = JSON.stringify(flowPrompts) !== JSON.stringify(originalFlowPrompts) || 
                    noSearchPrompt !== originalNoSearchPrompt;

  const getCurrentPromptValue = () => {
    if (activeTab === "nosearch") {
      return noSearchPrompt;
    } else if (activeTab === "default") {
      return flowPrompts.default_flow[selectedPrompt as keyof DefaultFlowPrompts] || "";
    } else if (activeTab === "anthropic") {
      return flowPrompts.anthropic_flow[selectedPrompt as keyof AnthropicFlowPrompts] || "";
    }
    return "";
  };

  const updateCurrentPromptValue = (value: string) => {
    if (activeTab === "nosearch") {
      setNoSearchPrompt(value);
    } else if (activeTab === "default") {
      setFlowPrompts(prev => ({
        ...prev,
        default_flow: {
          ...prev.default_flow,
          [selectedPrompt]: value
        }
      }));
    } else if (activeTab === "anthropic") {
      setFlowPrompts(prev => ({
        ...prev,
        anthropic_flow: {
          ...prev.anthropic_flow,
          [selectedPrompt]: value
        }
      }));
    }
  };

  const getCurrentPromptConfig = () => {
    if (activeTab === "nosearch") {
      return {
        label: "No Search Mode",
        description: "Template for direct LLM responses without web research",
        variables: ["{current_date}", "{user_question}"]
      };
    } else if (activeTab === "default") {
      return defaultFlowPrompts.find(p => p.id === selectedPrompt) || defaultFlowPrompts[0];
    } else if (activeTab === "anthropic") {
      return anthropicFlowPrompts.find(p => p.id === selectedPrompt) || anthropicFlowPrompts[0];
    }
    return defaultFlowPrompts[0];
  };

  const getAvailablePrompts = () => {
    if (activeTab === "default") return defaultFlowPrompts;
    if (activeTab === "anthropic") return anthropicFlowPrompts;
    return [];
  };

  const handleImportPrompts = async (importedPrompts: AllPrompts) => {
    try {
      // Update flow prompts
      setFlowPrompts({
        default_flow: importedPrompts.default_flow,
        anthropic_flow: importedPrompts.anthropic_flow
      });
      
      // Update no search prompt
      setNoSearchPrompt(importedPrompts.no_search.direct_prompt_template);
      
      // Save to backend
      await Promise.all([
        fetch(`${import.meta.env.DEV ? "http://localhost:2024" : "http://localhost:8123"}/api/flow-prompts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            default_flow: importedPrompts.default_flow,
            anthropic_flow: importedPrompts.anthropic_flow
          })
        }),
        fetch(`${import.meta.env.DEV ? "http://localhost:2024" : "http://localhost:8123"}/api/prompts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...await (await fetch(`${import.meta.env.DEV ? "http://localhost:2024" : "http://localhost:8123"}/api/prompts`)).json(),
            direct_prompt_template: importedPrompts.no_search.direct_prompt_template
          })
        })
      ]);
      
      // Update original states
      setOriginalFlowPrompts({
        default_flow: importedPrompts.default_flow,
        anthropic_flow: importedPrompts.anthropic_flow
      });
      setOriginalNoSearchPrompt(importedPrompts.no_search.direct_prompt_template);
      
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (error) {
      console.error("Failed to import prompts:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const handleImportSingleFlow = async (flowType: 'default' | 'anthropic' | 'nosearch', prompts: any) => {
    try {
      if (flowType === 'default' && prompts.default_flow) {
        // Update only default flow
        const updatedFlowPrompts = {
          ...flowPrompts,
          default_flow: prompts.default_flow
        };
        setFlowPrompts(updatedFlowPrompts);
        
        // Save to backend
        await fetch(`${import.meta.env.DEV ? "http://localhost:2024" : "http://localhost:8123"}/api/flow-prompts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedFlowPrompts)
        });

        setOriginalFlowPrompts(updatedFlowPrompts);
      } else if (flowType === 'anthropic' && prompts.anthropic_flow) {
        // Update only anthropic flow
        const updatedFlowPrompts = {
          ...flowPrompts,
          anthropic_flow: prompts.anthropic_flow
        };
        setFlowPrompts(updatedFlowPrompts);
        
        // Save to backend
        await fetch(`${import.meta.env.DEV ? "http://localhost:2024" : "http://localhost:8123"}/api/flow-prompts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedFlowPrompts)
        });

        setOriginalFlowPrompts(updatedFlowPrompts);
      } else if (flowType === 'nosearch' && prompts.no_search) {
        // Update only no search prompt
        const newPrompt = prompts.no_search.direct_prompt_template;
        setNoSearchPrompt(newPrompt);
        
        // Save to backend
        await fetch(`${import.meta.env.DEV ? "http://localhost:2024" : "http://localhost:8123"}/api/prompts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...await (await fetch(`${import.meta.env.DEV ? "http://localhost:2024" : "http://localhost:8123"}/api/prompts`)).json(),
            direct_prompt_template: newPrompt
          })
        });

        setOriginalNoSearchPrompt(newPrompt);
      }
      
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (error) {
      console.error("Failed to import single flow prompts:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  return (
    <div className="h-full w-full max-w-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="border-b border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Research
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">Flow-Specific Prompts Configuration</h1>
              <p className="text-sm text-muted-foreground">
                Customize AI behavior for each research flow and individual nodes
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={() => setShowSaveModal(true)}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowLoadModal(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            {hasChanges && (
              <Button variant="outline" size="sm" onClick={revertChanges}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Revert Changes
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={resetToDefaults}>
              Reset to Defaults
            </Button>
            <Button 
              onClick={saveAllPrompts} 
              disabled={isLoading || !hasChanges}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
        
        {/* Status Alert */}
        {saveStatus === "success" && (
          <Alert className="mt-4 border-green-200 bg-green-50 text-green-800">
            <AlertDescription>
              Prompts saved successfully! Changes will take effect on the next research session.
            </AlertDescription>
          </Alert>
        )}
        
        {saveStatus === "error" && (
          <Alert className="mt-4 border-red-200 bg-red-50 text-red-800">
            <AlertDescription>
              Failed to save prompts. Please try again.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 w-full max-w-full overflow-hidden">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="h-full w-full max-w-full flex flex-col">
          <div className="border-b border-border px-6 py-4">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              {flowTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger key={tab.id} value={tab.id} className="flex items-center justify-center space-x-2 w-full">
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline truncate">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
          
          <div className="flex-1 w-full max-w-full flex overflow-hidden">
            {flowTabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="flex-1 w-full max-w-full flex h-full m-0 overflow-hidden">
                {tab.id === "nosearch" ? (
                  // No Search Tab - Sidebar + content layout for consistency
                  <>
                    {/* Left Sidebar - No Search Description */}
                    <div className="w-80 min-w-80 max-w-80 border-r border-border p-6 flex-shrink-0">
                      <div className="mb-4 p-4 border border-border rounded-lg">
                        <h3 className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{tab.label}</h3>
                        <p className="text-sm text-muted-foreground mt-2">{tab.description}</p>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg">
                          <h4 className="text-sm font-semibold mb-2">About No Search Mode</h4>
                          <div className="text-xs text-muted-foreground space-y-2 leading-relaxed">
                            <p>
                              No Search mode provides direct AI responses without conducting web research or using external tools.
                            </p>
                            <p>
                              This mode is ideal for:
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                              <li>General knowledge questions</li>
                              <li>Creative writing tasks</li>
                              <li>Quick explanations</li>
                              <li>Conceptual discussions</li>
                            </ul>
                            <p>
                              The AI relies solely on its training data to provide responses, making it faster but without access to current information.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Content - Prompt Editor */}
                    <div className="flex-1 w-0 max-w-full p-6 overflow-hidden">
                      <Card className="h-full w-full max-w-full flex flex-col">
                        <CardHeader className="flex-shrink-0">
                          <CardTitle className="text-lg">No Search Mode Prompt</CardTitle>
                          <CardDescription>Configure the template for direct AI responses without web research</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col min-h-0 w-full max-w-full overflow-hidden">
                          <Textarea
                            value={noSearchPrompt}
                            onChange={(e) => setNoSearchPrompt(e.target.value)}
                            placeholder="Enter no search mode prompt template..."
                            className="flex-1 w-full font-mono text-sm resize-none [field-sizing:initial]"
                            style={{ width: '100%', minWidth: '100%', maxWidth: '100%' }}
                            disabled={isLoading}
                          />
                          <div className="mt-4 p-4 bg-muted rounded-lg flex-shrink-0">
                            <h4 className="text-sm font-medium mb-2">Available Variables:</h4>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div><code>{"{current_date}"}</code> - Current date</div>
                              <div><code>{"{user_question}"}</code> - User's question</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                ) : (
                  // Flow tabs with sidebar navigation
                  <>
                    {/* Left Sidebar - Prompt Navigation */}
                    <div className="w-80 min-w-80 max-w-80 border-r border-border p-6 flex-shrink-0">
                      <div className="mb-4 p-4 border border-border rounded-lg">
                        <h3 className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{tab.label}</h3>
                        <p className="text-sm text-muted-foreground mt-2">{tab.description}</p>
                      </div>
                      
                      <div className="space-y-2">
                        {getAvailablePrompts().map((prompt) => (
                          <Button
                            key={prompt.id}
                            variant={selectedPrompt === prompt.id ? "default" : "ghost"}
                            className="w-full justify-start text-left h-auto py-3 px-4 whitespace-normal min-h-16"
                            onClick={() => setSelectedPrompt(prompt.id)}
                          >
                            <div className="w-full min-w-0">
                              <div className="font-medium leading-tight">{prompt.label}</div>
                              <div className="text-xs text-muted-foreground mt-1 leading-relaxed break-words">
                                {prompt.description}
                              </div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Right Content - Prompt Editor */}
                    <div className="flex-1 w-0 max-w-full p-6 overflow-hidden">
                      <Card className="h-full w-full max-w-full flex flex-col">
                        <CardHeader className="flex-shrink-0">
                          <CardTitle className="text-lg">{getCurrentPromptConfig().label}</CardTitle>
                          <CardDescription>{getCurrentPromptConfig().description}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col min-h-0 w-full max-w-full overflow-hidden">
                          <Textarea
                            value={getCurrentPromptValue()}
                            onChange={(e) => updateCurrentPromptValue(e.target.value)}
                            placeholder={`Enter ${getCurrentPromptConfig().label.toLowerCase()} prompt...`}
                            className="flex-1 w-full font-mono text-sm resize-none [field-sizing:initial]"
                            style={{ width: '100%', minWidth: '100%', maxWidth: '100%' }}
                            disabled={isLoading}
                          />
                          <div className="mt-4 p-4 bg-muted rounded-lg flex-shrink-0">
                            <h4 className="text-sm font-medium mb-2">Available Variables:</h4>
                            <div className="text-xs text-muted-foreground space-y-1">
                              {getCurrentPromptConfig().variables.map((variable) => (
                                <div key={variable}>
                                  <code>{variable}</code> - {getVariableDescription(variable)}
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>

      {/* Modals */}
      <SavePromptsModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        flowPrompts={flowPrompts}
        noSearchPrompt={noSearchPrompt}
        activeTab={activeTab}
      />
      
      <LoadPromptsModal
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        onImport={handleImportPrompts}
        onImportSingleFlow={handleImportSingleFlow}
      />
    </div>
  );
}

function getVariableDescription(variable: string): string {
  const descriptions: Record<string, string> = {
    "{current_date}": "Current date",
    "{user_question}": "User's question",
    "{research_topic}": "Research topic or query",
    "{number_queries}": "Maximum number of queries to generate",
    "{summaries}": "Research summaries from previous steps",
    "{search_query}": "Specific search query for this subagent",
    "{synthesized_text}": "Research text that needs citations",
    "{sources_gathered}": "Available sources for citations"
  };
  return descriptions[variable] || "Variable description";
} 