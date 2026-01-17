const { SettleErrorCodes } = require("./errors")
const { exists, error, insert } = require("./util")

module.exports.create = async function(connection, settlement, res) {
    const table = "Settlement"
    const columns = ["debt_id", "amount", "is_full_settlement", "comments"]
    const values = columns.map(c => settlement[c])
    if(!settlement) {
        error(res, "No data provided to enable settlement", SettleErrorCodes.DEBT_DATA_NOT_PROVIDED)
    }
    if(!await exists(connection, table, columns, values)){
        const result = await insert(connection, table, columns, values)
        if(result.insertId) {
            res.status(200).send()
        }else{
            error(res, "Settlement failed", SettleErrorCodes.DEBT_CREATE_FAILED)
        }
    }else{
        error(res, "The debt is already settled", SettleErrorCodes.DEBT_EXISTS)
    }
}

module.exports.settled = async function (connection, shopId, res) {
    const [rows, _] = await connection.query(
        `
        SELECT
            d.id as debt_id,
            CONCAT(u.fname, ' ', u.lname) AS debtor,
            u.phone AS debtor_phone,
            p.pname as product,
            d.quantity,
            d.unit_price,
            d.quantity * d.unit_price AS total,
            stlmt.settlement_date,
            stlmt.is_full_settlement
        FROM Shop s 
        INNER JOIN Debt d ON 
            s.id = d.creditor_shop_id
        INNER JOIN Product p ON
            p.id = d.product_id
        INNER JOIN Settlement stlmt ON
            stlmt.id = d.id
        INNER JOIN User u ON 
            u.id = d.debtor_user_id
        WHERE
            s.id = ? AND d.forgiven = FALSE;

        `,
        [shopId]
    )
    console.log(rows)
    if(rows) {
        res.json(rows.map(r => {
            return {
                shop_id: parseInt(shopId),
                ...r
            }
        }))

    }
}