import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, RotateCcw, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ConfigurationPageProps {
  onBack: () => void;
}

interface PromptConfig {
  query_writer_instructions: string;
  web_searcher_instructions: string;
  reflection_instructions: string;
  answer_instructions: string;
  direct_prompt_template: string;
}

export function ConfigurationPage({ onBack }: ConfigurationPageProps) {
  const [prompts, setPrompts] = useState<PromptConfig>({
    query_writer_instructions: "",
    web_searcher_instructions: "",
    reflection_instructions: "",
    answer_instructions: "",
    direct_prompt_template: ""
  });
  
  const [originalPrompts, setOriginalPrompts] = useState<PromptConfig>({
    query_writer_instructions: "",
    web_searcher_instructions: "",
    reflection_instructions: "",
    answer_instructions: "",
    direct_prompt_template: ""
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  // Default prompts (actual prompts from backend)
  const defaultPrompts: PromptConfig = {
    query_writer_instructions: `Your goal is to generate sophisticated and diverse web search queries. These queries are intended for an advanced automated web research tool capable of analyzing complex results, following links, and synthesizing information.

Instructions:
- Always prefer a single search query, only add another query if the original question requests multiple aspects or elements and one query is not enough.
- Each query should focus on one specific aspect of the original question.
- Don't produce more than {number_queries} queries.
- Queries should be diverse, if the topic is broad, generate more than 1 query.
- Don't generate multiple similar queries, 1 is enough.
- Query should ensure that the most current information is gathered. The current date is {current_date}.

Format: 
- Format your response as a JSON object with ALL two of these exact keys:
   - "rationale": Brief explanation of why these queries are relevant
   - "query": A list of search queries

Example:

Topic: What revenue grew more last year apple stock or the number of people buying an iphone
\`\`\`json
{{
    "rationale": "To answer this comparative growth question accurately, we need specific data points on Apple's stock performance and iPhone sales metrics. These queries target the precise financial information needed: company revenue trends, product-specific unit sales figures, and stock price movement over the same fiscal period for direct comparison.",
    "query": ["Apple total revenue growth fiscal year 2024", "iPhone unit sales growth fiscal year 2024", "Apple stock price growth fiscal year 2024"],
}}
\`\`\`

Context: {research_topic}`,

    web_searcher_instructions: `Conduct targeted Google Searches to gather the most recent, credible information on "{research_topic}" and synthesize it into a verifiable text artifact.

Instructions:
- Query should ensure that the most current information is gathered. The current date is {current_date}.
- Conduct multiple, diverse searches to gather comprehensive information.
- Consolidate key findings while meticulously tracking the source(s) for each specific piece of information.
- The output should be a well-written summary or report based on your search findings. 
- Only include the information found in the search results, don't make up any information.

Research Topic:
{research_topic}`,

    reflection_instructions: `You are an expert research assistant analyzing summaries about "{research_topic}".

Instructions:
- Identify knowledge gaps or areas that need deeper exploration and generate a follow-up query. (1 or multiple).
- If provided summaries are sufficient to answer the user's question, don't generate a follow-up query.
- If there is a knowledge gap, generate a follow-up query that would help expand your understanding.
- Focus on technical details, implementation specifics, or emerging trends that weren't fully covered.

Requirements:
- Ensure the follow-up query is self-contained and includes necessary context for web search.

Output Format:
- Format your response as a JSON object with these exact keys:
   - "is_sufficient": true or false
   - "knowledge_gap": Describe what information is missing or needs clarification
   - "follow_up_queries": Write a specific question to address this gap

Example:
\`\`\`json
{{
    "is_sufficient": true, // or false
    "knowledge_gap": "The summary lacks information about performance metrics and benchmarks", // "" if is_sufficient is true
    "follow_up_queries": ["What are typical performance benchmarks and metrics used to evaluate [specific technology]?"] // [] if is_sufficient is true
}}
\`\`\`

Reflect carefully on the Summaries to identify knowledge gaps and produce a follow-up query. Then, produce your output following this JSON format:

Summaries:
{summaries}`,

    answer_instructions: `Generate a high-quality answer to the user's question based on the provided summaries.

Instructions:
- The current date is {current_date}.
- You are the final step of a multi-step research process, don't mention that you are the final step. 
- You have access to all the information gathered from the previous steps.
- You have access to the user's question.
- Generate a high-quality answer to the user's question based on the provided summaries and the user's question.
- Include the sources you used from the Summaries in the answer correctly, use markdown format (e.g. [apnews](https://vertexaisearch.cloud.google.com/id/1-0)). THIS IS A MUST.

User Context:
- {research_topic}

Summaries:
{summaries}`,

    direct_prompt_template: `Current date: {current_date}

Based on your training knowledge, please provide a comprehensive answer to the following question:

{user_question}

Please provide a clear, well-structured response based on your knowledge. If the information might be outdated or you're uncertain about current events, please mention this limitation.

Structure your response with:
1. A clear answer to the question
2. Relevant background context
3. Any important caveats or limitations about the information
4. Note that this response is based on training data and may not include the most recent information

Do not make up specific facts, dates, or statistics that you're not confident about.`
  };

  // Load current prompts on component mount
  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.DEV ? "http://localhost:2024" : "http://localhost:8123"}/api/prompts`);
      if (response.ok) {
        const loadedPrompts = await response.json();
        setPrompts(loadedPrompts);
        setOriginalPrompts(loadedPrompts);
      } else {
        throw new Error("Failed to fetch prompts from server");
      }
    } catch (error) {
      console.error("Failed to load prompts:", error);
      // Fallback to default prompts if API call fails
      setPrompts(defaultPrompts);
      setOriginalPrompts(defaultPrompts);
    } finally {
      setIsLoading(false);
    }
  };

  const savePrompts = async () => {
    setIsLoading(true);
    setSaveStatus("idle");
    try {
      const response = await fetch(`${import.meta.env.DEV ? "http://localhost:2024" : "http://localhost:8123"}/api/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompts)
      });
      
      if (response.ok) {
        setOriginalPrompts(prompts);
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        throw new Error("Failed to save prompts to server");
      }
    } catch (error) {
      console.error("Failed to save prompts:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const resetToDefaults = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.DEV ? "http://localhost:2024" : "http://localhost:8123"}/api/prompts/reset`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const defaults = await response.json();
        setPrompts(defaults);
        setOriginalPrompts(defaults);
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        throw new Error("Failed to reset prompts on server");
      }
    } catch (error) {
      console.error("Failed to reset prompts:", error);
      // Fallback to local defaults
      setPrompts(defaultPrompts);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const revertChanges = () => {
    setPrompts(originalPrompts);
  };

  const hasChanges = JSON.stringify(prompts) !== JSON.stringify(originalPrompts);

  const promptTabs = [
    {
      id: "query_writer",
      label: "Query Generation",
      key: "query_writer_instructions" as keyof PromptConfig,
      description: "Controls how search queries are generated from user questions"
    },
    {
      id: "web_searcher",
      label: "Web Research",
      key: "web_searcher_instructions" as keyof PromptConfig,
      description: "Guides how web search results are analyzed and summarized"
    },
    {
      id: "reflection",
      label: "Reflection",
      key: "reflection_instructions" as keyof PromptConfig,
      description: "Determines how the AI identifies knowledge gaps and generates follow-up queries"
    },
    {
      id: "answer",
      label: "Final Answer",
      key: "answer_instructions" as keyof PromptConfig,
      description: "Controls how the final comprehensive answer is generated"
    },
    {
      id: "direct",
      label: "No Search Mode",
      key: "direct_prompt_template" as keyof PromptConfig,
      description: "Template for direct LLM responses without web research"
    }
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Research
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">System Prompts Configuration</h1>
              <p className="text-sm text-muted-foreground">
                Customize the AI behavior at each stage of the research process
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
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
              onClick={savePrompts} 
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
      <div className="flex-1 p-6 overflow-auto">
        <Tabs defaultValue="query_writer" className="w-full h-full">
          <TabsList className="grid w-full grid-cols-5">
            {promptTabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="text-xs">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <div className="mt-6 h-[calc(100%-4rem)]">
            {promptTabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="h-full">
                <Card className="h-full flex flex-col">
                  <CardHeader className="flex-shrink-0">
                    <CardTitle className="text-lg">{tab.label} Prompt</CardTitle>
                    <CardDescription>{tab.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col min-h-0">
                    <Textarea
                      value={prompts[tab.key]}
                      onChange={(e) => setPrompts(prev => ({
                        ...prev,
                        [tab.key]: e.target.value
                      }))}
                      placeholder={`Enter ${tab.label.toLowerCase()} instructions...`}
                      className="flex-1 font-mono text-sm resize-none"
                      disabled={isLoading}
                    />
                    <div className="mt-4 p-4 bg-muted rounded-lg flex-shrink-0">
                      <h4 className="text-sm font-medium mb-2">Available Variables:</h4>
                      <div className="text-xs text-muted-foreground space-y-1">
                        {tab.key === "query_writer_instructions" && (
                          <>
                            <div><code>{"{current_date}"}</code> - Current date</div>
                            <div><code>{"{research_topic}"}</code> - User's question</div>
                            <div><code>{"{number_queries}"}</code> - Maximum number of queries</div>
                          </>
                        )}
                        {tab.key === "web_searcher_instructions" && (
                          <>
                            <div><code>{"{current_date}"}</code> - Current date</div>
                            <div><code>{"{research_topic}"}</code> - Search query</div>
                          </>
                        )}
                        {tab.key === "reflection_instructions" && (
                          <>
                            <div><code>{"{research_topic}"}</code> - User's question</div>
                            <div><code>{"{summaries}"}</code> - Research summaries</div>
                          </>
                        )}
                        {tab.key === "answer_instructions" && (
                          <>
                            <div><code>{"{current_date}"}</code> - Current date</div>
                            <div><code>{"{research_topic}"}</code> - User's question</div>
                            <div><code>{"{summaries}"}</code> - Research summaries</div>
                          </>
                        )}
                        {tab.key === "direct_prompt_template" && (
                          <>
                            <div><code>{"{current_date}"}</code> - Current date</div>
                            <div><code>{"{user_question}"}</code> - User's question</div>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </div>
  );
} 