# for dockerfile # Use a Python 3.12 image
FROM python:3.12-slim

# The standard working directory for HF Spaces is /code
WORKDIR /code
ENV HOME=/code

# Install system dependencies as root
RUN apt-get update && apt-get install -y \
    git \
    nginx \
    build-essential \
    sed \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Clone the application repositories
# NOTE: This now uses a specific branch that has a corrected structure
RUN git clone --branch 188 https://github.com/JsonLord/mem0.git && \
    git clone --branch fix-server-startup https://github.com/JsonLord/mcp-mem0.git

COPY main_fixed.py /code/mcp-mem0/src/main.py

RUN sed -i 's/"base_url"/"openai_base_url"/g' /code/mem0/mem0/server/main.py

RUN sed -i 's/mem0ai==0.1.55/mem0ai>=0.1.88/' /code/mcp-mem0/pyproject.toml

# Graph store is enabled

# DEFINITIVE FIX for TypeError: Pin the incompatible dependency
RUN sed -i 's/"mcp\[cli\]>=1.3.0"/"mcp[cli]==1.15.0"/' /code/mcp-mem0/pyproject.toml

# --- FIX FOR ModuleNotFoundError: No module named 'mem0_mcp' ---
# This is still needed because mcp-mem0 uses a src layout.
 ENV PYTHONPATH="${PYTHONPATH}:/code/mem0:/code/mcp-mem0/src" 
# --- END FIX ---

# --- FIX FOR DATABASE CONNECTION ---
# Tell the app to use a local SQLite file instead of looking for Postgres.
ENV DATABASE_URL="sqlite:///code/mem0.db"
ENV HISTORY_DB_PATH="/code/history.db"
# --- END FIX ---

# The 'mv' command has been REMOVED because the new branch already has the correct directory structure.

# Install all dependencies system-wide as root in editable mode.
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -e ./mem0 -e ./mcp-mem0 && \
    pip install --no-cache-dir \
    "fastapi" \
    "uvicorn[standard]" \
    "httpx>=0.28.1" \
    "mcp[cli]==1.15.0" \
    "mem0ai[graph,vector_stores]>=0.1.88" \
    "vecs>=0.4.5" \
    "qdrant-client>=1.9.1" \
    "pydantic>=2.7.3" \
    "openai>=1.90.0" \
    "posthog>=3.5.0" \
    "pytz>=2024.1" \
    "sqlalchemy>=2.0.31" \
    "protobuf>=5.29.0,<6.0.0" \
    "langchain-neo4j>=0.4.0" \
    "rank-bm25>=0.2.2" \
    "kuzu>=0.11.0" \
    "chromadb>=0.4.24"

# Give the non-root user ownership of the code directory for runtime file creation.
RUN chown -R 1000:1000 /code

# Set up Nginx
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf

# Copy the start script and make it executable
COPY start.sh /code/
RUN chmod +x /code/start.sh

# Ensure the non-root user can write to /tmp for logs and pids
RUN chown -R 1000:1000 /tmp

# Switch to the non-root user to run the application for security.
USER 1000

# Set the entrypoint to the start script
CMD ["/code/start.sh"]