# Local-CLI Project

## Overview

The Local-CLI project is a command-line interface tool designed to simplify and automate tasks for local development. This guide will help you set up and run the project on your machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (version 14 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- A terminal or command-line interface


<!-- ## Installation -->

## Backend

1. Inside the Local-CLI directory, cd into the local-cli-backend directory and run the following command:
    ```bash
    python -m venv .
    ```
2. Activate the virtual environment:
    - On Windows (i think):
        ```bash
        .\venv\Scripts\activate
        ```
    - On macOS/Linux:
        ```bash
        source ./venv/bin/activate
        ```
3. Install the required packages:
    ```bash
    pip install -r reqs.txt
    ```

    These might also come in handy:
    ```bash
    pip install python-dotenv psycopg2
    pip install psycopg2-binary
    ```

    Mainly uses the fastapi and requests libraries from python.

4. Run the backend server:
```bash
fastapi dev main.py

# Run on cloud 
fastapi dev CLI/Local_CLI/local_cli_backend/main.py   --host 0.0.0.0 --port 8000
```

5. The backend server should now be running at `http://127.0.0.1:8000`.

## Frontend

1. Inside the Local-CLI directory, cd into the local-cli-fe-full directory and run the following command:
    ```bash
    npm install
    ```

2. Start the frontend server:
    ```bash
    npm start
   
   # for ubuntu 
   export NODE_OPTIONS=--openssl-legacy-provider
   npm start
    ```

3. Open your browser and navigate to `http://localhost:3000` to access the Local-CLI web interface.


## Supabase




## Anylog API

Follow all the instructions of the github below to set up the Anylog API.

https://github.com/AnyLog-co/AnyLog-API/tree/main

Make sure to run this command while the venv of the backend is activated

```bash
python3 -m pip install $HOME/AnyLog-API/dist/anylog_api-0.0.0-py2.py3-none-any.whl 
```


## Usage

Set up a node using the docker-compose and use the IP and port from the docker container (usually `127.0.0.1:32049`).

OR 

Use `23.239.12.151:32349` as the IP and port to connect to a hosted node.


## Docker 
1. To build - `docker build -f Dockerfile . -t gui`
2. To run 
   * Local 
```shell
docker run -it --rm -p 8000:8000 -p 3001:3001 -e REACT_APP_API_URL=http://127.0.0.1:8000   --name gui oshadmon/gui:test
```
   * Production
```shell
docker run -d \
  --name gui \
  -p 8000:8000 \
  -p 3001:3001 \
  -e REACT_APP_API_URL=http:/${EXTERNAL_IP}:8000 \
  -e FRONTEND_URL=http://${EXTERNAL_IP}:3001 \
  oshadmon/gui:test
```