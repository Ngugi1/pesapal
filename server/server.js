// Load environment variables
require('dotenv').config(); 
const cors = require('cors');
const express = require('express');
const {connector} = require('./db/connect')
const user = require('./db/user');
const shop = require('./db/shop')
const product = require('./db/product')
const catalog = require('./db/catalog')
const debt = require('./db/debt')
const settle = require('./db/settle')
const shopCustomer = require('./db/shopCustomer')
const sale = require('./db/sale')
const expense = require('./db/expense')
const overview = require('./db/overview')
let dbConnection = connector()
// Init server
let app = express()
app.use(cors());
app.port = Number(process.env.PORT) || 3003
// For json parsing
app.use(express.json())


async function startServer() {
    // Keep one DB connection - a pool may be better in prod
    try{
        dbConnection = await connector()
        app.listen(app.port, '0.0.0.0', () => {
            console.log(`Server running at http://0.0.0.0:${app.port}`);
        });
    }catch (err) {
        console.error('Fatal error during startup:', err);
        process.exit(1); // Non-zero is failure code - like return 0 in C

    }
}

startServer()

function parseDateRange(req) {
    const now = Math.floor(Date.now() / 1000)
    const from = Number(req.query.from)
    const to = Number(req.query.to)
    return {
        from: Number.isFinite(from) && from > 0 ? Math.floor(from) : 0,
        to: Number.isFinite(to) && to > 0 ? Math.floor(to) : now
    }
}

// TODO:: Move routes to separate file
app.get('/', (req, res) => {
        res.send('Welcome to Debts API!');
});

// Create a user
app.post('/user/create', async (req, res) => {
    const userJson = req.body
    await user.create(dbConnection, userJson, res);
})

app.get('/users/all', async (req, res) => {
    await user.all(dbConnection, res)
})
app.get('/user/phone/:phone', async (req, res) => {
    await user.findByPhone(dbConnection, req.params.phone, res)
})

// Create a shop
app.post('/shop/create', async (req, res) => {
    await shop.create(dbConnection, req.body, res)
})
// Get profile of a shop
app.get('/shop/profile/:id', async (req, res) => {
    await shop.profile(dbConnection, req.params.id, res)
})
app.get('/shop/owner/:owner_id', async (req, res) => {
    await shop.byOwner(dbConnection, req.params.owner_id, res)
})

app.get('/shop/profile/settled/:id', async (req, res)=> {
    await settle.settled(dbConnection, req.params.id, res)
})
// Shop customers
app.get('/shop/customer/list/:shop_id', async (req, res) => {
    await shopCustomer.list(dbConnection, req.params.shop_id, res)
})
app.post('/shop/customer/add', async (req, res) => {
    await shopCustomer.add(dbConnection, req.body, res)
})
app.delete('/shop/customer/remove', async (req, res) => {
    await shopCustomer.remove(dbConnection, req.body, res)
})

// Create a product
app.post('/product/create', async (req, res) => {
    await product.create(dbConnection, req.body, res)
})

app.get('/product/all', async (_req, res) => {
    await product.getAll(dbConnection, res)
})

// Create a catalog for a shop
app.post('/catalog/create', async (req, res) => {
    await catalog.create(dbConnection, req.body, res)
})


// remove catalog item for a shop
app.delete('/catalog/remove/:shopid/:productid', async (req, res) => {
    console.log(req.params, '{{{{{{{{')
    await catalog.remove(dbConnection, {productid: req.params.productid, shopid: req.params.shopid}, res)
})

app.get('/catalog/shop/:id', async (req, res) => {
    const shopId = req.params.id
    await catalog.catalog(dbConnection, shopId, res)
})

// Give debt
app.get('/debt/getall/:shop_id', async (req, res) => {
    const range = parseDateRange(req)
    await debt.getAll(dbConnection, req.params.shop_id, range.from, range.to, res)
})
// Debt stats
app.get('/debt/stats/:shop_id', async (req, res) => {
    const range = parseDateRange(req)
    await debt.stats(dbConnection, req.params.shop_id, range.from, range.to, res)
})
// Debt list (all statuses)
app.get('/debt/list/:shop_id', async (req, res) => {
    const range = parseDateRange(req)
    await debt.listAll(dbConnection, req.params.shop_id, range.from, range.to, res)
})


// Give debt
app.post('/debt/create', async (req, res) => {
    await debt.create(dbConnection, req.body, res)
})

// Forgive debt
app.post('/debt/forgive/:id', async (req, res) => {
    await debt.forgive(dbConnection, req.params.id, res) 
})

// Settle debt
app.put('/debt/settle', async (req, res) => {
    await settle.create(dbConnection, req.body, res)
})

app.post('/sale/create', async (req, res) => {
    await sale.create(dbConnection, req.body, res)
})

app.get('/sale/list/:shop_id', async (req, res) => {
    const range = parseDateRange(req)
    await sale.list(dbConnection, req.params.shop_id, range.from, range.to, res)
})

app.post('/expense/create', async (req, res) => {
    await expense.create(dbConnection, req.body, res)
})

app.get('/expense/list/:shop_id', async (req, res) => {
    const range = parseDateRange(req)
    await expense.list(dbConnection, req.params.shop_id, range.from, range.to, res)
})

app.get('/overview/:shop_id', async (req, res) => {
    const range = parseDateRange(req)
    await overview.summary(dbConnection, req.params.shop_id, range.from, range.to, res)
})
