# mypy: disable - error - code = "no-untyped-def,misc"
import pathlib
import json
import os
import asyncio
from fastapi import FastAPI, Response, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional

# Define the FastAPI app
app = FastAPI()

# Flow types that the frontend can select
AVAILABLE_FLOWS = {
    "single-agent": "Single Agent Research",
    "multi-agent": "Multi-Agent Research System",
    "claude": "Claude Research"
}

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic model for prompt configuration (original single flow)
class PromptConfig(BaseModel):
    query_writer_instructions: str
    web_searcher_instructions: str
    reflection_instructions: str
    answer_instructions: str
    direct_prompt_template: str

# New Pydantic models for flow-specific prompts
class DefaultFlowPrompts(BaseModel):
    route_search_mode: Optional[str] = None
    direct_llm_response: Optional[str] = None
    generate_query: str
    web_research: str
    reflection: str
    validate_sources: Optional[str] = None
    finalize_answer: str

class AnthropicFlowPrompts(BaseModel):
    lead_agent_orchestrator: str
    search_subagent: str
    citations_subagent: str
    finalize_multi_agent_report: str

class FlowSpecificPrompts(BaseModel):
    default_flow: DefaultFlowPrompts
    anthropic_flow: AnthropicFlowPrompts

def create_frontend_router(build_dir="../frontend/dist"):
    """Creates a router to serve the React frontend.

    Args:
        build_dir: Path to the React build directory relative to this file.

    Returns:
        A Starlette application serving the frontend.
    """
    build_path = pathlib.Path(__file__).parent.parent.parent / build_dir

    if not build_path.is_dir() or not (build_path / "index.html").is_file():
        print(
            f"WARN: Frontend build directory not found or incomplete at {build_path}. Serving frontend will likely fail."
        )
        # Return a dummy router if build isn't ready
        from starlette.routing import Route

        async def dummy_frontend(request):
            return Response(
                "Frontend not built. Run 'npm run build' in the frontend directory.",
                media_type="text/plain",
                status_code=503,
            )

        return Route("/{path:path}", endpoint=dummy_frontend)

    return StaticFiles(directory=build_path, html=True)

# Configuration file paths
PROMPTS_CONFIG_FILE = pathlib.Path(__file__).parent / "custom_prompts.json"
FLOW_PROMPTS_CONFIG_FILE = pathlib.Path(__file__).parent / "flow_specific_prompts.json"

def load_default_prompts() -> Dict[str, str]:
    """Load default prompts from prompts.py"""
    from agent.prompts import (
        default_query_writer_instructions,
        default_web_searcher_instructions, 
        default_reflection_instructions,
        default_answer_instructions
    )
    
    # Extract the direct prompt template from the graph function
    direct_prompt_template = """Current date: {current_date}

Based on your training knowledge, please provide a comprehensive answer to the following question:

{user_question}

Please provide a clear, well-structured response based on your knowledge. If the information might be outdated or you're uncertain about current events, please mention this limitation.

Structure your response with:
1. A clear answer to the question
2. Relevant background context
3. Any important caveats or limitations about the information
4. Note that this response is based on training data and may not include the most recent information

Do not make up specific facts, dates, or statistics that you're not confident about."""
    
    return {
        "query_writer_instructions": default_query_writer_instructions,
        "web_searcher_instructions": default_web_searcher_instructions,
        "reflection_instructions": default_reflection_instructions,
        "answer_instructions": default_answer_instructions,
        "direct_prompt_template": direct_prompt_template
    }

