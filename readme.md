## About the App (the idea)
Running a shop means trusting your neighbors, but keeping track of 'deni' shouldn't be a headache. My app is a digital ledger that sits right in your pocket. You can register your regular customers, record what they take on credit, and see exactly when they pay you back. If you decide to forgive a small debt, the app handles that too. It’s built to make sure you get paid on time and your records are always organized

## General Requirements
- This project **requires** that [docker desktop](https://www.docker.com/) and [docker-compose](https://docs.docker.com/compose/) be installed on your computer.

## Set Up Environment Variables
!! IMPORTANT !!
- Make a file named `.env` in the root folder of the projects and populate it with the following values (this is not standard practice but it is easy for such test projects):
MYSQL_DATABASE=pesapaldb
MYSQL_ROOT_PASSWORD=example
MYSQL_ROOT_USER=root
MYSQL_HOST=db


## Set up MySQL database
- Make sure docker desktop is running.
- Initialize docker services and the database, use always use command  `docker-compose down -v && docker compose build --no-cache && docker compose up`. This command clears old database, rebuilds without cache and restarts the application with fresh instance of the database.
- To access the database via the shell, execute the following command in a fresh terminal window: `docker exec -it pesapal-db-container bash`
    - Once in the shell of the container, login using command `mysql -u root -p`
    - When prompted for password, enter the value assigned to `MYSQL_ROOT_PASSWORD` environment variable in file **'.env'**
    - Create a database using command `CREATE DATABASE pesapaldb;`
    - Select the newly created database using command `USE pesapaldb;`
    - The database commands can be found in `docker-entrypoint-initdb.d/init.sql`

## Accessing the server
- Server url: localhost:3003/ 
- The endpoints of the server can be tested independently via postman. 
- The whole set of available endpoints is published [here](https://llms55.postman.co/workspace/LLMs~fdcf35b6-92d5-4b64-917e-f4b1678b3d0d/collection/931606-8f60028d-291f-4d71-8e95-b9fcdece8f86?action=share&creator=931606)
- Alternatively, open `./server/server.js` to see the complete set of endpoints 

## Linux deployment notes
- The API server now reads `PORT` and defaults to `3003`.
- The API server now reads database settings from env and supports both `MYSQL_USER` / `MYSQL_PASSWORD` and the previous `MYSQL_ROOT_USER` / `MYSQL_ROOT_PASSWORD`.
- The web app defaults to calling `/api` from the browser instead of hardcoding `hostname:3003`.
- For local Vite development outside Docker, `/api` is proxied to `http://127.0.0.1:3003`.
- For Docker development, the `web` service sets `VITE_API_PROXY_TARGET=http://server:3003`.
- For production with Docker, the `web` container serves the built static app with Nginx and proxies `/api/*` to the `server` container.
- For production on a Linux server with an external reverse proxy, point the proxy at the `web` container rather than Vite. Example with Nginx:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3003/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

- If you do not want to use a reverse proxy path, set `VITE_API_BASE_URL` at build time to your public API URL.

## Production Docker on a VPS
- Use `compose.yaml` for local development only.
- Use `compose.prod.yaml` for server deployment.
- The production web image no longer runs Vite. It builds the React app and serves the generated `dist` files from Nginx.
- The production server image no longer runs `nodemon`. It runs `npm run start`.
- The service worker is disabled for now to avoid stale deploys being cached by browsers.

### First deployment flow
1. Copy the repo to the server.
2. Create or update `.env` with production secrets.
3. Build and start the production stack:
   `docker compose -f compose.prod.yaml up -d --build`
4. Verify locally on the server:
   `curl http://127.0.0.1:8080`
5. Point your existing gateway / Nginx proxy to `http://127.0.0.1:8080`.

### Notes for servers with an existing gateway
- If your Contabo server already has Nginx, a gateway, or another reverse proxy running, do not expose Vite or the Node API publicly.
- Route your public domain to the `web` container only.
- The `web` container already proxies `/api/*` internally to the `server` container.
- If your gateway prefers Docker networks instead of host ports, you can remove `8080:80` from `compose.prod.yaml` and attach both stacks to the same external Docker network.

### Updating a live deployment
- Pull the latest code on the server.
- Rebuild and restart:
  `docker compose -f compose.prod.yaml up -d --build`
- Confirm health:
  `docker compose -f compose.prod.yaml ps`

## The front-end
The visual web application can be accessed via link: http://localhost:5173/

## Notes
Please note that due to limited time, some areas of the app especially on the front-end were done in a hurry and thus the quality may not be as great.







