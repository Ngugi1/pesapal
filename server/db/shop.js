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

