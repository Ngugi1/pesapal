const util = require('./util')
const {DebtErrorCodes} = require('./errors')

function normalizeRange(fromTs, toTs) {
    const now = Math.floor(Date.now() / 1000)
    const from = Number(fromTs)
    const to = Number(toTs)
    return {
        from: Number.isFinite(from) && from > 0 ? Math.floor(from) : 0,
        to: Number.isFinite(to) && to > 0 ? Math.floor(to) : now
    }
}
module.exports.create = async function(connection, debt, res) {
    if(!debt) {
        util.error(res, "Debt item not provided", DebtErrorCodes.DEBT_DATA_NOT_PROVIDED)
        return
    }

    const columns = [
        "creditor_shop_id",
        "debtor_user_id",
        "product_id",
        "quantity",
        "unit_price",
        "comments"
    ]
    const values = [
        debt.creditor_shop_id,
        debt.debtor_user_id ?? null,
        debt.product_id,
        debt.quantity,
        debt.unit_price,
        debt.comments ?? ''
    ]

    const result = await util.insert(connection, "Debt", columns, values)
    if(result.insertId) {
        res.send({id: result.insertId, ...debt})
    }else {
        util.error(res, "Debt item could not be created", DebtErrorCodes.DEBT_CREATE_FAILED)
    }
}

module.exports.update = async function(connection, debtId, debt, res) {
    if (!debtId || !debt) {
        util.error(res, "Debt item not provided", DebtErrorCodes.DEBT_DATA_NOT_PROVIDED)
        return
    }

    const [settlements] = await connection.query(
        `
            SELECT COUNT(*) AS count
            FROM Settlement
            WHERE debt_id = ?;
        `,
        [debtId]
    )

    if ((settlements?.[0]?.count ?? 0) > 0) {
        util.error(res, "Settled debts cannot be edited", DebtErrorCodes.DEBT_UPDATE_FAILED)
        return
    }

    const [records] = await connection.query(
        `
            SELECT forgiven
            FROM Debt
            WHERE id = ?;
        `,
        [debtId]
    )

    if (!records?.length || records[0].forgiven) {
        util.error(res, "Forgiven debts cannot be edited", DebtErrorCodes.DEBT_UPDATE_FAILED)
        return
    }

    const columns = [
        "product_id",
        "quantity",
        "unit_price",
        "comments"
    ]
    const values = [
        debt.product_id,
        debt.quantity,
        debt.unit_price,
        debt.comments ?? ''
    ]

    const result = await util.updateById(connection, "Debt", debtId, columns, values)
    if (result.affectedRows) {
        res.send({ id: Number(debtId), ...debt, comments: debt.comments ?? '' })
    } else {
        util.error(res, "Debt item could not be updated", DebtErrorCodes.DEBT_UPDATE_FAILED)
    }
}

module.exports.settle = async function(connection, debtId, res) {
    
}

module.exports.forgive = async function(connection, debtId, res) {
    const [results] = await connection.query(
        `
            UPDATE Debt
            SET date_forgiven = UNIX_TIMESTAMP(), forgiven=TRUE
            WHERE id = ?; 
        `,
        [debtId]
    )
    if(results.changedRows) {
        res.send()
    }else{
        res.status(400).end()
    }
   
}

module.exports.remove = async function(connection, debtId, res) {
    const parsedDebtId = Number(debtId)
    if (!Number.isFinite(parsedDebtId) || parsedDebtId <= 0) {
        util.error(res, "Debt item could not be deleted", DebtErrorCodes.DEBT_DELETE_FAILED)
        return
    }

    const tx = typeof connection.getConnection === 'function'
        ? await connection.getConnection()
        : connection

    try {
        await tx.beginTransaction()

        const [settlementsHeader] = await tx.query(
            `
                DELETE FROM Settlement
                WHERE debt_id = ?;
            `,
            [parsedDebtId]
        )

        const [header] = await tx.query(
            `
                DELETE FROM Debt
                WHERE id = ?;
            `,
            [parsedDebtId]
        )

        if (!header.affectedRows) {
            await tx.rollback()
            util.error(res, "Debt item could not be deleted", DebtErrorCodes.DEBT_DELETE_FAILED)
            return
        }

        await tx.commit()
        res.send({
            message: "deleted",
            deleted: {
                debt: Number(header.affectedRows ?? 0),
                settlement: Number(settlementsHeader.affectedRows ?? 0),
                sale: 0,
                expense: 0,
                catalog: 0
            }
        })
    } catch (_error) {
        if (typeof tx.rollback === 'function') {
            try { await tx.rollback() } catch (_rollbackError) {}
        }
        util.error(res, "Debt item could not be deleted", DebtErrorCodes.DEBT_DELETE_FAILED)
    } finally {
        if (tx !== connection && typeof tx.release === 'function') {
            tx.release()
        }
    }
}

