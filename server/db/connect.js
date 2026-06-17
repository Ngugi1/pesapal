// Reference material: // https://medium.com/@vimalveeramani/getting-started-with-node-mysql2-a-faster-mysql-client-for-node-js-a4da91be5767
const fs = require('fs')
const mysql = require('mysql2/promise')

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function isRetryableConnectionError(error) {
    const message = error instanceof Error ? error.message : String(error)
    return [
        'ECONNREFUSED',
        'ETIMEDOUT',
        'EHOSTUNREACH',
        'ENOTFOUND',
        'PROTOCOL_CONNECTION_LOST'
    ].some(code => message.includes(code))
}
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
    const retries = Number(process.env.MYSQL_CONNECT_RETRIES) || 20
    const retryDelayMs = Number(process.env.MYSQL_CONNECT_RETRY_DELAY_MS) || 3000

    let lastError = null
    for (let attempt = 1; attempt <= retries; attempt += 1) {
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
            lastError = exp
            if (!isRetryableConnectionError(exp) || attempt === retries) {
                break
            }
            await sleep(retryDelayMs)
        }
    }

    const reason = lastError instanceof Error ? lastError.message : String(lastError)
    throw new Error(`Database connection could not be established: ${reason}`)
   
}

module.exports.connector = getConnection
