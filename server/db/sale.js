const util = require('./util')
const { SaleErrorCodes } = require('./errors')

function sanitizeTimestamp(value) {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : Math.floor(Date.now() / 1000)
}

module.exports.create = async function(connection, sale, res) {
    if (!sale) {
        util.error(res, 'Sale data not provided', SaleErrorCodes.SALE_DATA_NOT_PROVIDED)
        return
    }

    const columns = ['shop_id', 'product_id', 'quantity', 'unit_price', 'sale_date', 'notes']
    const values = [
        sale.shop_id,
        sale.product_id ?? null,
        sale.quantity ?? 1,
        sale.unit_price,
        sanitizeTimestamp(sale.sale_date),
        sale.notes ?? ''
    ]

    const result = await util.insert(connection, 'Sale', columns, values)
    if (result.insertId) {
        res.send({ id: result.insertId, ...sale, sale_date: values[4], notes: values[5] })
    } else {
        util.error(res, 'Sale could not be created', SaleErrorCodes.SALE_CREATE_FAILED)
    }
}

module.exports.list = async function(connection, shopId, fromTs, toTs, res) {
    const [rows] = await connection.query(
        `
            SELECT
                s.id,
                s.shop_id,
                s.product_id,
                COALESCE(p.pname, 'General sale') AS product_name,
                s.quantity,
                s.unit_price,
                s.total_amount,
                s.sale_date,
                s.notes
            FROM Sale s
            LEFT JOIN Product p ON p.id = s.product_id
            WHERE s.shop_id = ?
              AND s.sale_date BETWEEN ? AND ?
            ORDER BY s.sale_date DESC, s.id DESC;
        `,
        [shopId, fromTs, toTs]
    )
    res.json(rows)
}
