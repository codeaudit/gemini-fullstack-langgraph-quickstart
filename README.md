# Gemini Fullstack LangGraph Quickstart

This project demonstrates a fullstack application using a React frontend and a LangGraph-powered backend agent. The agent is designed to perform comprehensive research on a user's query by dynamically generating search terms, querying the web using Google Search, reflecting on the results to identify knowledge gaps, and iteratively refining its search until it can provide a well-supported answer with citations. This application serves as an example of building research-augmented conversational AI using LangGraph and Google's Gemini models.

<img src="./app.png" title="Gemini Fullstack LangGraph" alt="Gemini Fullstack LangGraph" width="90%">

## Features

- 💬 Fullstack application with a React frontend and LangGraph backend.
- 🧠 Powered by a LangGraph agent for advanced research and conversational AI.
- 🔍 Dynamic search query generation using Google Gemini models or Anthropic Claude.
- 🌐 Integrated web research (Google Search API for Gemini flow; placeholder for Claude flow pending search tool integration).
- 🤔 Reflective reasoning to identify knowledge gaps and refine searches.
- 📄 Generates answers with citations from gathered sources.
- 🔄 Hot-reloading for both frontend and backend during development.
- ✨ Supports Anthropic Claude models for an alternative research flow.

## Project Structure

The project is divided into two main directories:

-   `frontend/`: Contains the React application built with Vite.
-   `backend/`: Contains the LangGraph/FastAPI application, including the research agent logic.

## Getting Started: Development and Local Testing

Follow these steps to get the application running locally for development and testing.

**1. Prerequisites:**

-   Node.js and npm (or yarn/pnpm)
-   Python 3.11+
-   **API Keys**: The backend agent requires API keys for the language models it uses.
    1.  Navigate to the `backend/` directory.
    2.  Create a file named `.env` by copying the `backend/.env.example` file.
    3.  Open the `.env` file and add your API keys:
        -   For Google Gemini models: `GEMINI_API_KEY="YOUR_GEMINI_API_KEY"`
        -   For Anthropic Claude models (if using the Claude research flow): `ANTHROPIC_API_KEY="YOUR_ANTHROPIC_API_KEY"`
    4.  Optionally, you can also specify the Claude model name by adding (defaults to `claude-3-opus-20240229`):
        `CLAUDE_MODEL_NAME="your_claude_model_version"`

**2. Install Dependencies:**

**Backend:**

```bash
cd backend
pip install .
```

**Frontend:**

```bash
cd frontend
npm install
```

**3. Run Development Servers:**

**Backend & Frontend:**

```bash
make dev
```
This will run the backend and frontend development servers.    Open your browser and navigate to the frontend development server URL (e.g., `http://localhost:5173/app`).

_Alternatively, you can run the backend and frontend development servers separately. For the backend, open a terminal in the `backend/` directory and run `langgraph dev`. The backend API will be available at `http://127.0.0.1:2024`. It will also open a browser window to the LangGraph UI. For the frontend, open a terminal in the `frontend/` directory and run `npm run dev`. The frontend will be available at `http://localhost:5173`._

## How the Backend Agent Works (High-Level)

The backend utilizes LangGraph to define and run research agents. Depending on the selected flow ("Single Agent", "Multi-Agent", or "Claude Research"), different underlying graphs and language models are used.

-   **Gemini-based flows (`Single Agent`, `Multi-Agent`):** These are defined in `backend/src/agent/graph.py` and `backend/src/agent/multi_agent_graph.py` respectively. They generally follow these steps:
    <img src="./agent.png" title="Agent Flow" alt="Agent Flow" width="50%">
    1.  **Generate Initial Queries:** Based on your input, it generates a set of initial search queries using a Gemini model.
    2.  **Web Research:** For each query, it uses the Gemini model with the Google Search API to find relevant web pages.
    3.  **Reflection & Knowledge Gap Analysis:** The agent analyzes the search results to determine if the information is sufficient or if there are knowledge gaps. It uses a Gemini model for this reflection process.
    4.  **Iterative Refinement:** If gaps are found or the information is insufficient, it generates follow-up queries and repeats the web research and reflection steps (up to a configured maximum number of loops).
    5.  **Finalize Answer:** Once the research is deemed sufficient, the agent synthesizes the gathered information into a coherent answer, including citations from the web sources, using a Gemini model.
-   **Claude-based flow (`Claude Research`):** This flow is defined in `backend/src/agent/claude_graph.py`. It follows a similar iterative research process but utilizes Anthropic's Claude model for all language understanding and generation tasks.
    -   *Note on Web Search for Claude flow:* Currently, the web search step in the Claude flow is a placeholder. Full web research capabilities for this flow (e.g., using a tool like Tavily) are pending integration. The agent will generate search queries but will not execute them or retrieve live web content in the current version of this flow.

## CLI Example

For quick one-off questions you can execute the agent from the command line. The
script `backend/examples/cli_research.py` runs the LangGraph agent and prints the
final answer:

```bash
cd backend
python examples/cli_research.py "What are the latest trends in renewable energy?"
```


## Deployment

In production, the backend server serves the optimized static frontend build. LangGraph requires a Redis instance and a Postgres database. Redis is used as a pub-sub broker to enable streaming real time output from background runs. Postgres is used to store assistants, threads, runs, persist thread state and long term memory, and to manage the state of the background task queue with 'exactly once' semantics. For more details on how to deploy the backend server, take a look at the [LangGraph Documentation](https://langchain-ai.github.io/langgraph/concepts/deployment_options/). Below is an example of how to build a Docker image that includes the optimized frontend build and the backend server and run it via `docker-compose`.

_Note: For the docker-compose.yml example you need a LangSmith API key, you can get one from [LangSmith](https://smith.langchain.com/settings)._

_Note: If you are not running the docker-compose.yml example or exposing the backend server to the public internet, you should update the `apiUrl` in the `frontend/src/App.tsx` file to your host. Currently the `apiUrl` is set to `http://localhost:8123` for docker-compose or `http://localhost:2024` for development._

**1. Build the Docker Image:**

   Run the following command from the **project root directory**:
   ```bash
   docker build -t gemini-fullstack-langgraph -f Dockerfile .
   ```
**2. Run the Production Server:**

   Ensure your API keys are available as environment variables for the Docker container. You can pass them directly or use an `.env` file with `docker-compose`.
   ```bash
   GEMINI_API_KEY="YOUR_GEMINI_API_KEY" \
   ANTHROPIC_API_KEY="YOUR_ANTHROPIC_API_KEY" \
   CLAUDE_MODEL_NAME="claude-3-opus-20240229" \
   LANGSMITH_API_KEY="YOUR_LANGSMITH_API_KEY" \
   docker-compose up
   ```
   *(Adjust `CLAUDE_MODEL_NAME` if needed, or omit to use the default)*

Open your browser and navigate to `http://localhost:8123/app/` to see the application. The API will be available at `http://localhost:8123`.

## Technologies Used

- [React](https://reactjs.org/) (with [Vite](https://vitejs.dev/)) - For the frontend user interface.
- [Tailwind CSS](https://tailwindcss.com/) - For styling.
- [Shadcn UI](https://ui.shadcn.com/) - For components.
- [LangGraph](https://github.com/langchain-ai/langgraph) - For building the backend research agent.
- [Google Gemini](https://ai.google.dev/models/gemini) - LLM for query generation, reflection, and answer synthesis in Gemini-based flows.
- [Anthropic Claude](https://www.anthropic.com/claude) - LLM for the Claude-based research flow.

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details. 
