const {connector} = require('./connect')
const {UserErrorCodes} = require('./errors')
const utils = require('./util')

// Determine if a user already exists
async function exists(connection, table, columns, values) {
    return await utils.exists(connection, table, columns, values)
}

// A function to insert new user into a database
module.exports.create = async function(connection, user, res) {
    const table = "User"
    if(!await exists(connection, table, ["phone"], [user.phone])) {
        if(user) {
            const results = await utils.insert(connection, table, ["fname", "phone", "lname"],  [user.fname, user.phone, user.lname])
            if(results.insertId) {
                res.send({id: results.insertId})
            }else {
                res.send({error: 'Failed to create user', code: UserErrorCodes.USER_CREATE_FAILED})
            }
        }else {
            res.send({"error": 'No user details provided', code: UserErrorCodes.USER_DATA_NOT_PROVIDED})
        }
    }else {
        res.send({"error": 'User already exists', code: UserErrorCodes.USER_EXISTS})
    }
   
}

