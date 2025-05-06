# --- base stage: Python + Node
FROM python:3.11-slim AS base

ENV VIRTUAL_ENV=/opt/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install system deps
RUN apt-get update && \
    apt-get install -y curl gnupg build-essential git python3-venv && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Set workdir
WORKDIR /app

# Copy app files
COPY requirements.txt .
COPY CLI/ CLI/
COPY templates/ templates/

# Python: venv and install
RUN python3 -m venv $VIRTUAL_ENV && \
    $VIRTUAL_ENV/bin/pip install --upgrade pip setuptools wheel uvicorn && \
    $VIRTUAL_ENV/bin/pip install -r requirements.txt && \
    git clone https://github.com/AnyLog-co/AnyLog-API

# Install AnyLog-API
WORKDIR /app/AnyLog-API
RUN $VIRTUAL_ENV/bin/python setup.py sdist bdist_wheel && \
    $VIRTUAL_ENV/bin/pip install --upgrade dist/*.whl

# Build frontend
WORKDIR /app/CLI/Local-CLI/local-cli-fe-full
# ARG REACT_APP_API_URL=http://0.0.0.0:8000
# ENV REACT_APP_API_URL=http://127.0.0.1:8000
RUN npm install
# && REACT_APP_API_URL=http://${REACT_APP_API_URL} npm run build

# --- final deployment stage
FROM python:3.11-slim AS deployment

ENV VIRTUAL_ENV=/opt/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
ENV CLI_IP=0.0.0.0
ENV CLI_PORT=8000

# Install serve for frontend
RUN apt-get update && \
    apt-get install -y nodejs npm xsel && \
    npm install -g serve && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built app and venv
WORKDIR /app

COPY --from=base /opt/venv /opt/venv
COPY --from=base /app /app
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 8000 3001

CMD ["/app/start.sh"]
