const {ShopErrorCodes} = require('./errors')
const util = require('./util')

// Create a new shop
module.exports.create = async function(connection, shop, res) {
    const table = "Shop"
    if(shop) {
        if(!await util.exists(connection, table, ["sname"], [shop.name])) {
            const results = await util.insert(connection, "Shop", ["sname", "shop_owner"], [shop.name, shop.owner_id])
            if(results.insertId) {
                res.send({id: results.insertId, ...shop, "message": "Shop was created!"})
            }else {
                res.send({error: 'Failed to create a shop', code: ShopErrorCodes.SHOP_CREATE_FAILED})
            }
        }else {
            res.send({error: 'Shop with similar name exists', code: ShopErrorCodes.SHOP_EXISTS})
        }
        
    }else {
        res.send({"error": 'No shop details provided', code: ShopErrorCodes.SHOP_DATA_NOT_PROVIDED})
    }
       
}

module.exports.profile = async function(connection, shop_id, res) {
    console.log('shop id========================', shop_id)
    const [rows, _] = await connection.query(
        `
        SELECT DISTINCT  
        CONCAT(u.fname, ' ', u.lname) AS owner,
        s.sname,
        u.phone,
        SUM(d.quantity * d.unit_price) AS total
        FROM Shop s 
        INNER JOIN Debt d ON 
                d.creditor_shop_id = s.id
        INNER JOIN User u ON
                u.id = s.shop_owner
        WHERE 
            d.forgiven = FALSE AND
            s.id = ?
        GROUP BY 
                d.creditor_shop_id, 
                s.sname,
                u.fname,
                u.lname,
                u.phone;
        `,
        [parseInt(shop_id)]
    )
    console.log('*************', rows)
    if(rows.length > 0) {
        res.json({id: shop_id, ...rows[0]})
    }else {
        res.json({})
    }
}


