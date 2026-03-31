const { ProductErrorCodes } = require('./errors')
const util = require('./util')
// List a new product
module.exports.create = async function(connection, product, res) {
    if (!product?.name?.trim()) {
        util.error(res, "Product data not provided", ProductErrorCodes.PRODUCT_DATA_NOT_PROVIDED)
        return
    }

    const normalizedName = product.name.trim()
    const normalizedDescription = product.description ?? ''

    const [existingRows] = await connection.query(
        `
            SELECT id, pname, description
            FROM Product
            WHERE LOWER(TRIM(pname)) = LOWER(?)
            LIMIT 1;
        `,
        [normalizedName]
    )

    const existingProduct = existingRows?.[0]
    if (existingProduct?.id) {
        res.send({
            id: Number(existingProduct.id),
            name: existingProduct.pname,
            description: existingProduct.description ?? normalizedDescription,
            existing: true
        })
        return
    }

    const results = await util.insert(connection, "Product", ["pname", "description"],  [normalizedName, normalizedDescription])
    if (results.insertId) {
        res.send({ id: Number(results.insertId), name: normalizedName, description: normalizedDescription })
        return
    }

    util.error(res, "Product creation failed", ProductErrorCodes.PRODUCT_CREATE_FAILED)
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
