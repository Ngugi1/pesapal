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
                CONCAT(u.fname, ' ', u.lname) as debtor,
                p.pname,
                d.quantity,
                d.unit_price,
                d.total_price
            FROM Debt d
            INNER JOIN User u ON 
                u.id = debtor_user_id
            INNER JOIN Product p ON 
                p.id = product_id
            WHERE d.creditor_shop_id = ? AND d.forgiven=FALSE;
        `,
        [shopId]
    )
    console.log(results)
    res.send(results)

}