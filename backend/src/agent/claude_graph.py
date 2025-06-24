import os

from agent.tools_and_schemas import SearchQueryList, Reflection
from dotenv import load_dotenv
from langchain_core.messages import AIMessage
from langgraph.types import Send
from langgraph.graph import StateGraph
from langgraph.graph import START, END
from langchain_core.runnables import RunnableConfig
# Removed: from google.genai import Client
from langchain_anthropic import ChatAnthropic # Added

from agent.state import (
    OverallState,
    QueryGenerationState,
    ReflectionState,
    WebSearchState,
    ValidationState,
)
from agent.configuration import Configuration
from agent.prompts import (
    get_current_date,
    query_writer_instructions, # Will need review for Claude
    web_searcher_instructions, # Will need review for Claude / placeholder
    reflection_instructions, # Will need review for Claude
    answer_instructions, # Will need review for Claude
)
# Removed: from langchain_google_genai import ChatGoogleGenerativeAI
from agent.utils import (
    # get_citations, # Likely not needed if web_research changes significantly
    get_research_topic,
    # insert_citation_markers, # Likely not needed
    # resolve_urls, # Likely not needed
)

load_dotenv()

# Removed GEMINI_API_KEY check, will add ANTHROPIC_API_KEY check later if needed in this file directly
# Removed: genai_client


# Nodes
def route_search_mode(state: OverallState, config: RunnableConfig):
    """Route to appropriate mode based on initial_search_query_count parameter."""
    initial_search_query_count = state.get("initial_search_query_count", 1)

    # If initial_search_query_count is 0, use direct LLM response (no search mode)
    if initial_search_query_count == 0:
        return "direct_llm_response"
    else:
        return "generate_query"


def direct_llm_response(state: OverallState, config: RunnableConfig):
    """LangGraph node that provides direct LLM response without web search.

    Uses the LLM's training knowledge to answer the user's question directly
    without performing any web research.

    Args:
        state: Current graph state containing the user's question
        config: Configuration for the runnable, including LLM provider settings

    Returns:
        Dictionary with state update, including messages key with the LLM response
    """
    configurable = Configuration.from_runnable_config(config)
    # Use claude_model_name for direct response in Claude graph
    # reasoning_model = state.get("reasoning_model") or configurable.answer_model
    claude_model = configurable.claude_model_name

    if not configurable.anthropic_api_key:
        return {
            "messages": [AIMessage(content="Anthropic API key not configured. Please set the ANTHROPIC_API_KEY environment variable.")],
            "sources_gathered": [],
        }

    # Get the user's question
    user_question = get_research_topic(state["messages"])
    current_date = get_current_date()

    # Load custom prompts
    from agent.prompts import load_custom_prompts
    custom_prompts = load_custom_prompts() # TODO: Consider if prompts need Claude-specific versions

    # Get the direct prompt template (custom or default)
    direct_prompt_template = custom_prompts.get("direct_prompt_template", """Current date: {current_date}

Based on your training knowledge, please provide a comprehensive answer to the following question:

{user_question}

Please provide a clear, well-structured response based on your knowledge. If the information might be outdated or you're uncertain about current events, please mention this limitation.

Structure your response with:
1. A clear answer to the question
2. Relevant background context
3. Any important caveats or limitations about the information
4. Note that this response is based on training data and may not include the most recent information

Do not make up specific facts, dates, or statistics that you're not confident about.""")

    # Create a direct response prompt
    direct_prompt = direct_prompt_template.format(current_date=current_date, user_question=user_question)

    # Initialize the LLM
    llm = ChatAnthropic(
        model_name=claude_model, # Use configured Claude model
        temperature=0.3,
        max_retries=2,
        api_key=configurable.anthropic_api_key, # Use configured API key
    )

    result = llm.invoke(direct_prompt)

    return {
        "messages": [AIMessage(content=result.content)],
        "sources_gathered": [],  # No sources for direct LLM mode
    }


