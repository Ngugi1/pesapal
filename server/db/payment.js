const crypto = require('crypto')

const LOGIN_VALIDATION_PURPOSE = 'login_validation'
const SUBSCRIPTION_PURPOSE = 'subscription'
const PAYMENT_PROVIDER = 'mpesa'
const PAYMENT_STATUS = {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed'
}

function nowTs() {
    return Math.floor(Date.now() / 1000)
}

function normalizePhone(phone) {
    const digits = `${phone ?? ''}`.replace(/[^\d+]/g, '')
    if (!digits) return ''
    if (digits.startsWith('+254')) return digits.slice(1)
    if (digits.startsWith('254')) return digits
    if (digits.startsWith('0')) return `254${digits.slice(1)}`
    return digits
}

function localPhoneVariant(phone) {
    if (!phone.startsWith('254') || phone.length < 12) return phone
    return `0${phone.slice(3)}`
}

function buildPhoneVariants(phone) {
    const normalized = normalizePhone(phone)
    const variants = new Set([
        `${phone ?? ''}`.trim(),
        normalized,
        localPhoneVariant(normalized),
        `+${normalized}`
    ].filter(Boolean))
    return [...variants]
}

async function findUserByPhone(connection, phone) {
    const variants = buildPhoneVariants(phone)
    if (!variants.length) return null
    const placeholders = variants.map(() => '?').join(', ')
    const [rows] = await connection.query(
        `SELECT id, fname, lname, phone
         FROM User
         WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') IN (${placeholders})
         LIMIT 1`,
        variants
    )
    return rows?.[0] ?? null
}

async function findShopByOwner(connection, ownerId) {
    const [rows] = await connection.query(
        `SELECT id, sname, shop_owner FROM Shop WHERE shop_owner = ? LIMIT 1`,
        [ownerId]
    )
    return rows?.[0] ?? null
}

