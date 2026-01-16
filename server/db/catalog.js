const { CatalogErrorCodes } = require('./errors')
const util = require('./util')
module.exports.create = async function(connection, catalog, res) {
    const table = "Catalog"
    const columns = ["shop_id", "product_id"]
    const values = [catalog.shop_id, catalog.product_id]
    if(! await util.exists(connection, table, columns, values)) {
        const results = await util.insert(connection, table, columns, values)
        if(results.insertId) {
            res.send({...catalog, id: results.insertId})
        }else {
            util.error(res, "Catalog item creation failed", CatalogErrorCodes.CATALOG_CREATE_FAILED)
        }
    }else{
        util.error(res, "Catalog item already exists", CatalogErrorCodes.CATALOG_EXISTS)
    }
}