def load_default_flow_prompts() -> FlowSpecificPrompts:
    """Load default prompts for both flows from their respective graph files"""
    
    # Default flow prompts
    default_flow = DefaultFlowPrompts(
        route_search_mode=None,  # No user-configurable prompt for routing logic
        direct_llm_response="""Current date: {current_date}

Based on your training knowledge, please provide a comprehensive answer to the following question:

{user_question}

Please provide a clear, well-structured response based on your knowledge. If the information might be outdated or you're uncertain about current events, please mention this limitation.

Structure your response with:
1. A clear answer to the question
2. Relevant background context
3. Any important caveats or limitations about the information
4. Note that this response is based on training data and may not include the most recent information

Do not make up specific facts, dates, or statistics that you're not confident about.""",
        
        generate_query="""Your goal is to generate sophisticated and diverse web search queries. These queries are intended for an advanced automated web research tool capable of analyzing complex results, following links, and synthesizing information.

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

Context: {research_topic}""",

        web_research="""Conduct targeted Google Searches to gather the most recent, credible information on "{research_topic}" and synthesize it into a verifiable text artifact.

Instructions:
- Query should ensure that the most current information is gathered. The current date is {current_date}.
- Conduct multiple, diverse searches to gather comprehensive information.
- Consolidate key findings while meticulously tracking the source(s) for each specific piece of information.
- The output should be a well-written summary or report based on your search findings. 
- Only include the information found in the search results, don't make up any information.

Research Topic:
{research_topic}""",

        reflection="""You are an expert research assistant analyzing summaries about "{research_topic}".

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

Reflect carefully on the Summaries to identify knowledge gaps and produce a follow-up query. Then, produce your output following this JSON format:

Summaries:
{summaries}""",

        validate_sources=None,  # Optional validation logic, no user prompt needed
        
        finalize_answer="""Generate a high-quality answer to the user's question based on the provided summaries.

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
{summaries}"""
    )
    
    # Anthropic flow prompts (from multi_agent_graph.py)
    anthropic_flow = AnthropicFlowPrompts(
        lead_agent_orchestrator="""You are an expert research lead, focused on high-level research strategy, planning, efficient delegation to subagents, and final report writing. Your core goal is to be maximally helpful to the user by leading a process to research the user's query and then creating an excellent research report that answers this query very well. Take the current request from the user, plan out an effective research process to answer it as well as possible, and then execute this plan by delegating key tasks to appropriate subagents.
The current date is {current_date}.

<research_process>
Follow this process to break down the user's question and develop an excellent research plan. Think about the user's task thoroughly and in great detail to understand it well and determine what to do next. Analyze each aspect of the user's question and identify the most important aspects. Consider multiple approaches with complete, thorough reasoning. Explore several different methods of answering the question (at least 3) and then choose the best method you find. Follow this process closely:
1. **Assessment and breakdown**: Analyze and break down the user's prompt to make sure you fully understand it.
* Identify the main concepts, key entities, and relationships in the task.
* List specific facts or data points needed to answer the question well.
* Note any temporal or contextual constraints on the question.
* Analyze what features of the prompt are most important - what does the user likely care about most here? What are they expecting or desiring in the final result? What tools do they expect to be used and how do we know?
* Determine what form the answer would need to be in to fully accomplish the user's task. Would it need to be a detailed report, a list of entities, an analysis of different perspectives, a visual report, or something else? What components will it need to have?
2. **Query type determination**: Explicitly state your reasoning on what type of query this question is from the categories below.
* **Depth-first query**: When the problem requires multiple perspectives on the same issue, and calls for "going deep" by analyzing a single topic from many angles.
- Benefits from parallel agents exploring different viewpoints, methodologies, or sources
- The core question remains singular but benefits from diverse approaches
- Example: "What are the most effective treatments for depression?" (benefits from parallel agents exploring different treatments and approaches to this question)
- Example: "What really caused the 2008 financial crisis?" (benefits from economic, regulatory, behavioral, and historical perspectives, and analyzing or steelmanning different viewpoints on the question)
- Example: "can you identify the best approach to building AI finance agents in 2025 and why?"
* **Breadth-first query**: When the problem can be broken into distinct, independent sub-questions, and calls for "going wide" by gathering information about each sub-question.
- Benefits from parallel agents each handling separate sub-topics.
- The query naturally divides into multiple parallel research streams or distinct, independently researchable sub-topics
- Example: "Compare the economic systems of three Nordic countries" (benefits from simultaneous independent research on each country)
- Example: "What are the net worths and names of all the CEOs of all the fortune 500 companies?" (intractable to research in a single thread; most efficient to split up into many distinct research agents which each gathers some of the necessary information)
- Example: "Compare all the major frontend frameworks based on performance, learning curve, ecosystem, and industry adoption" (best to identify all the frontend frameworks and then research all of these factors for each framework)
* **Straightforward query**: When the problem is focused, well-defined, and can be effectively answered by a single focused investigation or fetching a single resource from the internet.
- Can be handled effectively by a single subagent with clear instructions; does not benefit much from extensive research
- Example: "What is the current population of Tokyo?" (simple fact-finding)
- Example: "What are all the fortune 500 companies?" (just requires finding a single website with a full list, fetching that list, and then returning the results)
- Example: "Tell me about bananas" (fairly basic, short question that likely does not expect an extensive answer)
3. **Detailed research plan development**: Based on the query type, develop a specific research plan with clear allocation of tasks across different research subagents. Ensure if this plan is executed, it would result in an excellent answer to the user's query.

User's Query: {research_topic}

First, complete your analysis following the process above, then provide a structured research plan with specific subagent tasks.""",

        search_subagent="""You are a research subagent working as part of a team. The current date is {current_date}. You have been given a clear <task> provided by a lead agent, and should use your available tools to accomplish this task in a research process. Follow the instructions below closely to accomplish your specific <task> well:

<task>
Research: {search_query}

Provide comprehensive, accurate information about this specific research aspect. Focus on gathering high-quality sources and detailed information that will contribute to the overall research effort.
</task>

<research_process>
1. **Planning**: First, think through the task thoroughly. Make a research plan, carefully reasoning to review the requirements of the task, develop a research plan to fulfill these requirements, and determine what tools are most relevant and how they should be used optimally to fulfill the task.
- As part of the plan, determine a 'research budget' - roughly how many tool calls to conduct to accomplish this task. Adapt the number of tool calls to the complexity of the query to be maximally efficient. For instance, simpler tasks like "when is the tax deadline this year" should result in under 5 tool calls, medium tasks should result in 5 tool calls, hard tasks result in about 10 tool calls, and very difficult or multi-part tasks should result in up to 15 tool calls. Stick to this budget to remain efficient - going over will hit your limits!
2. **Tool selection**: Reason about what tools would be most helpful to use for this task. Use the right tools when a task implies they would be helpful. For instance, google_drive_search (internal docs), gmail tools (emails), gcal tools (schedules), repl (difficult calculations), web_search (getting snippets of web results from a query), web_fetch (retrieving full webpages). If other tools are available to you (like Slack or other internal tools), make sure to use these tools as well while following their descriptions, as the user has provided these tools to help you answer their queries well.
- **ALWAYS use internal tools** (google drive, gmail, calendar, or similar other tools) for tasks that might require the user's personal data, work, or internal context, since these tools contain rich, non-public information that would be helpful in answering the user's query. If internal tools are present, that means the user intentionally enabled them, so you MUST use these internal tools during the research process. Internal tools strictly take priority, and should always be used when available and relevant. 
- ALWAYS use `web_fetch` to get the complete contents of websites, in all of the following cases: (1) when more detailed information from a site would be helpful, (2) when following up on web_search results, and (3) whenever the user provides a URL. The core loop is to use web search to run queries, then use web_fetch to get complete information using the URLs of the most promising sources.
- Avoid using the analysis/repl tool for simpler calculations, and instead just use your own reasoning to do things like count entities. Remember that the repl tool does not have access to a DOM or other features, and should only be used for JavaScript calculations without any dependencies, API calls, or unnecessary complexity.
3. **Research loop**: Execute an excellent OODA (observe, orient, decide, act) loop by (a) observing what information has been gathered so far, what still needs to be gathered to accomplish the task, and what tools are available currently; (b) orienting toward what tools and queries would be best to gather the needed information and updating beliefs based on what has been learned so far; (c) making an informed, well-reasoned decision to use a specific tool in a certain way; (d) acting to use this tool. Repeat this loop in an efficient way to research well and learn based on new results.
- Execute a MINIMUM of five distinct tool calls, up to ten for complex queries. Avoid using more than ten tool calls.
- Reason carefully after receiving tool results. Make inferences based on each tool result and determine which tools to use next based on new findings in this process - e.g. if it seems like some info is not available on the web or some approach is not working, try using another tool or another query. Evaluate the quality of the sources in search results carefully. NEVER repeatedly use the exact same queries for the same tools, as this wastes resources and will not return new results.
Follow this process well to complete the task. Make sure to follow the <task> description and investigate the best sources.
</research_process>

<research_guidelines>
1. Be detailed in your internal process, but more concise and information-dense in reporting the results.
2. Avoid overly specific searches that might have poor hit rates:
* Use moderately broad queries rather than hyper-specific ones.
* Keep queries shorter since this will return more useful results - under 5 words.
* If specific searches yield few results, broaden slightly.
* Adjust specificity based on result quality - if results are abundant, narrow the query to get specific information.
* Find the right balance between specific and general.
3. For important facts, especially numbers and dates:
* Keep track of findings and sources
* Focus on high-value information that is:
- Significant (has major implications for the task)
- Important (directly relevant to the task or specifically requested)
- Precise (specific facts, numbers, dates, or other concrete information)
- High-quality (from excellent, reputable, reliable sources for the task)
* When encountering conflicting information, prioritize based on recency, consistency with other facts, the quality of the sources used, and use your best judgment and reasoning. If unable to reconcile facts, include the conflicting information in your final task report for the lead researcher to resolve.
4. Be specific and precise in your information gathering approach.
</research_guidelines>

<think_about_source_quality>
After receiving results from web searches or other tools, think critically, reason about the results, and determine what to do next. Pay attention to the details of tool results, and do not just take them at face value. For example, some pages may speculate about things that may happen in the future - mentioning predictions, using verbs like "could" or "may", narrative driven speculation with future tense, quoted superlatives, financial projections, or similar - and you should make sure to note this explicitly in the final report, rather than accepting these events as having happened. Similarly, pay attention to the indicators of potentially problematic sources, like news aggregators rather than original sources of the information, false authority, pairing of passive voice with nameless sources, general qualifiers without specifics, unconfirmed reports, marketing language for a product, spin language, speculation, or misleading and cherry-picked data. Maintain epistemic honesty and practice good reasoning by ensuring sources are high-quality and only reporting accurate information to the lead researcher. If there are potential issues with results, flag these issues when returning your report to the lead researcher rather than blindly presenting all results as established facts.
</think_about_source_quality>

<use_parallel_tool_calls>
For maximum efficiency, whenever you need to perform multiple independent operations, invoke 2 relevant tools simultaneously rather than sequentially. Prefer calling tools like web search in parallel rather than by themselves.
</use_parallel_tool_calls>

<maximum_tool_call_limit>
To prevent overloading the system, it is required that you stay under a limit of 20 tool calls and under about 100 sources. This is the absolute maximum upper limit. If you exceed this limit, the subagent will be terminated. Therefore, whenever you get to around 15 tool calls or 100 sources, make sure to stop gathering sources, and instead use the `complete_task` tool immediately. Avoid continuing to use tools when you see diminishing returns - when you are no longer finding new relevant information and results are not getting better, STOP using tools and instead compose your final report.
</maximum_tool_call_limit>

Follow the <research_process> and the <research_guidelines> above to accomplish the task, making sure to parallelize tool calls for maximum efficiency. Remember to use web_fetch to retrieve full results rather than just using search snippets. Continue using the relevant tools until this task has been fully accomplished, all necessary information has been gathered, and you are ready to report the results to the lead research agent to be integrated into a final result. If there are any internal tools available (i.e. Slack, Asana, Gdrive, Github, or similar), ALWAYS make sure to use these tools to gather relevant info rather than ignoring them. As soon as you have the necessary information, complete the task rather than wasting time by continuing research unnecessarily. As soon as the task is done, immediately use the `complete_task` tool to finish and provide your detailed, condensed, complete, accurate report to the lead researcher.""",

        citations_subagent="""You are an agent for adding correct citations to a research report. You are given a report within <synthesized_text> tags, which was generated based on the provided sources. However, the sources are not cited in the <synthesized_text>. Your task is to enhance user trust by generating correct, appropriate citations for this report.

<synthesized_text>
{synthesized_text}
</synthesized_text>

Available sources: {len(sources_gathered)} sources collected from research subagents

Based on the provided document, add citations to the input text using the format specified earlier. Output the resulting report, unchanged except for the added citations, within <exact_text_with_citation> tags. 

**Rules:**
- Do NOT modify the <synthesized_text> in any way - keep all content 100% identical, only add citations
- Pay careful attention to whitespace: DO NOT add or remove any whitespace
- ONLY add citations where the source documents directly support claims in the text

**Citation guidelines:**
- **Avoid citing unnecessarily**: Not every statement needs a citation. Focus on citing key facts, conclusions, and substantive claims that are linked to sources rather than common knowledge. Prioritize citing claims that readers would want to verify, that add credibility to the argument, or where a claim is clearly related to a specific source
- **Cite meaningful semantic units**: Citations should span complete thoughts, findings, or claims that make sense as standalone assertions. Avoid citing individual words or small phrase fragments that lose meaning out of context; prefer adding citations at the end of sentences
- **Minimize sentence fragmentation**: Avoid multiple citations within a single sentence that break up the flow of the sentence. Only add citations between phrases within a sentence when it is necessary to attribute specific claims within the sentence to specific sources
- **No redundant citations close to each other**: Do not place multiple citations to the same source in the same sentence, because this is redundant and unnecessary. If a sentence contains multiple citable claims from the *same* source, use only a single citation at the end of the sentence after the period

**Technical requirements:**
- Citations result in a visual, interactive element being placed at the closing tag. Be mindful of where the closing tag is, and do not break up phrases and sentences unnecessarily
- Output text with citations between <exact_text_with_citation> and </exact_text_with_citation> tags
- Include any of your preamble, thinking, or planning BEFORE the opening <exact_text_with_citation> tag, to avoid breaking the output
- ONLY add the citation tags to the text within <synthesized_text> tags for your <exact_text_with_citation> output
- Text without citations will be collected and compared to the original report from the <synthesized_text>. If the text is not identical, your result will be rejected.

Now, add the citations to the research report and output the <exact_text_with_citation>.""",

        finalize_multi_agent_report="""Current date: {current_date}

You are finalizing a multi-agent research report. You have received specialized research from multiple subagents covering different aspects of: {research_topic}

Research findings from subagents:
{research_results}

Your task is to:
1. Synthesize all findings into a coherent, comprehensive response
2. Identify key themes and insights across all research aspects
3. Present the information in a well-structured format
4. Include proper citations from the sources
5. Highlight any cross-references or connections between different aspects

Create a final comprehensive research report."""
    )
    
    return FlowSpecificPrompts(
        default_flow=default_flow,
        anthropic_flow=anthropic_flow
    )

