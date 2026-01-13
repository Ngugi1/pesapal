// Reference material: // https://medium.com/@vimalveeramani/getting-started-with-node-mysql2-a-faster-mysql-client-for-node-js-a4da91be5767
const mysql = require('mysql2/promise') 
// Load environment variables
require('dotenv').config(); 

/**
 * 
 * @returns a connection to pesapaldb
 */
async function getConnection() {
    return await mysql.createConnection(
        {
            host: process.env.MYSQL_HOST, 
            user: process.env.MYSQL_ROOT_USER, 
            password: process.env.MYSQL_ROOT_PASSWORD, 
            multipleStatements: true,
            database: process.env.MYSQL_DATABASE
        }) // TODO: prefer environment variables instead of plain text in production
}

/**
 * 
 * @returns all users in the database
 */
async function setupDb() {
    const connection = await getConnection()
    const [results] = await connection.query(
        `   
            CREATE TABLE IF NOT EXISTS User(id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(20));
            INSERT INTO User(name) VALUES ("NGUGI");
            SELECT * FROM User;
        `
    )
    console.log('======================================================')
    console.log(results)
    console.log('======================================================')

    return results
}
console.log("*********************", process.env.MYSQL_DATABASE)
setupDb()


