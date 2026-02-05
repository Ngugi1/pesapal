const { exists, insert, error } = require("./util")
const { ShopErrorCodes } = require("./errors")

module.exports.add = async function (connection, payload, res) {
    const table = "ShopCustomer"
    const columns = ["shop_id", "user_id"]
    if (!payload) {
        error(res, "No data provided", ShopErrorCodes?.SHOP_CREATE_FAILED ?? 400)
        return
    }
    const values = columns.map(c => payload[c])
    if (values.some(v => v === undefined || v === null)) {
        error(res, "Missing shop_id or user_id", ShopErrorCodes?.SHOP_CREATE_FAILED ?? 400)
        return
    }
    if (!await exists(connection, table, columns, values)) {
        const result = await insert(connection, table, columns, values)
        if (result.insertId) {
            res.status(200).send({ id: result.insertId, ...payload })
        } else {
            error(res, "Customer link failed", ShopErrorCodes?.SHOP_CREATE_FAILED ?? 400)
        }
    } else {
        res.status(200).send(payload)
    }
}

module.exports.list = async function (connection, shopId, res) {
    const [rows] = await connection.query(
        `
        SELECT
            sc.user_id,
            u.fname,
            u.lname,
            u.phone
        FROM ShopCustomer sc
        INNER JOIN User u ON
            u.id = sc.user_id
        WHERE sc.shop_id = ?;
        `,
        [shopId]
    )
    res.json(rows)
}

module.exports.remove = async function (connection, payload, res) {
    if (!payload?.shop_id || !payload?.user_id) {
        error(res, "Missing shop_id or user_id", ShopErrorCodes?.SHOP_CREATE_FAILED ?? 400)
        return
    }
    const [result] = await connection.query(
        `DELETE FROM ShopCustomer WHERE shop_id = ? AND user_id = ?;`,
        [payload.shop_id, payload.user_id]
    )
    if (result.affectedRows) {
        res.status(200).send()
    } else {
        res.status(400).end()
    }
}
