const { CatalogErrorCodes } = require('./errors')
const util = require('./util')
module.exports.create = async function(connection, catalog, res) {
    const table = "Catalog"
    const columns = ["shop_id", "product_id", "stock_quantity", "default_unit_price"]
    const values = [catalog.shop_id, catalog.product_id, Number(catalog.stock_quantity ?? 0), Number(catalog.default_unit_price ?? 0)]
    if(! await util.exists(connection, table, ["shop_id", "product_id"], [catalog.shop_id, catalog.product_id])) {
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
            p.id as product_id,
            s.id as shop_id,
            c.id,
            c.stock_quantity,
            c.default_unit_price
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

module.exports.update = async function(connection, catalogId, catalog, res) {
    const values = [
        Number(catalog.stock_quantity ?? 0),
        Number(catalog.default_unit_price ?? 0)
    ]
    const results = await util.updateById(
        connection,
        "Catalog",
        catalogId,
        ["stock_quantity", "default_unit_price"],
        values
    )

    if (results.affectedRows) {
        res.send({ id: Number(catalogId), ...catalog, stock_quantity: values[0], default_unit_price: values[1] })
    } else {
        util.error(res, "Catalog item update failed", CatalogErrorCodes.CATALOG_UPDATE_FAILED)
    }
}

module.exports.adjustStock = async function(connection, shopId, productId, delta) {
    if (!productId || !Number.isFinite(Number(delta)) || Number(delta) === 0) {
        return { affectedRows: 0 }
    }

    const [header] = await connection.query(
        `
            UPDATE Catalog
            SET stock_quantity = stock_quantity + ?
            WHERE shop_id = ?
              AND product_id = ?
              AND stock_quantity + ? >= 0;
        `,
        [Number(delta), Number(shopId), Number(productId), Number(delta)]
    )

    return header
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