def load_flow_prompts() -> FlowSpecificPrompts:
    """Load flow-specific prompts from custom config file or defaults"""
    if FLOW_PROMPTS_CONFIG_FILE.exists():
        try:
            with open(FLOW_PROMPTS_CONFIG_FILE, 'r') as f:
                data = json.load(f)
                return FlowSpecificPrompts(**data)
        except (json.JSONDecodeError, KeyError, ValueError):
            pass
    return load_default_flow_prompts()

async def load_flow_prompts_async() -> FlowSpecificPrompts:
    """Load flow-specific prompts from custom config file or defaults (async)"""
    return await asyncio.to_thread(load_flow_prompts)

async def save_flow_prompts_async(prompts: FlowSpecificPrompts):
    """Save flow-specific prompts to custom config file (async)"""
    await asyncio.to_thread(save_flow_prompts, prompts)

def save_flow_prompts(prompts: FlowSpecificPrompts):
    """Save flow-specific prompts to custom config file"""
    with open(FLOW_PROMPTS_CONFIG_FILE, 'w') as f:
        json.dump(prompts.dict(), f, indent=2)

def load_prompts() -> Dict[str, str]:
    """Load prompts from custom config file or defaults"""
    if PROMPTS_CONFIG_FILE.exists():
        try:
            with open(PROMPTS_CONFIG_FILE, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, KeyError):
            pass
    return load_default_prompts()

