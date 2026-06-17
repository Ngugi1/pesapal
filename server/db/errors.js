module.exports.UserErrorCodes = Object.freeze({ // don't modify this object - no native enums on JS
    USER_EXISTS: 0,
    USER_CREATE_FAILED: 1,
    USER_DATA_NOT_PROVIDED: 2

});

module.exports.ShopErrorCodes = Object.freeze({
    SHOP_EXISTS: 10, 
    SHOP_CREATE_FAILED: 11,
    SHOP_DATA_NOT_PROVIDED: 21

});

module.exports.ProductErrorCodes = Object.freeze({
    PRODUCT_EXISTS: 101,
    PRODUCT_CREATE_FAILED: 111,
    PRODUCT_DATA_NOT_PROVIDED: 211,
    PRODUCT_UPDATE_FAILED: 311

});

module.exports.CatalogErrorCodes = Object.freeze({
    CATALOG_EXISTS: 1011,
    CATALOG_CREATE_FAILED: 1111,
    CATALOG_DATA_NOT_PROVIDED: 2111,
    CATALOG_UPDATE_FAILED: 3111,
    CATALOG_STOCK_FAILED: 4111

});

module.exports.DebtErrorCodes = Object.freeze({
    DEBT_EXISTS: 10111,
    DEBT_CREATE_FAILED: 11111,
    DEBT_DATA_NOT_PROVIDED: 21111,
    DEBT_UPDATE_FAILED: 31111,
    DEBT_DELETE_FAILED: 41111

});

module.exports.SettleErrorCodes = Object.freeze({
    DEBT_EXISTS: 101111,
    DEBT_CREATE_FAILED: 111111,
    DEBT_DATA_NOT_PROVIDED: 211111

});

module.exports.SaleErrorCodes = Object.freeze({
    SALE_EXISTS: 1011111,
    SALE_CREATE_FAILED: 1111111,
    SALE_DATA_NOT_PROVIDED: 2111111,
    SALE_UPDATE_FAILED: 3111111
});

module.exports.ExpenseErrorCodes = Object.freeze({
    EXPENSE_EXISTS: 10111111,
    EXPENSE_CREATE_FAILED: 11111111,
    EXPENSE_DATA_NOT_PROVIDED: 21111111,
    EXPENSE_UPDATE_FAILED: 31111111
});