module.exports.getAll = async function(connection, shopId, fromTs, toTs, res) {
    const range = normalizeRange(fromTs, toTs)
    const [results] = await connection.query(
        `
            SELECT
                d.id,
                d.product_id,
                u.id as debtor_user_id,
                TRIM(CONCAT(COALESCE(u.fname, ''), ' ', COALESCE(u.lname, ''))) as debtor,
                u.phone as debtor_phone,
                d.comments,
                p.pname,
                d.quantity,
                d.unit_price,
                d.total_price
            FROM Debt d
            LEFT JOIN User u ON 
                u.id = d.debtor_user_id
            INNER JOIN Product p ON 
                p.id = d.product_id
            WHERE d.creditor_shop_id = ?
              AND d.date_issued BETWEEN ? AND ?
              AND d.forgiven = FALSE
              AND d.id NOT IN (
                SELECT debt_id FROM Settlement WHERE is_full_settlement = TRUE
              );
        `,
        [shopId, range.from, range.to]
    )
    res.send(results)

}

module.exports.listAll = async function(connection, shopId, fromTs, toTs, res) {
    const range = normalizeRange(fromTs, toTs)
    const [results] = await connection.query(
        `
            SELECT
                d.id,
                d.product_id,
                TRIM(CONCAT(COALESCE(u.fname, ''), ' ', COALESCE(u.lname, ''))) as debtor,
                u.phone as debtor_phone,
                d.comments,
                p.pname,
                d.quantity,
                d.unit_price,
                d.total_price,
                d.forgiven,
                d.date_issued,
                d.date_forgiven,
                COALESCE(s.total_paid, 0) as total_paid,
                COALESCE(s.full_settlement, 0) as full_settlement,
                COALESCE(s.has_settlement, 0) as has_settlement,
                s.last_settlement_date
            FROM Debt d
            LEFT JOIN User u ON 
                u.id = d.debtor_user_id
            INNER JOIN Product p ON 
                p.id = d.product_id
            LEFT JOIN (
                SELECT
                    debt_id,
                    SUM(amount) as total_paid,
                    MAX(CASE WHEN is_full_settlement = TRUE THEN 1 ELSE 0 END) as full_settlement,
                    COUNT(*) as has_settlement,
                    MAX(settlement_date) as last_settlement_date
                FROM Settlement
                GROUP BY debt_id
            ) s ON s.debt_id = d.id
            WHERE d.creditor_shop_id = ?
              AND d.date_issued BETWEEN ? AND ?;
        `,
        [shopId, range.from, range.to]
    )
    res.send(results)
}

module.exports.stats = async function(connection, shopId, fromTs, toTs, res) {
    const range = normalizeRange(fromTs, toTs)
    const [rows] = await connection.query(
        `
        SELECT
            COUNT(*) AS total_count,
            COALESCE(SUM(d.total_price), 0) AS total_amount,
            SUM(
                CASE
                    WHEN d.forgiven = FALSE
                    AND COALESCE(s.full_settlement, 0) = 0
                    THEN 1 ELSE 0
                END
            ) AS outstanding_count,
            COALESCE(SUM(
                CASE
                    WHEN d.forgiven = FALSE
                    AND COALESCE(s.full_settlement, 0) = 0
                    THEN d.total_price - COALESCE(s.total_paid, 0) ELSE 0
                END
            ), 0) AS outstanding_amount,
            SUM(
                CASE
                    WHEN COALESCE(s.total_paid, 0) > 0
                    THEN 1 ELSE 0
                END
            ) AS paid_count,
            COALESCE(SUM(COALESCE(s.total_paid, 0)), 0) AS paid_amount
        FROM Debt d
        LEFT JOIN (
            SELECT
                debt_id,
                SUM(amount) as total_paid,
                MAX(CASE WHEN is_full_settlement = TRUE THEN 1 ELSE 0 END) as full_settlement
            FROM Settlement
            GROUP BY debt_id
        ) s ON s.debt_id = d.id
        WHERE d.creditor_shop_id = ?
          AND d.date_issued BETWEEN ? AND ?;
        `,
        [shopId, range.from, range.to]
    )
    res.json(rows?.[0] ?? {
        total_count: 0,
        total_amount: 0,
        outstanding_count: 0,
        outstanding_amount: 0,
        paid_count: 0,
        paid_amount: 0
    })
}