async def load_prompts_async() -> Dict[str, str]:
    """Load prompts from custom config file or defaults (async)"""
    return await asyncio.to_thread(load_prompts)

def save_prompts(prompts: Dict[str, str]):
    """Save prompts to custom config file"""
    with open(PROMPTS_CONFIG_FILE, 'w') as f:
        json.dump(prompts, f, indent=2)

async def save_prompts_async(prompts: Dict[str, str]):
    """Save prompts to custom config file (async)"""
    await asyncio.to_thread(save_prompts, prompts)

@app.get("/api/prompts")
async def get_prompts():
    """Get current prompt configuration"""
    try:
        prompts = await load_prompts_async()
        return prompts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load prompts: {str(e)}")

@app.post("/api/prompts")
async def update_prompts(config: PromptConfig):
    """Update prompt configuration"""
    try:
        prompts_dict = config.dict()
        await save_prompts_async(prompts_dict)
        return {"message": "Prompts updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save prompts: {str(e)}")

@app.post("/api/prompts/reset")
async def reset_prompts():
    """Reset prompts to defaults"""
    try:
        if PROMPTS_CONFIG_FILE.exists():
            await asyncio.to_thread(PROMPTS_CONFIG_FILE.unlink)  # Delete the custom config file async
        defaults = load_default_prompts()
        return defaults
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset prompts: {str(e)}")