async function insertPayment(connection, payload) {
    const [result] = await connection.query(
        `INSERT INTO PaymentAttempt
            (user_id, shop_id, phone, amount, purpose, provider, status, merchant_request_id, checkout_request_id, external_reference, description, metadata, date_created, date_updated, date_completed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.user_id ?? null,
            payload.shop_id ?? null,
            payload.phone,
            payload.amount,
            payload.purpose,
            PAYMENT_PROVIDER,
            payload.status,
            payload.merchant_request_id ?? null,
            payload.checkout_request_id ?? null,
            payload.external_reference ?? null,
            payload.description ?? null,
            payload.metadata ?? null,
            payload.date_created ?? nowTs(),
            payload.date_updated ?? nowTs(),
            payload.date_completed ?? -1
        ]
    )
    return result.insertId
}

async function getPaymentById(connection, paymentId) {
    const [rows] = await connection.query(
        `SELECT id, user_id, shop_id, phone, amount, purpose, provider, status, merchant_request_id,
                checkout_request_id, mpesa_receipt_number, external_reference, description, metadata,
                callback_payload, failure_reason, date_created, date_updated, date_completed
         FROM PaymentAttempt
         WHERE id = ?
         LIMIT 1`,
        [paymentId]
    )
    return rows?.[0] ?? null
}

async function updatePaymentById(connection, paymentId, data) {
    await connection.query(
        `UPDATE PaymentAttempt
         SET status = ?,
             merchant_request_id = COALESCE(?, merchant_request_id),
             checkout_request_id = COALESCE(?, checkout_request_id),
             mpesa_receipt_number = COALESCE(?, mpesa_receipt_number),
             callback_payload = COALESCE(?, callback_payload),
             failure_reason = COALESCE(?, failure_reason),
             date_updated = ?,
             date_completed = ?
         WHERE id = ?`,
        [
            data.status,
            data.merchant_request_id ?? null,
            data.checkout_request_id ?? null,
            data.mpesa_receipt_number ?? null,
            data.callback_payload ?? null,
            data.failure_reason ?? null,
            nowTs(),
            data.date_completed ?? -1,
            paymentId
        ]
    )
}

async function updatePaymentByCheckout(connection, checkoutRequestId, data) {
    await connection.query(
        `UPDATE PaymentAttempt
         SET status = ?,
             merchant_request_id = COALESCE(?, merchant_request_id),
             mpesa_receipt_number = COALESCE(?, mpesa_receipt_number),
             callback_payload = COALESCE(?, callback_payload),
             failure_reason = COALESCE(?, failure_reason),
             date_updated = ?,
             date_completed = ?
         WHERE checkout_request_id = ?`,
        [
            data.status,
            data.merchant_request_id ?? null,
            data.mpesa_receipt_number ?? null,
            data.callback_payload ?? null,
            data.failure_reason ?? null,
            nowTs(),
            data.date_completed ?? -1,
            checkoutRequestId
        ]
    )
}

async function ensureSchema(connection) {
    await connection.query(`
        CREATE TABLE IF NOT EXISTS PaymentAttempt(
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT DEFAULT NULL,
            shop_id INT DEFAULT NULL,
            phone VARCHAR(25) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            purpose VARCHAR(40) NOT NULL,
            provider VARCHAR(20) NOT NULL DEFAULT 'mpesa',
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            merchant_request_id VARCHAR(120) DEFAULT NULL,
            checkout_request_id VARCHAR(120) DEFAULT NULL,
            mpesa_receipt_number VARCHAR(120) DEFAULT NULL,
            external_reference VARCHAR(120) DEFAULT NULL,
            description TEXT NOT NULL,
            metadata TEXT DEFAULT NULL,
            callback_payload LONGTEXT DEFAULT NULL,
            failure_reason TEXT DEFAULT NULL,
            date_created BIGINT NOT NULL DEFAULT (UNIX_TIMESTAMP()),
            date_updated BIGINT NOT NULL DEFAULT (UNIX_TIMESTAMP()),
            date_completed BIGINT NOT NULL DEFAULT -1,
            INDEX idx_payment_user_purpose (user_id, purpose, status),
            INDEX idx_payment_shop_purpose (shop_id, purpose, status),
            UNIQUE KEY uniq_checkout_request_id (checkout_request_id),
            FOREIGN KEY (user_id) REFERENCES User(id),
            FOREIGN KEY (shop_id) REFERENCES Shop(id)
        )
    `)
}

function purposeDefaults(purpose) {
    if (purpose === LOGIN_VALIDATION_PURPOSE) {
        return {
            amount: 1,
            description: 'Kitabu business ownership login validation'
        }
    }
    return {
        amount: 0,
        description: 'Kitabu subscription payment'
    }
}

function createDarajaPassword(shortCode, passkey, timestamp) {
    return Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64')
}

async function getDarajaAccessToken() {
    const consumerKey = process.env.MPESA_CONSUMER_KEY
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET
    const baseUrl = process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke'

    if (!consumerKey || !consumerSecret) {
        throw new Error('Missing M-Pesa consumer credentials')
    }

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
    const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        method: 'GET',
        headers: {
            Authorization: `Basic ${auth}`
        }
    })

    if (!response.ok) {
        throw new Error(`Failed to fetch M-Pesa access token (${response.status})`)
    }

    const data = await response.json()
    if (!data?.access_token) {
        throw new Error('M-Pesa access token missing from response')
    }
    return data.access_token
}

async function initiateDarajaStkPush({ phone, amount, externalReference, description }) {
    const shortCode = process.env.MPESA_SHORTCODE
    const passkey = process.env.MPESA_PASSKEY
    const callbackUrl = process.env.MPESA_CALLBACK_URL
    const baseUrl = process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke'

    if (!shortCode || !passkey || !callbackUrl) {
        throw new Error('Missing M-Pesa shortcode, passkey, or callback URL')
    }

    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
    const accessToken = await getDarajaAccessToken()
    const response = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            BusinessShortCode: shortCode,
            Password: createDarajaPassword(shortCode, passkey, timestamp),
            Timestamp: timestamp,
            TransactionType: process.env.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline',
            Amount: Math.round(Number(amount)),
            PartyA: phone,
            PartyB: shortCode,
            PhoneNumber: phone,
            CallBackURL: callbackUrl,
            AccountReference: externalReference,
            TransactionDesc: description
        })
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok || data?.ResponseCode !== '0') {
        throw new Error(data?.errorMessage || data?.ResponseDescription || `Failed to initiate STK push (${response.status})`)
    }

    return {
        merchantRequestId: data.MerchantRequestID,
        checkoutRequestId: data.CheckoutRequestID,
        customerMessage: data.CustomerMessage || data.ResponseDescription || 'STK push sent'
    }
}

function shouldUseMockMpesa() {
    return `${process.env.MPESA_MOCK_MODE ?? 'true'}`.toLowerCase() !== 'false'
}

module.exports.request = async function request(connection, payload, res) {
    try {
        const purpose = `${payload?.purpose ?? ''}`.trim()
        if (![LOGIN_VALIDATION_PURPOSE, SUBSCRIPTION_PURPOSE].includes(purpose)) {
            res.status(400).send({ error: 'Unsupported payment purpose' })
            return
        }

        const phone = normalizePhone(payload?.phone)
        if (!phone) {
            res.status(400).send({ error: 'Phone number is required' })
            return
        }

        const defaults = purposeDefaults(purpose)
        const amount = Number(payload?.amount ?? defaults.amount)
        if (!Number.isFinite(amount) || amount <= 0) {
            res.status(400).send({ error: 'Amount must be greater than zero' })
            return
        }

        let userRecord = null
        let shopRecord = null
        if (purpose === LOGIN_VALIDATION_PURPOSE) {
            userRecord = await findUserByPhone(connection, phone)
            if (!userRecord) {
                res.status(404).send({ error: 'Account not found for this phone number' })
                return
            }
            shopRecord = await findShopByOwner(connection, userRecord.id)
            if (!shopRecord) {
                res.status(404).send({ error: 'No shop found for this account' })
                return
            }
        }

        const referencePrefix = purpose === LOGIN_VALIDATION_PURPOSE ? 'LOGIN' : 'SUB'
        const externalReference = `${referencePrefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
        const metadata = JSON.stringify({
            requested_amount: amount,
            requested_phone: phone,
            requested_purpose: purpose
        })

        if (shouldUseMockMpesa()) {
            const paymentId = await insertPayment(connection, {
                user_id: userRecord?.id ?? payload?.user_id ?? null,
                shop_id: shopRecord?.id ?? payload?.shop_id ?? null,
                phone,
                amount,
                purpose,
                status: PAYMENT_STATUS.COMPLETED,
                merchant_request_id: `mock-merchant-${Date.now()}`,
                checkout_request_id: `mock-checkout-${Date.now()}`,
                external_reference: externalReference,
                description: payload?.description || defaults.description,
                metadata,
                date_completed: nowTs()
            })
            const payment = await getPaymentById(connection, paymentId)
            res.send({
                payment_id: paymentId,
                status: payment?.status,
                purpose,
                amount,
                phone,
                external_reference: externalReference,
                customer_message: 'Mock M-Pesa payment completed. Set MPESA_MOCK_MODE=false to use a real STK push.',
                requires_polling: false
            })
            return
        }

        const stk = await initiateDarajaStkPush({
            phone,
            amount,
            externalReference,
            description: payload?.description || defaults.description
        })
        const paymentId = await insertPayment(connection, {
            user_id: userRecord?.id ?? payload?.user_id ?? null,
            shop_id: shopRecord?.id ?? payload?.shop_id ?? null,
            phone,
            amount,
            purpose,
            status: PAYMENT_STATUS.PENDING,
            merchant_request_id: stk.merchantRequestId,
            checkout_request_id: stk.checkoutRequestId,
            external_reference: externalReference,
            description: payload?.description || defaults.description,
            metadata
        })
        res.send({
            payment_id: paymentId,
            status: PAYMENT_STATUS.PENDING,
            purpose,
            amount,
            phone,
            external_reference: externalReference,
            checkout_request_id: stk.checkoutRequestId,
            merchant_request_id: stk.merchantRequestId,
            customer_message: stk.customerMessage,
            requires_polling: true
        })
    } catch (error) {
        res.status(500).send({
            error: error instanceof Error ? error.message : 'Failed to initiate M-Pesa payment'
        })
    }
}

module.exports.status = async function status(connection, paymentId, res) {
    const payment = await getPaymentById(connection, paymentId)
    if (!payment) {
        res.status(404).send({ error: 'Payment not found' })
        return
    }

    res.send({
        payment_id: payment.id,
        status: payment.status,
        purpose: payment.purpose,
        amount: Number(payment.amount),
        phone: payment.phone,
        mpesa_receipt_number: payment.mpesa_receipt_number,
        checkout_request_id: payment.checkout_request_id,
        merchant_request_id: payment.merchant_request_id,
        failure_reason: payment.failure_reason,
        date_completed: payment.date_completed
    })
}

module.exports.completeLogin = async function completeLogin(connection, payload, res) {
    const paymentId = Number(payload?.payment_id)
    if (!Number.isFinite(paymentId) || paymentId <= 0) {
        res.status(400).send({ error: 'Valid payment id is required' })
        return
    }

    const payment = await getPaymentById(connection, paymentId)
    if (!payment || payment.purpose !== LOGIN_VALIDATION_PURPOSE) {
        res.status(404).send({ error: 'Login payment not found' })
        return
    }

    if (payment.status !== PAYMENT_STATUS.COMPLETED) {
        res.status(409).send({ error: 'Payment has not been completed yet' })
        return
    }

    const [userRows] = await connection.query(
        `SELECT id, fname, lname, phone FROM User WHERE id = ? LIMIT 1`,
        [payment.user_id]
    )
    const [shopRows] = await connection.query(
        `SELECT id, sname, shop_owner FROM Shop WHERE id = ? LIMIT 1`,
        [payment.shop_id]
    )

    const user = userRows?.[0]
    const shop = shopRows?.[0]
    if (!user || !shop) {
        res.status(404).send({ error: 'Account details could not be loaded' })
        return
    }

    res.send({
        id: user.id,
        fname: user.fname,
        lname: user.lname,
        phone: user.phone,
        shop_id: shop.id,
        sname: shop.sname,
        payment_id: payment.id,
        payment_validated: true
    })
}

module.exports.callback = async function callback(connection, payload, res) {
    const callback = payload?.Body?.stkCallback
    const checkoutRequestId = callback?.CheckoutRequestID
    if (!checkoutRequestId) {
        res.status(400).send({ ResultCode: 1, ResultDesc: 'CheckoutRequestID missing' })
        return
    }

    const resultCode = Number(callback?.ResultCode)
    const metadataItems = callback?.CallbackMetadata?.Item ?? []
    const metadataMap = metadataItems.reduce((acc, item) => {
        if (item?.Name) {
            acc[item.Name] = item.Value
        }
        return acc
    }, {})

    const status = resultCode === 0 ? PAYMENT_STATUS.COMPLETED : PAYMENT_STATUS.FAILED
    await updatePaymentByCheckout(connection, checkoutRequestId, {
        status,
        merchant_request_id: callback?.MerchantRequestID,
        mpesa_receipt_number: metadataMap.MpesaReceiptNumber ?? null,
        callback_payload: JSON.stringify(payload),
        failure_reason: resultCode === 0 ? null : callback?.ResultDesc ?? 'Payment failed',
        date_completed: resultCode === 0 ? nowTs() : -1
    })

    res.send({ ResultCode: 0, ResultDesc: 'Accepted' })
}

module.exports.ensureSchema = ensureSchema
