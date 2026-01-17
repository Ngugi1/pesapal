const { ProductErrorCodes } = require('./errors')
const util = require('./util')
async function exists(connection, table, columns, values) {
    return await util.exists(connection, table, columns, values)
}
// List a new product
module.exports.create = async function(connection, product, res) {
    const table = "Product"
    if(!await exists(connection, table, ["pname"], [product.name])) {
        const results = await util.insert(connection, table, ["pname", "description"],  [product.name, product.description])
        res.send({...product, id: results.insertId})
    }else{
        res.send({error: "Product with same name already exists", code: ProductErrorCodes.PRODUCT_EXISTS})
    }
}

module.exports.getAll = async function(connection, res) {
    const [result] = await connection.query(
        `
            SELECT * FROM Product
        `, []
    )
    console.log(result)
    res.send(result)
}