# New API endpoints for flow-specific prompts
@app.get("/api/flow-prompts")
async def get_flow_prompts():
    """Get current flow-specific prompt configuration for both flows"""
    try:
        flow_prompts = await load_flow_prompts_async()
        return flow_prompts.dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load flow prompts: {str(e)}")

@app.get("/api/flow-prompts/{flow_type}")
async def get_flow_prompts_by_type(flow_type: str):
    """Get prompt configuration for a specific flow type"""
    try:
        flow_prompts = await load_flow_prompts_async()
        if flow_type == "default":
            return {"flow_type": "default", "prompts": flow_prompts.default_flow.dict()}
        elif flow_type == "anthropic":
            return {"flow_type": "anthropic", "prompts": flow_prompts.anthropic_flow.dict()}
        else:
            raise HTTPException(status_code=400, detail=f"Invalid flow type: {flow_type}. Must be 'default' or 'anthropic'")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load {flow_type} flow prompts: {str(e)}")

@app.post("/api/flow-prompts")
async def update_flow_prompts(config: FlowSpecificPrompts):
    """Update flow-specific prompt configuration for both flows"""
    try:
        await save_flow_prompts_async(config)
        return {"message": "Flow prompts updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save flow prompts: {str(e)}")

@app.post("/api/flow-prompts/default")
async def update_default_flow_prompts(prompts: DefaultFlowPrompts):
    """Update prompt configuration for default flow only"""
    try:
        current_flow_prompts = await load_flow_prompts_async()
        current_flow_prompts.default_flow = prompts
        await save_flow_prompts_async(current_flow_prompts)
        return {"message": "Default flow prompts updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save default flow prompts: {str(e)}")