def generate_query(state: OverallState, config: RunnableConfig) -> QueryGenerationState:
    """LangGraph node that generates search queries based on the User's question.

    Uses Claude to create an optimized search queries for web research based on
    the User's question.

    Args:
        state: Current graph state containing the User's question
        config: Configuration for the runnable, including LLM provider settings

    Returns:
        Dictionary with state update, including search_query key containing the generated queries
    """
    configurable = Configuration.from_runnable_config(config)
    claude_model = configurable.claude_model_name # Use configured Claude model

    if not configurable.anthropic_api_key:
        # Return a default query or error message if API key is not set
        # This prevents the flow from breaking if the key is missing
        # For now, let's try to proceed with a dummy query and let web_research handle it.
        # Or, more safely, indicate an error.
         return {
            "messages": [AIMessage(content="Anthropic API key not configured for query generation.")],
            "search_query": ["Error: API key missing"], # Ensure downstream handles this
        }

    # check for custom initial search query count
    if state.get("initial_search_query_count") is None:
        state["initial_search_query_count"] = configurable.number_of_initial_queries

    # init Claude
    llm = ChatAnthropic(
        model_name=claude_model,
        temperature=1.0, # Higher temperature for creative query generation
        max_retries=2,
        api_key=configurable.anthropic_api_key,
    )
    # Claude's structured output might need different handling.
    # For now, let's assume it can output JSON-like structures if prompted correctly.
    # The SearchQueryList Pydantic model might need to be enforced differently or prompt adjusted.
    # For simplicity, we'll try direct invocation and parse, or adjust prompt for JSON.
    structured_llm = llm.with_structured_output(SearchQueryList, method="json_mode")


    # Format the prompt - this prompt is crucial and might need tuning for Claude
    current_date = get_current_date()
    formatted_prompt = query_writer_instructions.format(
        current_date=current_date,
        research_topic=get_research_topic(state["messages"]),
        number_queries=state["initial_search_query_count"],
    )
    # Generate the search queries
    try:
        result = structured_llm.invoke(formatted_prompt)
        search_queries = result.query
    except Exception as e:
        # Fallback or error logging if structured output fails
        print(f"Error generating structured search queries with Claude: {e}")
        # Fallback to a simpler generation or a default query
        # For now, returning an error state or a generic query
        plain_llm = ChatAnthropic(
            model_name=configurable.claude_model_name,
            temperature=0.7,
            api_key=configurable.anthropic_api_key
        )
        simple_prompt = f"{formatted_prompt}\n\nReturn ONLY a list of search queries as a flat JSON list."
        raw_result = plain_llm.invoke(simple_prompt).content
        try:
            # Attempt to parse if it's a JSON list string
            import json
            parsed_queries = json.loads(raw_result)
            if isinstance(parsed_queries, list) and all(isinstance(q, str) for q in parsed_queries):
                search_queries = parsed_queries
            else:
                search_queries = [get_research_topic(state["messages"])] # Default to topic if parsing fails
        except json.JSONDecodeError:
            search_queries = [get_research_topic(state["messages"])] # Default if not JSON

    return {"search_query": search_queries}


def continue_to_web_research(state: QueryGenerationState):
    """LangGraph node that sends the search queries to the web research node.

    This is used to spawn n number of web research nodes, one for each search query.
    """
    return [
        Send("web_research", {"search_query": search_query, "id": int(idx)})
        for idx, search_query in enumerate(state["search_query"])
    ]


def web_research(state: WebSearchState, config: RunnableConfig) -> OverallState:
    """LangGraph node that performs web research.
    Placeholder: This node needs to be adapted for Claude, potentially using a generic search tool.
    The original implementation used a Google-specific search tool.
    """
    # configurable = Configuration.from_runnable_config(config) # Keep for consistency if other conf needed
    search_query = state["search_query"]

    # Placeholder: Actual web search integration for Claude would go here.
    # This might involve using a tool like TavilySearchResults from langchain_community.tools
    # For now, returning a message indicating this part is pending.

    # Example of how it might look with a search tool (conceptual)
    # from langchain_community.tools import TavilySearchResults
    # tavily_api_key = os.getenv("TAVILY_API_KEY")
    # if tavily_api_key:
    #     search_tool = TavilySearchResults(api_key=tavily_api_key, max_results=3)
    #     try:
    #         search_results_str = search_tool.invoke(search_query)
    #         # Further processing to summarize/extract info from search_results_str
    #         # This would likely involve another call to Claude
    #         summary_prompt = f"Summarize the following search results for the query '{search_query}':\n\n{search_results_str}"
    #         summarizer_llm = ChatAnthropic(
    #             model_name=configurable.claude_model_name,
    #             api_key=configurable.anthropic_api_key,
    #             temperature=0.2
    #         )
    #         summary = summarizer_llm.invoke(summary_prompt).content
    #         # sources_gathered would be populated from search_results_str
    #         sources = [{"url": "example.com", "title": "Placeholder Source"}] # Dummy source
    #         return {
    #             "sources_gathered": sources,
    #             "search_query": [search_query],
    #             "web_research_result": [summary],
    #         }
    #     except Exception as e:
    #         print(f"Error during web search with Tavily: {e}")
    #         # Fallback to placeholder
    # else:
    #     print("TAVILY_API_KEY not set. Web research will be skipped.")

    placeholder_summary = (
        f"Web research for '{search_query}' using Claude is pending integration with a compatible search tool. "
        "This step would normally fetch and summarize web results."
    )

    return {
        "sources_gathered": [], # No sources for placeholder
        "search_query": [state["search_query"]],
        "web_research_result": [placeholder_summary],
    }


