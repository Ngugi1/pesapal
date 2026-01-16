// Load environment variables
require('dotenv').config(); 
const express = require('express');
const {connector} = require('./db/connect')
const user = require('./db/user');
const shop = require('./db/shop')
const product = require('./db/product')
const catalog = require('./db/catalog')
const debt = require('./db/debt')
const settle = require('./db/settle')
let dbConnection = connector()
// Init server
app = express()
app.port = 3003

// For json parsing
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Welcome to Debts API!');
});

// Create a user
app.post('/user/create', async (req, res) => {
    console.log('----------Create User---------')
    const userJson = req.body
    await user.create(dbConnection, userJson, res);
})

// Create a shop
app.post('/shop/create', async (req, res) => {
    console.log('----------Create Shop ---------')
    await shop.create(dbConnection, req.body, res)
})

// Create a product
app.post('/product/create', async (req, res) => {
    console.log('----------Create Product ---------')
    await product.create(dbConnection, req.body, res)
})

// Create a catalog for a shop
app.post('/catalog/create', async (req, res) => {
    console.log('----------Create Catalog ---------')
    await catalog.create(dbConnection, req.body, res)
})

// Give debt
app.post('/debt/create', async (req, res) => {
    console.log('----------Create Debt ---------')
    await debt.create(dbConnection, req.body, res)
})

// Settle debt
app.post('/settle/create', async (req, res) => {
    console.log('----------Create Settlement ---------')
    await settle.create(dbConnection, req.body, res)
})
async function startServer() {
    // Keep one DB connection - a pool may be better in prod
    try{
        dbConnection = await connector()
        app.listen(app.port, async() => {
            console.log(`Server running at http://localhost:${app.port}`);
        });
    }catch (ex) {
        console.error('Fatal error during startup:', err);
        process.exit(1); // Non-zero is failure code - like return 0 in C

    }
}

startServer()

