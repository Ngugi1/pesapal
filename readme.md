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

## The front-end
The visual web application can be accessed via link: http://localhost:5173/