def reflection(state: OverallState, config: RunnableConfig) -> ReflectionState:
    """LangGraph node that identifies knowledge gaps and generates potential follow-up queries.

    Analyzes the current summary to identify areas for further research and generates
    potential follow-up queries. Uses structured output to extract
    the follow-up query in JSON format.

    Args:
        state: Current graph state containing the running summary and research topic
        config: Configuration for the runnable, including LLM provider settings

    Returns:
        Dictionary with state update, including search_query key containing the generated follow-up query
    """
    configurable = Configuration.from_runnable_config(config)
    claude_model = configurable.claude_model_name

    if not configurable.anthropic_api_key:
        return {
            "is_sufficient": True, # Assume sufficient if API key is missing to avoid loop
            "knowledge_gap": "Anthropic API key not configured for reflection.",
            "follow_up_queries": [],
            "research_loop_count": state.get("research_loop_count", 0) + 1,
            "number_of_ran_queries": len(state.get("search_query", [])),
        }

    # Increment the research loop count
    state["research_loop_count"] = state.get("research_loop_count", 0) + 1
    # reasoning_model = state.get("reasoning_model", configurable.reflection_model) # Original Gemini model

    # Format the prompt - this prompt might need tuning for Claude
    current_date = get_current_date()
    formatted_prompt = reflection_instructions.format(
        current_date=current_date,
        research_topic=get_research_topic(state["messages"]),
        summaries="\n\n---\n\n".join(state["web_research_result"]),
    )
    # init Claude for Reflection
    llm = ChatAnthropic(
        model_name=claude_model,
        temperature=0.7, # Temperature for reflection
        max_retries=2,
        api_key=configurable.anthropic_api_key,
    )
    # Using structured_output with Claude, ensure Reflection Pydantic model is compatible or prompt is adjusted
    try:
        result = llm.with_structured_output(Reflection, method="json_mode").invoke(formatted_prompt)
    except Exception as e:
        print(f"Error with structured output for reflection: {e}")
        # Fallback: try to get a boolean for is_sufficient and skip follow-up if error
        # This is a simplified fallback
        return {
            "is_sufficient": True, # Default to sufficient on error to stop looping
            "knowledge_gap": f"Error during reflection: {e}",
            "follow_up_queries": [],
            "research_loop_count": state["research_loop_count"],
            "number_of_ran_queries": len(state.get("search_query", [])),
        }


    return {
        "is_sufficient": result.is_sufficient,
        "knowledge_gap": result.knowledge_gap,
        "follow_up_queries": result.follow_up_queries,
        "research_loop_count": state["research_loop_count"],
        "number_of_ran_queries": len(state.get("search_query", [])), # Ensure search_query is available
    }


def validate_sources(state: OverallState, config: RunnableConfig) -> ValidationState:
    """LangGraph node that validates sources and performs cross-referencing in deep research mode.
    This node might need adjustment if source structure from Claude web_research differs.
    For now, keeping it similar, assuming sources_gathered will be populated.
    """
    configurable = Configuration.from_runnable_config(config)

    # Skip validation if not in deep research mode or if web research was skipped (no sources)
    if not state.get("deep_research_mode", False) or not state.get("sources_gathered"):
        return {
            "validation_results": [],
            "reliability_score": 1.0, # Default to reliable if no sources or not deep mode
            "contradictions_found": [],
            "source_credibility": []
        }

    # Enhanced validation logic for deep research mode
    validation_results = []
    source_credibility = []
    contradictions_found = []

    # Analyze source credibility (placeholder logic)
    for source in state.get("sources_gathered", []):
        credibility_score = 0.8  # Base score, would be enhanced with actual analysis
        source_credibility.append({
            "source": source, # Assumes source is a dict with 'url' and 'title' etc.
            "credibility_score": credibility_score,
            "analysis": "Source analysis would be performed here (Claude-specific if needed)"
        })

    # Calculate overall reliability
    reliability_score = sum(s["credibility_score"] for s in source_credibility) / max(len(source_credibility), 1)

    return {
        "validation_results": validation_results,
        "reliability_score": reliability_score,
        "contradictions_found": contradictions_found,
        "source_credibility": source_credibility
    }


