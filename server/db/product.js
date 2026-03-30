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

module.exports.update = async function(connection, productId, product, res) {
    if (!productId || !product) {
        util.error(res, "Product data not provided", ProductErrorCodes.PRODUCT_DATA_NOT_PROVIDED)
        return
    }

    const results = await util.updateById(
        connection,
        "Product",
        productId,
        ["pname", "description"],
        [product.name, product.description ?? ""]
    )

    if (results.affectedRows) {
        res.send({ id: Number(productId), ...product, description: product.description ?? "" })
    } else {
        util.error(res, "Product update failed", ProductErrorCodes.PRODUCT_UPDATE_FAILED)
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