@app.post("/api/flow-prompts/anthropic")
async def update_anthropic_flow_prompts(prompts: AnthropicFlowPrompts):
    """Update prompt configuration for anthropic flow only"""
    try:
        current_flow_prompts = await load_flow_prompts_async()
        current_flow_prompts.anthropic_flow = prompts
        await save_flow_prompts_async(current_flow_prompts)
        return {"message": "Anthropic flow prompts updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save anthropic flow prompts: {str(e)}")

@app.post("/api/flow-prompts/reset")
async def reset_flow_prompts():
    """Reset flow-specific prompts to defaults"""
    try:
        if FLOW_PROMPTS_CONFIG_FILE.exists():
            FLOW_PROMPTS_CONFIG_FILE.unlink()  # Delete the custom config file
        defaults = load_default_flow_prompts()
        return defaults.dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset flow prompts: {str(e)}")

@app.post("/api/flow-prompts/reset/{flow_type}")
async def reset_flow_prompts_by_type(flow_type: str):
    """Reset prompts to defaults for a specific flow type"""
    try:
        current_flow_prompts = await load_flow_prompts_async()
        defaults = load_default_flow_prompts()
        
        if flow_type == "default":
            current_flow_prompts.default_flow = defaults.default_flow
            await save_flow_prompts_async(current_flow_prompts)
            return {"message": "Default flow prompts reset to defaults", "prompts": defaults.default_flow.dict()}
        elif flow_type == "anthropic":
            current_flow_prompts.anthropic_flow = defaults.anthropic_flow
            await save_flow_prompts_async(current_flow_prompts)
            return {"message": "Anthropic flow prompts reset to defaults", "prompts": defaults.anthropic_flow.dict()}
        else:
            raise HTTPException(status_code=400, detail=f"Invalid flow type: {flow_type}. Must be 'default' or 'anthropic'")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset {flow_type} flow prompts: {str(e)}")

@app.get("/api/flows")
async def get_available_flows():
    """Get available flow types"""
    return AVAILABLE_FLOWS

# Mount the frontend under /app to not conflict with the LangGraph API routes
app.mount(
    "/app",
    create_frontend_router(),
    name="frontend",
)