def evaluate_research(
    state: ReflectionState, # State now comes from Claude's reflection
    config: RunnableConfig,
) -> OverallState:
    """LangGraph routing function that determines the next step in the research flow.

    Controls the research loop by deciding whether to continue gathering information
    or to finalize the summary based on the configured maximum number of research loops.

    Args:
        state: Current graph state containing the research loop count
        config: Configuration for the runnable, including max_research_loops setting

    Returns:
        String literal indicating the next node to visit ("web_research" or "finalize_summary")
    """
    configurable = Configuration.from_runnable_config(config)
    max_research_loops = (
        state.get("max_research_loops")
        if state.get("max_research_loops") is not None
        else configurable.max_research_loops
    )

    # Check if deep research mode requires validation
    # If web_research is just a placeholder, validation might not be meaningful yet
    if state.get("deep_research_mode", False) and \
       state.get("sources_gathered") and \
       state["research_loop_count"] > 2: # Condition on sources_gathered existing
        return "validate_sources"
    elif state["is_sufficient"] or state["research_loop_count"] >= max_research_loops:
        return "finalize_answer"
    else:
        # Ensure follow_up_queries exist and is a list
        follow_up_queries = state.get("follow_up_queries", [])
        if not isinstance(follow_up_queries, list):
            follow_up_queries = [] # Default to empty list if not proper type

        # Ensure number_of_ran_queries is an int
        number_of_ran_queries = state.get("number_of_ran_queries", 0)
        if not isinstance(number_of_ran_queries, int):
            number_of_ran_queries = 0


        return [
            Send(
                "web_research",
                {
                    "search_query": follow_up_query,
                    "id": number_of_ran_queries + int(idx),
                },
            )
            for idx, follow_up_query in enumerate(follow_up_queries) if follow_up_query # Ensure query is not empty
        ]


def finalize_answer(state: OverallState, config: RunnableConfig):
    """LangGraph node that finalizes the research summary using Claude.

    Prepares the final output by combining research results (which might be limited if web_search is a placeholder)
    to create a well-structured research report.

    Args:
        state: Current graph state containing the running summary and sources gathered

    Returns:
        Dictionary with state update, including messages key containing the final summary.
    """
    configurable = Configuration.from_runnable_config(config)
    claude_model = configurable.claude_model_name

    if not configurable.anthropic_api_key:
        return {
            "messages": [AIMessage(content="Anthropic API key not configured. Cannot finalize answer.")],
            "sources_gathered": state.get("sources_gathered", []),
        }

    # Format the prompt - this prompt might need tuning for Claude
    current_date = get_current_date()
    # The web_research_result might contain placeholder text if web search isn't fully implemented
    summaries_content = "\n---\n\n".join(state.get("web_research_result", ["No web research results available."]))

    formatted_prompt = answer_instructions.format(
        current_date=current_date,
        research_topic=get_research_topic(state["messages"]),
        summaries=summaries_content, # Use potentially placeholder summaries
    )

    # init Claude for final answer
    llm = ChatAnthropic(
        model_name=claude_model,
        temperature=0.1, # Lower temperature for factual summarization
        max_retries=2,
        api_key=configurable.anthropic_api_key,
    )
    result = llm.invoke(formatted_prompt)

    # Citation handling will be different as the placeholder web_research doesn't provide structured sources like original.
    # For now, we pass through any sources gathered by the placeholder (which is none).
    # If a real search tool is integrated, this part would need to align with its output.
    final_content = result.content
    unique_sources = state.get("sources_gathered", []) # Will be empty with current placeholder

    # Example of how source integration might look if sources_gathered had 'url' and 'title'
    # if unique_sources:
    #     final_content += "\n\nSources:\n"
    #     for src in unique_sources:
    #         final_content += f"- [{src.get('title', src.get('url'))}]({src.get('url')})\n"

    return {
        "messages": [AIMessage(content=final_content)],
        "sources_gathered": unique_sources,
    }


# Create our Claude Agent Graph
builder = StateGraph(OverallState, config_schema=Configuration)

# Define the nodes we will cycle between
builder.add_node("direct_llm_response", direct_llm_response)
builder.add_node("generate_query", generate_query)
builder.add_node("web_research", web_research) # Uses placeholder web_research
builder.add_node("reflection", reflection)
builder.add_node("validate_sources", validate_sources) # Uses placeholder validation
builder.add_node("finalize_answer", finalize_answer)

# Set the entrypoint with conditional routing based on search mode
builder.add_conditional_edges(
    START,
    route_search_mode,
    ["direct_llm_response", "generate_query"]
)

# Direct LLM response path (no search)
builder.add_edge("direct_llm_response", END)

# Search-based paths (standard and deep research)
builder.add_conditional_edges(
    "generate_query", continue_to_web_research, ["web_research"]
)
# Reflect on the web research
builder.add_edge("web_research", "reflection")
# Evaluate the research
builder.add_conditional_edges(
    "reflection", evaluate_research, ["web_research", "validate_sources", "finalize_answer"]
)
# Add edge from validation to finalize
builder.add_edge("validate_sources", "finalize_answer")
# Finalize the answer
builder.add_edge("finalize_answer", END)

# Rename the graph
claude_research_graph = builder.compile(name="claude-research-agent")
