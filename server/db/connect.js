// Reference material: // https://medium.com/@vimalveeramani/getting-started-with-node-mysql2-a-faster-mysql-client-for-node-js-a4da91be5767
const fs = require('fs')
const mysql = require('mysql2/promise')
/**
 * 
 * @returns a pool connected to pesapaldb
 */
async function getConnection() {
    const runningInDocker = fs.existsSync('/.dockerenv')
    const configuredHost = process.env.MYSQL_HOST || '127.0.0.1'
    const host = configuredHost === 'db' && !runningInDocker ? '127.0.0.1' : configuredHost
    const user = process.env.MYSQL_USER || process.env.MYSQL_ROOT_USER || 'root'
    const password = process.env.MYSQL_PASSWORD || process.env.MYSQL_ROOT_PASSWORD || ''
    const database = process.env.MYSQL_DATABASE || 'pesapaldb'
    const port = Number(process.env.MYSQL_PORT) || 3306

    try{
         const pool = mysql.createPool({
            host,
            port,
            user,
            password,
            database,
            namedPlaceholders: true,
            waitForConnections: true,
            connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT) || 10,
            maxIdle: Number(process.env.MYSQL_MAX_IDLE) || 10,
            idleTimeout: Number(process.env.MYSQL_IDLE_TIMEOUT_MS) || 60000,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0
        })

        // Fail fast on startup if the database is unreachable.
        await pool.query('SELECT 1')
        return pool
    }catch (exp) {
        const reason = exp instanceof Error ? exp.message : String(exp)
        throw new Error(`Database connection could not be established: ${reason}`)
    }
   
}

module.exports.connector = getConnection
