module.exports.exists = async (connection, table, columns, values) => {
    const sql = `SELECT COUNT(*) as count FROM ${table} WHERE ${columns.map(c => `${c}=?`).join(" AND ")};` 
    const [results] = await connection.query
    (
        sql,
        values
    )
    return results[0].count === 0 ? false : true
}

module.exports.insert = async (connection, table, columns, values) => {
    const sql =    `INSERT INTO ${table}(${columns.join(",")}) VALUES(${columns.map(c=> "?").join(",")});`
    const [results] = await connection.query
    (
        sql,
        values
    )
    return results
}

module.exports.error = function(res, message, code) {
    res.send({"error": message, code: code})
}