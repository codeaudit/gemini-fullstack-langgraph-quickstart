# mypy: disable - error - code = "no-untyped-def,misc"
import pathlib
import json
import os
from fastapi import FastAPI, Response, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict

# Define the FastAPI app
app = FastAPI()

# Flow types that the frontend can select
AVAILABLE_FLOWS = {
    "single-agent": "Single Agent Research",
    "multi-agent": "Multi-Agent Research System"
}

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic model for prompt configuration
class PromptConfig(BaseModel):
    query_writer_instructions: str
    web_searcher_instructions: str
    reflection_instructions: str
    answer_instructions: str
    direct_prompt_template: str


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


# Configuration file path
PROMPTS_CONFIG_FILE = pathlib.Path(__file__).parent / "custom_prompts.json"

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

def load_prompts() -> Dict[str, str]:
    """Load prompts from custom config file or defaults"""
    if PROMPTS_CONFIG_FILE.exists():
        try:
            with open(PROMPTS_CONFIG_FILE, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, KeyError):
            pass
    return load_default_prompts()

def save_prompts(prompts: Dict[str, str]):
    """Save prompts to custom config file"""
    with open(PROMPTS_CONFIG_FILE, 'w') as f:
        json.dump(prompts, f, indent=2)

@app.get("/api/prompts")
async def get_prompts():
    """Get current prompt configuration"""
    try:
        prompts = load_prompts()
        return prompts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load prompts: {str(e)}")

@app.post("/api/prompts")
async def update_prompts(config: PromptConfig):
    """Update prompt configuration"""
    try:
        prompts_dict = config.dict()
        save_prompts(prompts_dict)
        return {"message": "Prompts updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save prompts: {str(e)}")

@app.post("/api/prompts/reset")
async def reset_prompts():
    """Reset prompts to defaults"""
    try:
        if PROMPTS_CONFIG_FILE.exists():
            PROMPTS_CONFIG_FILE.unlink()  # Delete the custom config file
        defaults = load_default_prompts()
        return defaults
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset prompts: {str(e)}")

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
