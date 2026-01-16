// Reference material: // https://medium.com/@vimalveeramani/getting-started-with-node-mysql2-a-faster-mysql-client-for-node-js-a4da91be5767
const mysql = require('mysql2/promise')
require('dotenv').config(); 
/**
 * 
 * @returns a connection to pesapaldb
 */
async function getConnection() {
    try{
         return await mysql.createConnection(
        {
            host: process.env.MYSQL_HOST, 
            user: process.env.MYSQL_ROOT_USER, 
            password: process.env.MYSQL_ROOT_PASSWORD, 
            database: process.env.MYSQL_DATABASE,
            namedPlaceholders: true
        });
    }catch (exp) {
        throw new Error('Database connection could not be established.')
    }
   
}

module.exports.connector = getConnection

