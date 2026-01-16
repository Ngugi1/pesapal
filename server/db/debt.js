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