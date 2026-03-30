const util = require('./util')
const { SaleErrorCodes } = require('./errors')
const catalog = require('./catalog')

function sanitizeTimestamp(value) {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : Math.floor(Date.now() / 1000)
}

module.exports.create = async function(connection, sale, res) {
    if (!sale) {
        util.error(res, 'Sale data not provided', SaleErrorCodes.SALE_DATA_NOT_PROVIDED)
        return
    }

    const quantity = Number(sale.quantity ?? 1)
    if (sale.product_id) {
        const stockResult = await catalog.adjustStock(connection, sale.shop_id, sale.product_id, -quantity)
        if (!stockResult.affectedRows) {
            util.error(res, 'Not enough stock for this sale', SaleErrorCodes.SALE_CREATE_FAILED)
            return
        }
    }

    const columns = ['shop_id', 'product_id', 'quantity', 'unit_price', 'sale_date', 'notes']
    const values = [
        sale.shop_id,
        sale.product_id ?? null,
        quantity,
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

module.exports.update = async function(connection, saleId, sale, res) {
    if (!saleId || !sale) {
        util.error(res, 'Sale data not provided', SaleErrorCodes.SALE_DATA_NOT_PROVIDED)
        return
    }

    const [rows] = await connection.query(
        `
            SELECT shop_id, product_id, quantity
            FROM Sale
            WHERE id = ?;
        `,
        [saleId]
    )

    if (!rows?.length) {
        util.error(res, 'Sale could not be updated', SaleErrorCodes.SALE_UPDATE_FAILED)
        return
    }

    const existing = rows[0]
    const nextProductId = sale.product_id ?? null
    const nextQuantity = Number(sale.quantity ?? 1)

    if (existing.product_id && (existing.product_id !== nextProductId || Number(existing.quantity) !== nextQuantity)) {
        await catalog.adjustStock(connection, existing.shop_id, existing.product_id, Number(existing.quantity))
    }

    if (nextProductId) {
        const stockResult = await catalog.adjustStock(connection, existing.shop_id, nextProductId, -nextQuantity)
        if (!stockResult.affectedRows) {
            if (existing.product_id && (existing.product_id !== nextProductId || Number(existing.quantity) !== nextQuantity)) {
                await catalog.adjustStock(connection, existing.shop_id, existing.product_id, -Number(existing.quantity))
            }
            util.error(res, 'Not enough stock for this sale', SaleErrorCodes.SALE_UPDATE_FAILED)
            return
        }
    }

    const columns = ['product_id', 'quantity', 'unit_price', 'sale_date', 'notes']
    const values = [
        nextProductId,
        nextQuantity,
        sale.unit_price,
        sanitizeTimestamp(sale.sale_date),
        sale.notes ?? ''
    ]

    const result = await util.updateById(connection, 'Sale', saleId, columns, values)
    if (result.affectedRows) {
        res.send({ id: Number(saleId), ...sale, sale_date: values[3], notes: values[4] })
    } else {
        util.error(res, 'Sale could not be updated', SaleErrorCodes.SALE_UPDATE_FAILED)
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
