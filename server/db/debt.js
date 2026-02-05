const util = require('./util')
const {DebtErrorCodes} = require('./errors')
module.exports.create = async function(connection, debt, res) {
    const table = "Debt"
    const columns = [
        "creditor_shop_id", 
        "debtor_user_id", 
        "product_id",
        "quantity", 
        "unit_price"
    ]
    if(!debt) {
        util.error(res, "Debt item not provided", DebtErrorCodes.DEBT_DATA_NOT_PROVIDED)
    }else{
        const values = columns.map(c => debt[c])
        
        if(!await util.exists(connection, table, columns, values)) {
            const result = await util.insert(connection, table, columns, values)
            if(result.insertId) {
                res.send({id: result.insertId, ...debt})
            }else {
                util.error(res, "Debt item could not be created", DebtErrorCodes.DEBT_CREATE_FAILED)
            }
        }else{
            util.error(res, "A duplicate debt item exists", DebtErrorCodes.DEBT_EXISTS)
        }
    }
   
}

module.exports.settle = async function(connection, debtId, res) {
    
}

module.exports.forgive = async function(connection, debtId, res) {
    const [results] = await connection.query(
        `
            UPDATE Debt
            SET date_forgiven = UNIX_TIMESTAMP(), forgiven=TRUE
            WHERE id = ?; 
        `,
        [debtId]
    )
    if(results.changedRows) {
        res.send()
    }else{
        res.status(400).end()
    }
   
}

module.exports.getAll = async function(connection, shopId, res) {
    console.log(shopId, "}}}}}}}}}}}")
    const [results] = await connection.query(
        `
            SELECT
                d.id,
                u.id as debtor_user_id,
                CONCAT(u.fname, ' ', u.lname) as debtor,
                u.phone as debtor_phone,
                p.pname,
                d.quantity,
                d.unit_price,
                d.total_price
            FROM Debt d
            INNER JOIN User u ON 
                u.id = debtor_user_id
            INNER JOIN Product p ON 
                p.id = product_id
            WHERE d.creditor_shop_id = ?
              AND d.forgiven = FALSE
              AND d.id NOT IN (
                SELECT debt_id FROM Settlement WHERE is_full_settlement = TRUE
              );
        `,
        [shopId]
    )
    console.log(results)
    res.send(results)

}

module.exports.listAll = async function(connection, shopId, res) {
    const [results] = await connection.query(
        `
            SELECT
                d.id,
                CONCAT(u.fname, ' ', u.lname) as debtor,
                p.pname,
                d.quantity,
                d.unit_price,
                d.total_price,
                d.forgiven,
                d.date_issued,
                d.date_forgiven,
                COALESCE(s.total_paid, 0) as total_paid,
                COALESCE(s.full_settlement, 0) as full_settlement,
                COALESCE(s.has_settlement, 0) as has_settlement,
                s.last_settlement_date
            FROM Debt d
            INNER JOIN User u ON 
                u.id = debtor_user_id
            INNER JOIN Product p ON 
                p.id = product_id
            LEFT JOIN (
                SELECT
                    debt_id,
                    SUM(amount) as total_paid,
                    MAX(CASE WHEN is_full_settlement = TRUE THEN 1 ELSE 0 END) as full_settlement,
                    COUNT(*) as has_settlement,
                    MAX(settlement_date) as last_settlement_date
                FROM Settlement
                GROUP BY debt_id
            ) s ON s.debt_id = d.id
            WHERE d.creditor_shop_id = ?;
        `,
        [shopId]
    )
    res.send(results)
}

module.exports.stats = async function(connection, shopId, res) {
    const [rows] = await connection.query(
        `
        SELECT
            COUNT(*) AS total_count,
            COALESCE(SUM(d.total_price), 0) AS total_amount,
            SUM(
                CASE
                    WHEN d.forgiven = FALSE
                    AND COALESCE(s.full_settlement, 0) = 0
                    THEN 1 ELSE 0
                END
            ) AS outstanding_count,
            COALESCE(SUM(
                CASE
                    WHEN d.forgiven = FALSE
                    AND COALESCE(s.full_settlement, 0) = 0
                    THEN d.total_price - COALESCE(s.total_paid, 0) ELSE 0
                END
            ), 0) AS outstanding_amount,
            SUM(
                CASE
                    WHEN COALESCE(s.total_paid, 0) > 0
                    THEN 1 ELSE 0
                END
            ) AS paid_count,
            COALESCE(SUM(COALESCE(s.total_paid, 0)), 0) AS paid_amount
        FROM Debt d
        LEFT JOIN (
            SELECT
                debt_id,
                SUM(amount) as total_paid,
                MAX(CASE WHEN is_full_settlement = TRUE THEN 1 ELSE 0 END) as full_settlement
            FROM Settlement
            GROUP BY debt_id
        ) s ON s.debt_id = d.id
        WHERE d.creditor_shop_id = ?;
        `,
        [shopId]
    )
    res.json(rows?.[0] ?? {
        total_count: 0,
        total_amount: 0,
        outstanding_count: 0,
        outstanding_amount: 0,
        paid_count: 0,
        paid_amount: 0
    })
}
