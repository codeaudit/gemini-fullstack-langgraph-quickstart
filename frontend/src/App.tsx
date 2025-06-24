import { useStream } from "@langchain/langgraph-sdk/react";
import type { Message } from "@langchain/langgraph-sdk";
import { useState, useEffect, useRef, useCallback } from "react";
import { ProcessedEvent } from "@/components/ActivityTimeline";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { ChatMessagesView } from "@/components/ChatMessagesView";
import { ConfigurationPage } from "@/components/ConfigurationPage";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SearchMode } from "@/components/SearchModeSelector";
import { FlowType } from "@/components/FlowSelector";
import { Settings } from "lucide-react";

export default function App() {
  const [processedEventsTimeline, setProcessedEventsTimeline] = useState<
    ProcessedEvent[]
  >([]);
  const [historicalActivities, setHistoricalActivities] = useState<
    Record<string, ProcessedEvent[]>
  >({});
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const hasFinalizeEventOccurredRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>("standard");
  const [flowType, setFlowType] = useState<FlowType>("single-agent");
  const [showConfiguration, setShowConfiguration] = useState(false);
  const thread = useStream<{
    messages: Message[];
    initial_search_query_count: number;
    max_research_loops: number;
    reasoning_model: string;
  }>({
    apiUrl: import.meta.env.DEV
      ? "http://localhost:2024"
      : "http://localhost:2024",
    assistantId: flowType === "multi-agent" ? "multi-agent" : "agent",
    messagesKey: "messages",
    onUpdateEvent: (event: any) => {
      let processedEvent: ProcessedEvent | null = null;
      if (event.generate_query) {
        const title = searchMode === "deep" ? "Generating Comprehensive Queries" : "Generating Search Queries";
        processedEvent = {
          title,
          data: event.generate_query?.search_query?.join(", ") || "",
        };
      } else if (event.web_research) {
        const sources = event.web_research.sources_gathered || [];
        const numSources = sources.length;
        const uniqueLabels = [
          ...new Set(sources.map((s: any) => s.label).filter(Boolean)),
        ];
        const exampleLabels = uniqueLabels.slice(0, 3).join(", ");
        const title = searchMode === "deep" ? "Deep Web Research" : "Web Research";
        processedEvent = {
          title,
          data: `Gathered ${numSources} sources. Related to: ${
            exampleLabels || "N/A"
          }.`,
        };
      } else if (event.reflection) {
        const title = searchMode === "deep" ? "Deep Analysis & Reflection" : "Reflection";
        processedEvent = {
          title,
          data: searchMode === "deep"
            ? "Performing comprehensive analysis and identifying knowledge gaps"
            : "Analysing Web Research Results",
        };
      } else if (event.validate_sources) {
        processedEvent = {
          title: "Validating Sources",
          data: "Cross-referencing information and assessing source credibility",
        };
      } else if (event.finalize_answer) {
        const title = searchMode === "deep" ? "Synthesizing Deep Analysis" : "Finalizing Answer";
        processedEvent = {
          title,
          data: searchMode === "deep"
            ? "Synthesizing comprehensive research into final answer"
            : "Composing and presenting the final answer.",
        };
        hasFinalizeEventOccurredRef.current = true;
      } else if (event.direct_llm_response) {
        processedEvent = {
          title: "Generating Response",
          data: "Using LLM knowledge to answer your question",
        };
        hasFinalizeEventOccurredRef.current = true;
      } else if (event.lead_agent) {
        processedEvent = {
          title: "Lead Agent Planning",
          data: "Orchestrating research plan and delegating to specialized subagents",
        };
      } else if (event.search_subagent) {
        processedEvent = {
          title: "Specialized Search Agents",
          data: "Multiple subagents researching different aspects in parallel",
        };
      } else if (event.citations_subagent) {
        processedEvent = {
          title: "Citations Validation",
          data: "Validating and cross-referencing all sources",
        };
      } else if (event.finalize_report) {
        processedEvent = {
          title: "Multi-Agent Synthesis",
          data: "Synthesizing findings from all specialized agents",
        };
        hasFinalizeEventOccurredRef.current = true;
      }
      if (processedEvent) {
        setProcessedEventsTimeline((prevEvents) => [
          ...prevEvents,
          processedEvent!,
        ]);
      }
    },
    onError: (error: any) => {
      setError(error.message);
    },
  });

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [thread.messages]);

  useEffect(() => {
    if (
      hasFinalizeEventOccurredRef.current &&
      !thread.isLoading &&
      thread.messages.length > 0
    ) {
      const lastMessage = thread.messages[thread.messages.length - 1];
      if (lastMessage && lastMessage.type === "ai" && lastMessage.id) {
        setHistoricalActivities((prev) => ({
          ...prev,
          [lastMessage.id!]: [...processedEventsTimeline],
        }));
      }
      hasFinalizeEventOccurredRef.current = false;
    }
  }, [thread.messages, thread.isLoading, processedEventsTimeline]);

  const handleSubmit = useCallback(
    (submittedInputValue: string, effort: string, model: string, currentSearchMode: SearchMode, currentFlowType?: FlowType) => {
      if (!submittedInputValue.trim()) return;
      setProcessedEventsTimeline([]);
      hasFinalizeEventOccurredRef.current = false;

      // Configure research parameters based on search mode and effort
      let initial_search_query_count = 0;
      let max_research_loops = 0;
      
      if (currentSearchMode === "no-search") {
        // No search mode - direct LLM response
        initial_search_query_count = 0;
        max_research_loops = 0;
      } else if (currentSearchMode === "deep") {
        // Deep research mode settings
        switch (effort) {
          case "low":
            initial_search_query_count = 8;
            max_research_loops = 15;
            break;
          case "medium":
            initial_search_query_count = 10;
            max_research_loops = 15;
            break;
          case "high":
            initial_search_query_count = 12;
            max_research_loops = 15;
            break;
        }
      } else {
        // Standard search mode settings
        switch (effort) {
          case "low":
            initial_search_query_count = 1;
            max_research_loops = 1;
            break;
          case "medium":
            initial_search_query_count = 3;
            max_research_loops = 3;
            break;
          case "high":
            initial_search_query_count = 5;
            max_research_loops = 10;
            break;
        }
      }

      const newMessages: Message[] = [
        ...(thread.messages || []),
        {
          type: "human",
          content: submittedInputValue,
          id: Date.now().toString(),
        },
      ];
      // For now, we'll handle search mode logic in the backend through the parameters
      // The backend will determine the mode based on initial_search_query_count
      thread.submit({
        messages: newMessages,
        initial_search_query_count: initial_search_query_count,
        max_research_loops: max_research_loops,
        reasoning_model: model,
      });
    },
    [thread]
  );

  const handleCancel = useCallback(() => {
    thread.stop();
    window.location.reload();
  }, [thread]);

  if (showConfiguration) {
    return (
      <div className="flex h-screen bg-background text-foreground font-sans antialiased">
        <ConfigurationPage onBack={() => setShowConfiguration(false)} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground font-sans antialiased">
      <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowConfiguration(true)}
          className="opacity-80 hover:opacity-100 h-9 w-9 p-0"
        >
          <Settings className="h-4 w-4" />
        </Button>
        <ThemeToggle />
      </div>
      <main className="h-full w-full max-w-4xl mx-auto">
          {thread.messages.length === 0 ? (
            <WelcomeScreen
              handleSubmit={handleSubmit}
              isLoading={thread.isLoading}
              onCancel={handleCancel}
              searchMode={searchMode}
              setSearchMode={setSearchMode}
              flowType={flowType}
              setFlowType={setFlowType}
            />
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="flex flex-col items-center justify-center gap-4">
                <h1 className="text-2xl text-destructive font-bold">Error</h1>
                <p className="text-destructive">{JSON.stringify(error)}</p>

                <Button
                  variant="destructive"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <ChatMessagesView
              messages={thread.messages}
              isLoading={thread.isLoading}
              scrollAreaRef={scrollAreaRef}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              liveActivityEvents={processedEventsTimeline}
              historicalActivities={historicalActivities}
              searchMode={searchMode}
              setSearchMode={setSearchMode}
              flowType={flowType}
              setFlowType={setFlowType}
            />
          )}
      </main>
    </div>
  );
}
