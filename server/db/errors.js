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
    PRODUCT_DATA_NOT_PROVIDED: 211

});

module.exports.CatalogErrorCodes = Object.freeze({
    CATALOG_EXISTS: 1011,
    CATALOG_CREATE_FAILED: 1111,
    CATALOG_DATA_NOT_PROVIDED: 2111

});

module.exports.DebtErrorCodes = Object.freeze({
    DEBT_EXISTS: 10111,
    DEBT_CREATE_FAILED: 11111,
    DEBT_DATA_NOT_PROVIDED: 21111

});

module.exports.SettleErrorCodes = Object.freeze({
    DEBT_EXISTS: 101111,
    DEBT_CREATE_FAILED: 111111,
    DEBT_DATA_NOT_PROVIDED: 211111

});