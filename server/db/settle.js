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
            res.send({id: result.insertId, ...settlement})
        }else{
            error(res, "Settlement failed", SettleErrorCodes.DEBT_CREATE_FAILED)
        }
    }else{
        error(res, "The debt is already settled", SettleErrorCodes.DEBT_EXISTS)
    }
}