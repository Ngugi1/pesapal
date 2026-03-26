const util = require('./util')
const { ExpenseErrorCodes } = require('./errors')

function sanitizeTimestamp(value) {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : Math.floor(Date.now() / 1000)
}

module.exports.create = async function(connection, expense, res) {
    if (!expense) {
        util.error(res, 'Expense data not provided', ExpenseErrorCodes.EXPENSE_DATA_NOT_PROVIDED)
        return
    }

    const columns = ['shop_id', 'category', 'amount', 'expense_date', 'notes']
    const values = [
        expense.shop_id,
        expense.category,
        expense.amount,
        sanitizeTimestamp(expense.expense_date),
        expense.notes ?? ''
    ]

    const result = await util.insert(connection, 'Expense', columns, values)
    if (result.insertId) {
        res.send({ id: result.insertId, ...expense, expense_date: values[3], notes: values[4] })
    } else {
        util.error(res, 'Expense could not be created', ExpenseErrorCodes.EXPENSE_CREATE_FAILED)
    }
}

module.exports.list = async function(connection, shopId, fromTs, toTs, res) {
    const [rows] = await connection.query(
        `
            SELECT
                id,
                shop_id,
                category,
                amount,
                expense_date,
                notes
            FROM Expense
            WHERE shop_id = ?
              AND expense_date BETWEEN ? AND ?
            ORDER BY expense_date DESC, id DESC;
        `,
        [shopId, fromTs, toTs]
    )
    res.json(rows)
}
