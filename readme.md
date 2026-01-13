## General Requirements
- This project **requires** that [docker desktop](https://www.docker.com/) and [docker-compose](https://docs.docker.com/compose/) be installed on your computer.

## Set up MySQL database
- Make sure docker desktop is running.
- Initialize docker services using command or rerun the project, always use command  `docker compose build --no-cache && docker compose up`
- To access the database via the shell, execute the following command in a fresh terminal window: `docker exec -it pesapal-db-container bash`
    - Once in the shell of the container, login using command `mysql -u root -p`
    - When prompted for password, enter the value assigned to `MYSQL_ROOT_PASSWORD` environment variable in file **'./compose.yaml'**
    - Create a database using command `CREATE DATABASE pesapaldb;`
    - Select the newly created database using command `USE pesapaldb;`
## CREATE TABLES
Create the following tables:
- `CREATE TABLE User(id INT PRIMARY KEY AUTO_INCREMENT, username VARCHAR(20));` # REMOVE ME!!!






