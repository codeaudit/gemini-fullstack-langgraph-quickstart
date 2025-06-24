import os
from pydantic import BaseModel, Field
from typing import Any, Optional

from langchain_core.runnables import RunnableConfig


class Configuration(BaseModel):
    """The configuration for the agent."""

    query_generator_model: str = Field(
        default="gemini-2.0-flash",
        metadata={
            "description": "The name of the language model to use for the agent's query generation."
        },
    )

    reflection_model: str = Field(
        default="gemini-2.5-flash",
        metadata={
            "description": "The name of the language model to use for the agent's reflection."
        },
    )

    answer_model: str = Field(
        default="gemini-2.5-pro",
        metadata={
            "description": "The name of the language model to use for the agent's answer."
        },
    )

    number_of_initial_queries: int = Field(
        default=3,
        metadata={"description": "The number of initial search queries to generate."},
    )

    max_research_loops: int = Field(
        default=2,
        metadata={"description": "The maximum number of research loops to perform."},
    )

    deep_research_mode: bool = Field(
        default=False,
        metadata={"description": "Enable deep research mode for comprehensive analysis."}
    )
    
    deep_research_queries: int = Field(
        default=8,
        metadata={"description": "Number of initial queries in deep research mode."}
    )
    
    deep_research_loops: int = Field(
        default=15,
        metadata={"description": "Maximum research loops in deep research mode."}
    )
    
    deep_research_validation_rounds: int = Field(
        default=2,
        metadata={"description": "Additional validation rounds for deep research."}
    )

    anthropic_api_key: Optional[str] = Field(
        default=None,
        description="API key for Anthropic models. If not set, Anthropic models cannot be used."
    )

    claude_model_name: str = Field(
        default="claude-3-opus-20240229",
        description="The name of the Claude model to use for the Claude 4 research flow."
    )

    @classmethod
    def from_runnable_config(
        cls, config: Optional[RunnableConfig] = None
    ) -> "Configuration":
        """Create a Configuration instance from a RunnableConfig."""
        configurable = (
            config["configurable"] if config and "configurable" in config else {}
        )

        # Get raw values from environment or config
        raw_values: dict[str, Any] = {
            name: os.environ.get(name.upper(), configurable.get(name))
            for name in cls.model_fields.keys()
        }

        # Filter out None values
        values = {k: v for k, v in raw_values.items() if v is not None}

        return cls(**values)
