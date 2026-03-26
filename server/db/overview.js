module.exports.summary = async function(connection, shopId, fromTs, toTs, res) {
    const [salesRows] = await connection.query(
        `
            SELECT
                COUNT(*) AS sales_count,
                COALESCE(SUM(total_amount), 0) AS sales_total
            FROM Sale
            WHERE shop_id = ?
              AND sale_date BETWEEN ? AND ?;
        `,
        [shopId, fromTs, toTs]
    )

    const [expenseRows] = await connection.query(
        `
            SELECT
                COUNT(*) AS expense_count,
                COALESCE(SUM(amount), 0) AS expense_total
            FROM Expense
            WHERE shop_id = ?
              AND expense_date BETWEEN ? AND ?;
        `,
        [shopId, fromTs, toTs]
    )

    const [debtRows] = await connection.query(
        `
            SELECT
                COUNT(*) AS debt_issued_count,
                COALESCE(SUM(total_price), 0) AS debt_issued_total
            FROM Debt
            WHERE creditor_shop_id = ?
              AND date_issued BETWEEN ? AND ?;
        `,
        [shopId, fromTs, toTs]
    )

    const [settlementRows] = await connection.query(
        `
            SELECT
                COUNT(*) AS debt_payment_count,
                COALESCE(SUM(s.amount), 0) AS debt_paid_total
            FROM Settlement s
            INNER JOIN Debt d ON d.id = s.debt_id
            WHERE d.creditor_shop_id = ?
              AND s.settlement_date BETWEEN ? AND ?;
        `,
        [shopId, fromTs, toTs]
    )

    const [outstandingRows] = await connection.query(
        `
            SELECT
                SUM(
                    CASE
                        WHEN d.forgiven = FALSE AND COALESCE(s.full_settlement, 0) = 0
                        THEN 1 ELSE 0
                    END
                ) AS outstanding_count,
                COALESCE(SUM(
                    CASE
                        WHEN d.forgiven = FALSE AND COALESCE(s.full_settlement, 0) = 0
                        THEN d.total_price - COALESCE(s.total_paid, 0) ELSE 0
                    END
                ), 0) AS outstanding_total
            FROM Debt d
            LEFT JOIN (
                SELECT
                    debt_id,
                    SUM(amount) AS total_paid,
                    MAX(CASE WHEN is_full_settlement = TRUE THEN 1 ELSE 0 END) AS full_settlement
                FROM Settlement
                GROUP BY debt_id
            ) s ON s.debt_id = d.id
            WHERE d.creditor_shop_id = ?;
        `,
        [shopId]
    )

    const [recentActivityRows] = await connection.query(
        `
            SELECT * FROM (
                SELECT
                    'sale' AS kind,
                    sale_date AS activity_date,
                    CONCAT(COALESCE(p.pname, 'General sale'), ' sale') AS title,
                    total_amount AS amount,
                    notes
                FROM Sale s
                LEFT JOIN Product p ON p.id = s.product_id
                WHERE s.shop_id = ?
                  AND s.sale_date BETWEEN ? AND ?

                UNION ALL

                SELECT
                    'expense' AS kind,
                    expense_date AS activity_date,
                    CONCAT(category, ' expense') AS title,
                    amount,
                    notes
                FROM Expense
                WHERE shop_id = ?
                  AND expense_date BETWEEN ? AND ?

                UNION ALL

                SELECT
                    'debt' AS kind,
                    date_issued AS activity_date,
                    CONCAT(p.pname, ' credit issued') AS title,
                    total_price AS amount,
                    COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.fname, ''), ' ', COALESCE(u.lname, ''))), ''), d.comments, 'Customer not specified') AS notes
                FROM Debt d
                INNER JOIN Product p ON p.id = d.product_id
                LEFT JOIN User u ON u.id = d.debtor_user_id
                WHERE d.creditor_shop_id = ?
                  AND d.date_issued BETWEEN ? AND ?
            ) activity
            ORDER BY activity_date DESC
            LIMIT 8;
        `,
        [shopId, fromTs, toTs, shopId, fromTs, toTs, shopId, fromTs, toTs]
    )

    const sales = salesRows?.[0] ?? {}
    const expenses = expenseRows?.[0] ?? {}
    const debts = debtRows?.[0] ?? {}
    const settlements = settlementRows?.[0] ?? {}
    const outstanding = outstandingRows?.[0] ?? {}

    res.json({
        sales_count: Number(sales.sales_count ?? 0),
        sales_total: Number(sales.sales_total ?? 0),
        expense_count: Number(expenses.expense_count ?? 0),
        expense_total: Number(expenses.expense_total ?? 0),
        debt_issued_count: Number(debts.debt_issued_count ?? 0),
        debt_issued_total: Number(debts.debt_issued_total ?? 0),
        debt_payment_count: Number(settlements.debt_payment_count ?? 0),
        debt_paid_total: Number(settlements.debt_paid_total ?? 0),
        outstanding_count: Number(outstanding.outstanding_count ?? 0),
        outstanding_total: Number(outstanding.outstanding_total ?? 0),
        net_flow: Number(sales.sales_total ?? 0) - Number(expenses.expense_total ?? 0),
        recent_activity: recentActivityRows ?? []
    })
}
