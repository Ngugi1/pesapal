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
let app = express()
app.port = 3003
// For json parsing
app.use(express.json())


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

// TODO:: Move routes to separate file
app.get('/', (req, res) => {
        res.send('Welcome to Debts API!');
});

// Create a user
app.post('/user/create', async (req, res) => {
    const userJson = req.body
    await user.create(dbConnection, userJson, res);
})

// Create a shop
app.post('/shop/create', async (req, res) => {
    await shop.create(dbConnection, req.body, res)
})
// Get profile of a shop
app.get('/shop/profile/:id', async (req, res) => {
    await shop.profile(dbConnection, req.params.id, res)
})

app.get('/shop/profile/settled/:id', async (req, res)=> {
    await settle.settled(dbConnection, req.params.id, res)
})

// Create a product
app.post('/product/create', async (req, res) => {
    await product.create(dbConnection, req.body, res)
})

// Create a catalog for a shop
app.post('/catalog/create', async (req, res) => {
    await catalog.create(dbConnection, req.body, res)
})

// remove catalog item for a shop
app.delete('/catalog/:shopid/:productid', async (req, res) => {
    await catalog.remove(dbConnection, {productid: req.params.productid, shopid: req.params.shopid}, res)
})

app.get('/catalog/shop/:id', async (req, res) => {
    const shopId = req.params.id
    await catalog.catalog(dbConnection, shopId, res)
})

// Give debt
app.post('/debt/create', async (req, res) => {
    await debt.create(dbConnection, req.body, res)
})

// Forgive debt
app.post('/debt/forgive/:id', async (req, res) => {
    await settle.forgive(dbConnection, req.params.id, res) 
})

// Settle debt
app.put('/debt/settle', async (req, res) => {
    await settle.create(dbConnection, req.body, res)
})

