import os
from typing import List, Dict, Any
from langchain_core.messages import AIMessage
from langgraph.types import Send
from langgraph.graph import StateGraph, START, END
from langchain_core.runnables import RunnableConfig
from google.genai import Client
from dotenv import load_dotenv

from agent.state import OverallState
from agent.configuration import Configuration
from agent.prompts import get_current_date
from agent.utils import get_research_topic
from langchain_google_genai import ChatGoogleGenerativeAI
from agent.utils import get_citations, resolve_urls

load_dotenv()

if os.getenv("GEMINI_API_KEY") is None:
    raise ValueError("GEMINI_API_KEY is not set")

genai_client = Client(api_key=os.getenv("GEMINI_API_KEY"))


def lead_agent_orchestrator(state: OverallState, config: RunnableConfig) -> dict:
    """
    Lead agent that orchestrates the multi-agent research system.
    Creates a research plan and delegates tasks to specialized subagents.
    """
    configurable = Configuration.from_runnable_config(config)
    research_topic = get_research_topic(state["messages"])
    current_date = get_current_date()
    
    orchestrator_prompt = f"""Current date: {current_date}

You are the Lead Agent (Orchestrator) in a multi-agent research system. Your task is to:

1. Analyze the research query: "{research_topic}"
2. Create a comprehensive research plan by breaking down the query into specialized research areas
3. Plan tasks for different search subagents that will work in parallel

Create a research plan with specialized search tasks.

Research Query: {research_topic}

Respond with a structured research plan."""

    llm = ChatGoogleGenerativeAI(
        model=configurable.query_generator_model,
        temperature=0.7,
        max_retries=2,
        api_key=os.getenv("GEMINI_API_KEY"),
    )
    
    result = llm.invoke(orchestrator_prompt)
    
    # Create subagent tasks for parallel execution
    research_aspects = [
        "Core concepts and definitions",
        "Recent developments and trends", 
        "Expert opinions and analysis",
        "Statistical data and evidence"
    ]
    
    # Store the plan in web_research_result for now (reusing existing field)
    return {
        "web_research_result": [f"Research Plan: {result.content}"],
        "search_query": [f"{research_topic} {aspect}" for aspect in research_aspects]
    }


def continue_to_search_subagents(state: OverallState):
    """Send tasks to multiple search subagents in parallel"""
    return [
        Send("search_subagent", {"search_query": query, "id": idx})
        for idx, query in enumerate(state["search_query"])
    ]


def search_subagent(state: dict, config: RunnableConfig) -> dict:
    """
    Specialized search subagent that focuses on a specific research aspect.
    """
    configurable = Configuration.from_runnable_config(config)
    search_query = state["search_query"]
    agent_id = state["id"]
    
    search_prompt = f"""Current date: {get_current_date()}

You are a specialized Search Subagent #{agent_id}.

Your task is to research: {search_query}

Provide comprehensive information about this specific aspect."""

    # Perform web search using Google Search API
    response = genai_client.models.generate_content(
        model=configurable.query_generator_model,
        contents=search_prompt,
        config={
            "tools": [{"google_search": {}}],
            "temperature": 0,
        },
    )
    
    # Process search results
    resolved_urls = resolve_urls(
        response.candidates[0].grounding_metadata.grounding_chunks, agent_id
    )
    citations = get_citations(response, resolved_urls)
    
    return {
        "sources_gathered": citations,
        "web_research_result": [response.candidates[0].content.parts[0].text]
    }


def citations_subagent(state: OverallState, config: RunnableConfig) -> dict:
    """
    Specialized subagent for managing and validating citations across all research.
    """
    configurable = Configuration.from_runnable_config(config)
    
    citation_prompt = f"""Current date: {get_current_date()}

You are the Citations Subagent. Your task is to:

1. Validate and cross-reference all sources collected from the search subagents
2. Identify the most credible and relevant sources
3. Create a standardized citation format

Sources to process: {len(state.get("sources_gathered", []))} sources found

Analyze the sources and create a clean, validated citation list."""

    llm = ChatGoogleGenerativeAI(
        model=configurable.answer_model,
        temperature=0.3,
        max_retries=2,
        api_key=os.getenv("GEMINI_API_KEY"),
    )
    
    result = llm.invoke(citation_prompt)
    
    # Add citation validation result to web_research_result
    updated_results = list(state.get("web_research_result", []))
    updated_results.append(f"Citation Validation: {result.content}")
    
    return {
        "web_research_result": updated_results
    }


def finalize_multi_agent_report(state: OverallState, config: RunnableConfig) -> dict:
    """
    Final synthesis of all subagent research into a comprehensive report.
    """
    configurable = Configuration.from_runnable_config(config)
    research_topic = get_research_topic(state["messages"])
    
    synthesis_prompt = f"""Current date: {get_current_date()}

You are finalizing a multi-agent research report. You have received specialized research from multiple subagents covering different aspects of: {research_topic}

Research findings from subagents:
{chr(10).join(state.get("web_research_result", []))}

Your task is to:
1. Synthesize all findings into a coherent, comprehensive response
2. Identify key themes and insights across all research aspects
3. Present the information in a well-structured format
4. Include proper citations from the sources
5. Highlight any cross-references or connections between different aspects

Create a final comprehensive research report."""

    llm = ChatGoogleGenerativeAI(
        model=configurable.answer_model,
        temperature=0.2,
        max_retries=2,
        api_key=os.getenv("GEMINI_API_KEY"),
    )
    
    result = llm.invoke(synthesis_prompt)
    
    return {
        "messages": [AIMessage(content=result.content)],
        "sources_gathered": state.get("sources_gathered", [])
    }


# Create the Multi-Agent Research System Graph
def create_multi_agent_graph():
    builder = StateGraph(OverallState, config_schema=Configuration)
    
    # Add nodes
    builder.add_node("lead_agent", lead_agent_orchestrator)
    builder.add_node("search_subagent", search_subagent)
    builder.add_node("citations_subagent", citations_subagent)
    builder.add_node("finalize_report", finalize_multi_agent_report)
    
    # Define the flow
    builder.add_edge(START, "lead_agent")
    
    # Lead agent delegates to multiple search subagents in parallel
    builder.add_conditional_edges(
        "lead_agent",
        continue_to_search_subagents,
        ["search_subagent"]
    )
    
    # After search subagents complete, process citations
    builder.add_edge("search_subagent", "citations_subagent")
    
    # Finally, synthesize the report
    builder.add_edge("citations_subagent", "finalize_report")
    
    # End the flow
    builder.add_edge("finalize_report", END)
    
    return builder.compile(name="multi-agent-research-system")

# Create the graph instance
multi_agent_graph = create_multi_agent_graph() 