async function hasColumn(connection, tableName, columnName) {
    const [rows] = await connection.query(
        `
            SELECT COUNT(*) AS count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
              AND COLUMN_NAME = ?;
        `,
        [tableName, columnName]
    )

    return Number(rows?.[0]?.count ?? 0) > 0
}

module.exports.ensure = async function ensureSchema(connection) {
    if (!await hasColumn(connection, 'Catalog', 'stock_quantity')) {
        await connection.query(
            `
                ALTER TABLE Catalog
                ADD COLUMN stock_quantity INT NOT NULL DEFAULT 0;
            `
        )
    }

    if (!await hasColumn(connection, 'Catalog', 'default_unit_price')) {
        await connection.query(
            `
                ALTER TABLE Catalog
                ADD COLUMN default_unit_price DECIMAL(10,2) NOT NULL DEFAULT 0;
            `
        )
    }
}
