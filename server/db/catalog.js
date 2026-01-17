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

module.exports.catalog = async function(connection, shop_id, res) {
    const [rows] = await connection.query(
        `
        SELECT  
            p.pname,
            p.description,
            s.sname
        FROM Shop s 
        INNER JOIN Catalog c ON
            s.id = c.shop_id
        INNER JOIN Product p ON
            p.id = c.product_id
        WHERE s.id = ?
        `, 
        [shop_id]
    )
    console.log(rows)
    res.send(rows)
}

module.exports.remove = async function(connection, info, res) {
    console.log(info)
    const [header] = await connection.query(
        `
            DELETE FROM Catalog WHERE shop_id=? AND product_id=?;
        `,
        [parseInt(info.shopid), parseInt(info.productid)]
    )
    if(header.affectedRows) {
        res.send({"message": "deleted"})
    }else {
        res.send({"message": "Item does't exist"})
    }
    
}