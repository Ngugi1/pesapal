import { useEffect, useState } from 'react'
import {useLocation} from 'react-router-dom'
import { apiUrl, post, processResponse } from './util'
import shopIcon from '../assets/shop-icon.png'
import './shopdisplay.css'
export function ShopDisplay() {
    const {state} = useLocation()
    console.log(state)
    const [shop, setShop] = useState(state ?? null)
    const [sessionChecked, setSessionChecked] = useState(false)
    const [debts, setDebts] = useState([])
    const [catalog, setCatalog] = useState([])
    const [products, setProducts] = useState([])
    const [catalogLoaded, setCatalogLoaded] = useState(false)
    const [stats, setStats] = useState({
        total_count: 0,
        total_amount: 0,
        outstanding_count: 0,
        outstanding_amount: 0,
        paid_count: 0,
        paid_amount: 0
    })
    const [statsLoaded, setStatsLoaded] = useState(false)
    const [settleTarget, setSettleTarget] = useState(null)
    const [settleAmount, setSettleAmount] = useState('')
    const [settleMode, setSettleMode] = useState('amount')
    const [settleQuantity, setSettleQuantity] = useState('')
    const [debtQuery, setDebtQuery] = useState('')
    const [debt, setDebt] = useState({
        creditor_shop_id: shop?.shop_id ?? shop?.id ?? null,
        product_id: -1,
        quantity: -1, 
        unit_price: -1,
        comments: ''
    })
    const [selectedProduct, setSelectedProduct] = useState(-1)
    const [selected, setSelected] = useState(-1)
    const [activeModal, setActiveModal] = useState<null | 'debt' | 'sale' | 'expense' | 'catalog'>(null)
    const [debtFilter, setDebtFilter] = useState('outstanding')
    const [expandedDebtId, setExpandedDebtId] = useState(null)
    const [overview, setOverview] = useState({
        sales_count: 0,
        sales_total: 0,
        expense_count: 0,
        expense_total: 0,
        debt_issued_count: 0,
        debt_issued_total: 0,
        debt_payment_count: 0,
        debt_paid_total: 0,
        outstanding_count: 0,
        outstanding_total: 0,
        net_flow: 0,
        recent_activity: []
    })
    const [sales, setSales] = useState([])
    const [expenses, setExpenses] = useState([])
    const [period, setPeriod] = useState('day')
    const [customFrom, setCustomFrom] = useState('')
    const [customTo, setCustomTo] = useState('')
    const [saleStatus, setSaleStatus] = useState('')
    const [expenseStatus, setExpenseStatus] = useState('')
    const [catalogStatus, setCatalogStatus] = useState('')
    const [saleForm, setSaleForm] = useState({
        product_id: '',
        quantity: '1',
        unit_price: '',
        notes: ''
    })
    const [expenseForm, setExpenseForm] = useState({
        category: '',
        amount: '',
        notes: ''
    })
    const [catalogForm, setCatalogForm] = useState({
        name: '',
        description: ''
    })
    const [setupStatus, setSetupStatus] = useState('')
    const [setupData, setSetupData] = useState({
        fname: '',
        lname: '',
        phone: '',
        shop: ''
    })
    const [setupMode, setSetupMode] = useState('signup')
    console.log(state)
    const shopId = shop?.shop_id ?? shop?.id
    const needsSetup = !shopId
    const displayShop = shop ?? { sname: 'Your Shop' }
    const [showScrollTop, setShowScrollTop] = useState(false)
    const currentYear = new Date().getFullYear()

    useEffect(() => {
        let cancelled = false

        async function restoreSession() {
            const clearSession = () => {
                localStorage.removeItem('kitabu_session')
                if (!cancelled) {
                    setShop(null)
                }
            }

            const validateSession = async (session: any) => {
                if (!session?.id || !session?.phone || !session?.shop_id) {
                    clearSession()
                    return
                }

                try {
                    const [userRes, shopRes] = await Promise.all([
                        fetch(apiUrl(`/user/phone/${encodeURIComponent(session.phone)}`)),
                        fetch(apiUrl(`/shop/owner/${session.id}`))
                    ])

                    if (cancelled) return

                    if (userRes.status !== 200 || shopRes.status !== 200) {
                        clearSession()
                        return
                    }

                    const userData = await userRes.json()
                    const shopData = await shopRes.json()

                    if (userData?.id !== session.id || shopData?.id !== session.shop_id) {
                        clearSession()
                        return
                    }

                    const nextSession = {
                        ...session,
                        id: userData.id,
                        fname: userData.fname ?? session.fname,
                        lname: userData.lname ?? session.lname,
                        phone: userData.phone ?? session.phone,
                        shop_id: shopData.id,
                        sname: shopData.sname ?? session.sname
                    }

                    localStorage.setItem('kitabu_session', JSON.stringify(nextSession))
                    setShop(nextSession)
                } catch {
                    clearSession()
                }
            }

            const source = state ?? (() => {
                const saved = localStorage.getItem('kitabu_session')
                if (!saved) return null
                try {
                    return JSON.parse(saved)
                } catch {
                    return null
                }
            })()

            if (source) {
                await validateSession(source)
            } else if (!cancelled) {
                setShop(null)
            }

            if (!cancelled) {
                setSessionChecked(true)
            }
        }

        restoreSession()

        return () => {
            cancelled = true
        }
    }, [state])

    useEffect(() => {
        const onScroll = () => {
            setShowScrollTop(window.scrollY > 360)
        }
        window.addEventListener('scroll', onScroll, { passive: true })
        onScroll()
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    const formatMoney = (value) => {
        const amount = Number(value) || 0
        return amount.toFixed(2)
    }

    const formatCompactValue = (value) => {
        const amount = Number(value) || 0
        const abs = Math.abs(amount)
        if (abs >= 1000000) {
            return `${(amount / 1000000).toFixed(abs >= 10000000 ? 0 : 1).replace(/\.0$/, '')}m`
        }
        if (abs >= 1000) {
            return `${(amount / 1000).toFixed(abs >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`
        }
        if (Number.isInteger(amount)) return `${amount}`
        return amount.toFixed(2)
    }

    const fromDateTimeInput = (value) => {
        if (!value) return null
        const parsed = new Date(value).getTime()
        if (!Number.isFinite(parsed)) return null
        return Math.floor(parsed / 1000)
    }

    const getRange = () => {
        const now = new Date()
        const end = Math.floor(now.getTime() / 1000)
        if (period === 'custom') {
            const customStart = fromDateTimeInput(customFrom)
            const customEnd = fromDateTimeInput(customTo)
            return {
                from: customStart ?? end - 86400,
                to: customEnd ?? end
            }
        }

        const start = new Date(now)
        if (period === 'day') {
            start.setHours(0, 0, 0, 0)
        } else if (period === 'week') {
            const day = start.getDay()
            const diff = day === 0 ? -6 : 1 - day
            start.setDate(start.getDate() + diff)
            start.setHours(0, 0, 0, 0)
        } else if (period === 'month') {
            start.setDate(1)
            start.setHours(0, 0, 0, 0)
        } else if (period === 'year') {
            start.setMonth(0, 1)
            start.setHours(0, 0, 0, 0)
        }

        return {
            from: Math.floor(start.getTime() / 1000),
            to: end
        }
    }

    const queryString = () => {
        const range = getRange()
        return `from=${range.from}&to=${range.to}`
    }

    const uniqueById = (items, idKey) => {
        const seen = new Set()
        return items.filter((item) => {
            const key = item?.[idKey]
            if (seen.has(key)) return false
            seen.add(key)
            return true
        })
    }

    const parseNumber = (value) => {
        const num = Number(value)
        return Number.isFinite(num) ? num : NaN
    }

    const formatTs = (ts) => {
        if (!ts || ts === -1) return null
        const ms = Number(ts) * 1000
        if (!Number.isFinite(ms)) return null
        return new Date(ms).toLocaleString()
    }

    const normalizeAmount = (value) => {
        if (!Number.isFinite(value)) return NaN
        return Math.round(value * 100) / 100
    }

    const calcAmountFromQuantity = (qtyValue, unitPriceValue) => {
        const qty = parseInt(qtyValue, 10)
        const unitPrice = parseNumber(unitPriceValue)
        if (!Number.isFinite(qty) || !Number.isFinite(unitPrice)) return NaN
        return normalizeAmount(qty * unitPrice)
    }

    const uniqueCatalog = uniqueById(catalog, 'product_id')
    const uniqueProducts = uniqueById(products, 'id')
    useEffect(() => {
        if (!shopId) return
        fetch(apiUrl(`/catalog/shop/${shopId}`)).then((res) => {
            if(res.status === 200) {
                res.json().then((value) => {
                    console.log("----------- Catalog:::::::", value)
                    setCatalog(value)
                    setCatalogLoaded(true)
                    if (value?.length && debt.product_id === -1) {
                        setDebt((old) => ({
                            ...old,
                            product_id: value[0].product_id
                        }))
                    }
                })
            } else {
                setCatalogLoaded(true)
            }
        }).catch(() => setCatalogLoaded(true))
    }, [shopId])

    function loadDebts() {
        if (!shopId) return
        fetch(apiUrl(`/debt/list/${shopId}`)).then((value) => {
            if(value.status === 200) {
                value.json().then((data) => {
                   setDebts(data)
                })
            }
        })
    }

    function loadProducts() {
        fetch(apiUrl('/product/all')).then((res) => {
            res.json().then((v) => {
                setProducts(v)
                if (v?.length && selectedProduct === -1) {
                    setSelectedProduct(v[0].id)
                }
            })
        })
    }

    function loadStats() {
        if (!shopId) return
        fetch(apiUrl(`/debt/stats/${shopId}`)).then((res) => {
            if (res.status === 200) {
                res.json().then((data) => {
                    setStats(data)
                    setStatsLoaded(true)
                })
            } else {
                setStatsLoaded(true)
            }
        }).catch(() => setStatsLoaded(true))
    }

    function loadOverview() {
        if (!shopId) return
        fetch(apiUrl(`/overview/${shopId}?${queryString()}`)).then((res) => {
            if (res.status === 200) {
                res.json().then((data) => {
                    setOverview(data)
                })
            }
        }).catch(() => undefined)
    }

    function loadSales() {
        if (!shopId) return
        fetch(apiUrl(`/sale/list/${shopId}?${queryString()}`)).then((res) => {
            if (res.status === 200) {
                res.json().then((data) => setSales(data))
            }
        })
    }

    function loadExpenses() {
        if (!shopId) return
        fetch(apiUrl(`/expense/list/${shopId}?${queryString()}`)).then((res) => {
            if (res.status === 200) {
                res.json().then((data) => setExpenses(data))
            }
        })
    }

    useEffect(() => {
        loadOverview()
    }, [shopId, period, customFrom, customTo])

    useEffect(() => {
        if(selected === -1) {
            loadDebts()
            loadSales()
            loadExpenses()
            loadProducts()
        } else if(selected === 0) {
            loadDebts()
            loadStats()
        }else if (selected === 1) {
            loadSales()
            loadProducts()
        }else if (selected === 2) {
            loadExpenses()
        }else if (selected === 3) {
            loadProducts()
        }
    }, [selected, shopId, period, customFrom, customTo])

    useEffect(() => {
        if (shopId && debt.creditor_shop_id !== shopId) {
            setDebt((old) => ({
                ...old,
                creditor_shop_id: shopId
            }))
        }
    }, [shopId, debt.creditor_shop_id])

    useEffect(() => {
        if (catalog?.length && debt.product_id === -1) {
            setDebt((old) => ({
                ...old,
                product_id: catalog[0].product_id
            }))
        }
    }, [catalog, debt.product_id])

    const filteredSales = sales.filter((sale) => {
        const q = debtQuery.trim().toLowerCase()
        if (!q) return true
        return `${sale?.product_name ?? ''} ${sale?.notes ?? ''}`.toLowerCase().includes(q)
    })

    const filteredExpenses = expenses.filter((expense) => {
        const q = debtQuery.trim().toLowerCase()
        if (!q) return true
        return `${expense?.category ?? ''} ${expense?.notes ?? ''}`.toLowerCase().includes(q)
    })

    const filteredDebts = debts.filter((d) => {
        const hasSettlement = Number(d.has_settlement) > 0 || Number(d.total_paid) > 0
        const isFull = Number(d.full_settlement) === 1
        const isForgiven = d.forgiven === true || Number(d.forgiven) === 1
        const isPartial = hasSettlement && !isFull
        switch (debtFilter) {
            case 'paid':
                return hasSettlement
            case 'forgiven':
                return isForgiven
            case 'fully':
                return isFull
            case 'partial':
                return isPartial
            case 'outstanding':
                return !isForgiven && !isFull
            default:
                return true
        }
    }).filter((d) => {
        const q = debtQuery.trim().toLowerCase()
        if (!q) return true
        const debtor = `${d?.debtor ?? ''}`.toLowerCase()
        const product = `${d?.pname ?? ''}`.toLowerCase()
        const phone = `${d?.debtor_phone ?? d?.phone ?? ''}`.toLowerCase()
        const comments = `${d?.comments ?? ''}`.toLowerCase()
        return debtor.includes(q) || product.includes(q) || phone.includes(q) || comments.includes(q)
    })

    const recentDebts = [...filteredDebts]
        .sort((a, b) => Number(b?.date_issued ?? 0) - Number(a?.date_issued ?? 0))
        .slice(0, 1)

    const recentSales = filteredSales.slice(0, 1)
    const recentExpenses = filteredExpenses.slice(0, 1)
    const recentCatalog = uniqueCatalog.slice(0, 1)

    const debtTotals = debts.reduce((acc, d) => {
        const totalPrice = Number(d.total_price) || 0
        const totalPaid = Number(d.total_paid) || 0
        const isForgiven = d.forgiven === true || Number(d.forgiven) === 1
        const isFull = Number(d.full_settlement) === 1
        const hasSettlement = Number(d.has_settlement) > 0 || totalPaid > 0
        const isPartial = hasSettlement && !isFull
        acc.all.count += 1
        acc.all.amount += totalPrice
        if (isForgiven) {
            acc.forgiven.count += 1
            acc.forgiven.amount += Math.max(totalPrice - totalPaid, 0)
        } else if (isFull) {
            acc.fully.count += 1
            acc.fully.amount += totalPaid || totalPrice
        } else if (isPartial) {
            acc.partial.count += 1
            acc.partial.amount += totalPaid
            acc.outstanding.count += 1
            acc.outstanding.amount += Math.max(totalPrice - totalPaid, 0)
        } else {
            acc.outstanding.count += 1
            acc.outstanding.amount += totalPrice
        }
        if (totalPaid > 0) {
            acc.paid.count += 1
            acc.paid.amount += totalPaid
        }
        return acc
    }, {
        all: { count: 0, amount: 0 },
        paid: { count: 0, amount: 0 },
        outstanding: { count: 0, amount: 0 },
        forgiven: { count: 0, amount: 0 },
        partial: { count: 0, amount: 0 },
        fully: { count: 0, amount: 0 }
    })

    const currentTotals = (() => {
        switch (debtFilter) {
            case 'paid':
                return { label: 'Paid total', ...debtTotals.paid }
            case 'forgiven':
                return { label: 'Forgiven total', ...debtTotals.forgiven }
            case 'fully':
                return { label: 'Fully paid total', ...debtTotals.fully }
            case 'partial':
                return { label: 'Partially paid total', ...debtTotals.partial }
            case 'outstanding':
                return { label: 'Balance total', ...debtTotals.outstanding }
            default:
                return { label: 'Grand total', ...debtTotals.all }
        }
    })()

    function forgiveDebt(debt) {
        post(apiUrl(`/debt/forgive/${debt.id}`), {})
        .then((res) => {
            if(res.status == 200) {
                setDebts((d) => {
                    return d.filter(item => item.id != debt.id)
                })
                loadStats()
            }else{
                alert("Something went wrong")
            }
        })
    }
    function settleDebt(debt, amountValue, quantityValue, mode) {
        const total = parseNumber(debt.total_price)
        const unitPrice = parseNumber(debt.unit_price)
        if (mode === 'quantity') {
            const quantity = parseInt(quantityValue, 10)
            if (!Number.isFinite(quantity) || quantity <= 0) {
                alert('Enter a valid quantity')
                return
            }
            if (!Number.isInteger(quantity)) {
                alert('Quantity must be a whole number')
                return
            }
            if (Number.isFinite(debt.quantity) && quantity > debt.quantity) {
                alert('Quantity exceeds outstanding quantity')
                return
            }
            if (!Number.isFinite(unitPrice)) {
                alert('Invalid unit price')
                return
            }
            const amount = normalizeAmount(quantity * unitPrice)
            if (!Number.isFinite(amount) || amount <= 0) {
                alert('Enter a valid settlement amount')
                return
            }
            const isFull = Number.isFinite(total) ? amount >= total : false
            submitSettlement(debt, amount, isFull)
            return
        }

        const amount = parseNumber(amountValue)
        if (!Number.isFinite(amount) || amount <= 0) {
            alert('Enter a valid settlement amount')
            return
        }
        if (Number.isFinite(total) && amount > total) {
            alert('Amount exceeds outstanding balance')
            return
        }
        const isFull = Number.isFinite(total) ? amount >= total : false
        submitSettlement(debt, amount, isFull)
    }

    function submitSettlement(debt, amount, isFull) {
        fetch(apiUrl('/debt/settle'), {
            method: 'PUT',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({debt_id: debt.id, amount, is_full_settlement: isFull, comments: isFull ? "Paid in full" : "Partial payment"})
        }).then((res) => {
            if(res.status === 200) {
                if (isFull) {
                    setDebts((old) => {
                        return old.filter(d => d.id != debt.id)
                    })
                } else {
                    loadDebts()
                }
                loadStats()
                setSettleTarget(null)
                setSettleAmount('')
                setSettleQuantity('')
                setSettleMode('amount')
            }else {
                alert('Settlement failed')
            }
        })

    }

    function removeCatalogItem(item) {
        fetch(apiUrl(`/catalog/remove/${item.shop_id}/${item.product_id}`), {
            method: 'DELETE'
        }).then((res) => {
            if(res.status === 200) {
                res.json().then((value) => {
                    setCatalog((old) => {
                        return old.filter(c => c.product_id !== item.product_id)
                    })
                })
            }
        })
    }

    function addToCatalog() {
        if (!shopId) {
            alert('Shop id missing. Please go back and open a shop.')
            return
        }
        const name = catalogForm.name.trim()
        if (!name) {
            setCatalogStatus('Enter a product name')
            return
        }
        setCatalogStatus('')
        post(apiUrl('/product/create'), {
            name,
            description: catalogForm.description.trim()
        }).then(async (productRes) => {
            const productData = await processResponse(productRes, 'Create product failed', setCatalogStatus)
            if (!productData?.id) return
            post(apiUrl('/catalog/create'), {shop_id: shopId, product_id: productData.id}).then((res) => {
                if(res.status === 200) {
                    fetch(apiUrl(`/catalog/shop/${shopId}`)).then((catalogRes) => {
                        if (catalogRes.status === 200) {
                            catalogRes.json().then((value) => {
                                setCatalog(value)
                                setCatalogForm({ name: '', description: '' })
                                setActiveModal(null)
                            })
                        }
                    })
                } else {
                    setCatalogStatus('Add to catalog failed')
                }
            })
        })
    }

    function addSale(e) {
        e.preventDefault()
        setSaleStatus('')
        if (!shopId) {
            setSaleStatus('Shop id missing')
            return
        }
        const quantity = parseInt(saleForm.quantity, 10)
        const unitPrice = parseFloat(saleForm.unit_price)
        if (!saleForm.product_id || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice <= 0) {
            setSaleStatus('Select item, quantity, and unit price')
            return
        }
        fetch(apiUrl('/sale/create'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                shop_id: shopId,
                product_id: parseInt(saleForm.product_id, 10),
                quantity,
                unit_price: unitPrice,
                notes: saleForm.notes
            })
        }).then(async (res) => {
            const jsonData = await processResponse(res, 'Add sale failed', setSaleStatus)
            if (jsonData) {
                setSaleForm({ product_id: saleForm.product_id, quantity: '1', unit_price: '', notes: '' })
                loadOverview()
                loadSales()
                setActiveModal(null)
            }
        })
    }

    function addExpense(e) {
        e.preventDefault()
        setExpenseStatus('')
        if (!shopId) {
            setExpenseStatus('Shop id missing')
            return
        }
        const amount = parseFloat(expenseForm.amount)
        if (!expenseForm.category || !Number.isFinite(amount) || amount <= 0) {
            setExpenseStatus('Provide category and amount')
            return
        }
        fetch(apiUrl('/expense/create'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                shop_id: shopId,
                category: expenseForm.category,
                amount,
                notes: expenseForm.notes
            })
        }).then(async (res) => {
            const jsonData = await processResponse(res, 'Add expense failed', setExpenseStatus)
            if (jsonData) {
                setExpenseForm({ category: '', amount: '', notes: '' })
                loadOverview()
                loadExpenses()
                setActiveModal(null)
            }
        })
    }

    function logout() {
        if (!window.confirm('Log out of Kitabu?')) {
            return
        }
        localStorage.removeItem('kitabu_session')
        setShop(null)
        setSelected(-1)
        setActiveModal(null)
        setDebtQuery('')
        setExpandedDebtId(null)
    }

    const range = getRange()
    const appBadgeShopName = displayShop.sname?.trim() || 'Your Shop'
    const periodLabel = period === 'custom'
        ? `${formatTs(range.from)} to ${formatTs(range.to)}`
        : period === 'day'
            ? 'Today'
            : period === 'week'
                ? 'This week'
                : period === 'month'
                    ? 'This month'
                    : 'This year'
    const showOverviewCards = selected === -1
    const debtFilterOptions = [
        { value: 'all', label: 'All' },
        { value: 'paid', label: 'Paid' },
        { value: 'forgiven', label: 'Forgiven' },
        { value: 'fully', label: 'Fully paid' },
        { value: 'partial', label: 'Partially paid' },
        { value: 'outstanding', label: 'Outstanding' }
    ]

    const topBar =  (
            <>
                <div className="app-badge">
                    <img src={shopIcon} alt="Kitabu app icon" className="app-badge-icon" />
                    <div className="app-badge-copy">
                        <span className="app-badge-label">Kitabu · {appBadgeShopName}</span>
                        <span className="app-badge-meta">Shop dashboard</span>
                    </div>
                </div>
                <div className="summary-header overview-row">
                    <div className="summary-stack">
                        <div className="region-title">{displayShop.sname}</div>
                        <label className="filter-select-wrap summary-inline-filter">
                            <span className="filter-select-label">Period</span>
                            <select className="compact-select" value={period} onChange={(e) => setPeriod(e.target.value)}>
                                <option value="day">Daily</option>
                                <option value="week">Weekly</option>
                                <option value="month">Monthly</option>
                                <option value="year">Yearly</option>
                                <option value="custom">Custom</option>
                            </select>
                        </label>
                    </div>
                    <div className="item-meta">{periodLabel}</div>
                </div>
                {period === 'custom' && (
                    <div className="custom-range-grid overview-row">
                        <label className="field-group">
                            <span className="field-label">From</span>
                            <input type="datetime-local" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                        </label>
                        <label className="field-group">
                            <span className="field-label">To</span>
                            <input type="datetime-local" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                        </label>
                    </div>
                )}
                {showOverviewCards && (
                <div className="overview-card-grid overview-row">
                    <article className="mini-stat-card overview-tile overview-span-left sales-card" onClick={() => setSelected(1)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelected(1) }}>
                        <div className="mini-stat-top">
                            <span className="mini-stat-icon positive">
                                <i className="fa-solid fa-money-bill-trend-up" aria-hidden="true" />
                            </span>
                            <button className="mini-add-button sale-add-button" type="button" onClick={(e) => { e.stopPropagation(); setActiveModal('sale') }}>+</button>
                        </div>
                        <span className="stat-label">Sales</span>
                        <span className="stat-value">{formatCompactValue(overview.sales_total)}</span>
                        <div className="mini-records">
                            {recentSales.length === 0 && <span className="mini-empty">No sales yet</span>}
                            {recentSales.map((sale) => (
                                <div className="mini-record" key={`sale-${sale.id}`}>
                                    <span className="mini-record-title">{sale.product_name}</span>
                                    <span className="mini-record-meta">{formatCompactValue(sale.total_amount)}</span>
                                </div>
                            ))}
                        </div>
                    </article>
                    <article className="mini-stat-card overview-tile overview-span-right expenses-card" onClick={() => setSelected(2)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelected(2) }}>
                        <div className="mini-stat-top">
                            <span className="mini-stat-icon warning">
                                <i className="fa-solid fa-money-bill-transfer" aria-hidden="true" />
                            </span>
                            <button className="mini-add-button expense-add-button" type="button" onClick={(e) => { e.stopPropagation(); setActiveModal('expense') }}>+</button>
                        </div>
                        <span className="stat-label">Expenses</span>
                        <span className="stat-value">{formatCompactValue(overview.expense_total)}</span>
                        <div className="mini-records">
                            {recentExpenses.length === 0 && <span className="mini-empty">No expenses yet</span>}
                            {recentExpenses.map((expense) => (
                                <div className="mini-record" key={`expense-${expense.id}`}>
                                    <span className="mini-record-title">{expense.category}</span>
                                    <span className="mini-record-meta">{formatCompactValue(expense.amount)}</span>
                                </div>
                            ))}
                        </div>
                    </article>
                    <article className="mini-stat-card overview-tile overview-span-left debt-card-overview" onClick={() => setSelected(0)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelected(0) }}>
                        <div className="mini-stat-top">
                            <span className="mini-stat-icon neutral">
                                <i className="fa-solid fa-file-invoice-dollar" aria-hidden="true" />
                            </span>
                            <button className="mini-add-button debt-add-button" type="button" onClick={(e) => { e.stopPropagation(); setActiveModal('debt') }}>+</button>
                        </div>
                        <span className="stat-label">Debt</span>
                        <span className="stat-value">{formatCompactValue(overview.outstanding_total)}</span>
                        <div className="mini-records">
                            {recentDebts.length === 0 && <span className="mini-empty">No debts yet</span>}
                            {recentDebts.map((debtItem) => (
                                <div className="mini-record" key={`debt-${debtItem.id}`}>
                                    <span className="mini-record-title">{debtItem.debtor || debtItem.comments || debtItem.pname}</span>
                                    <span className="mini-record-meta">{formatCompactValue(debtItem.total_price)}</span>
                                </div>
                            ))}
                        </div>
                    </article>
                    <article className="mini-stat-card overview-tile overview-span-right catalog-card" onClick={() => setSelected(3)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelected(3) }}>
                        <div className="mini-stat-top">
                            <span className="mini-stat-icon catalog">
                                <i className="fa-solid fa-box-open" aria-hidden="true" />
                            </span>
                            <button className="mini-add-button catalog-add-button" type="button" onClick={(e) => { e.stopPropagation(); setActiveModal('catalog') }}>+</button>
                        </div>
                        <span className="stat-label">Catalog</span>
                        <span className="stat-value">{catalog.length}</span>
                        <div className="mini-records">
                            {recentCatalog.length === 0 && <span className="mini-empty">No items yet</span>}
                            {recentCatalog.map((item) => (
                                <div className="mini-record" key={`catalog-${item.product_id}`}>
                                    <span className="mini-record-title">{item.pname}</span>
                                    <span className="mini-record-meta">{item.description || 'Catalog item'}</span>
                                </div>
                            ))}
                        </div>
                    </article>
                </div>
                )}
            </>
    )

    async function giveDebt(e) {
        e.preventDefault()
        if(!shopId) {
            alert('Shop id missing. Please go back and open a shop.')
            return
        }
        if (debt.product_id === -1 || debt.quantity === -1 || debt.unit_price === -1) {
            alert('Fill all fields')
            return
        }
        post(apiUrl('/debt/create'), {...debt, creditor_shop_id: shopId}).then((res) => {
            if(res.status === 200) {
                res.json().then(() => {
                    loadDebts()
                    loadStats()
                    loadOverview()
                    setDebt((old) => ({
                        ...old,
                        quantity: -1,
                        unit_price: -1,
                        comments: ''
                    }))
                    setActiveModal(null)
                })
            }
        })
    }

    const setupModal = needsSetup ? (
        <div className="modal-backdrop setup-backdrop">
            <div className="modal-card setup-card">
                <h3>Set up your shop</h3>
                <p className="page-subtitle">
                    You can explore the dashboard now. Add your details to activate full operations.
                </p>
                <form
                    className="setup-form"
                    onSubmit={async (e) => {
                        e.preventDefault()
                        setSetupStatus('')
                        if (setupMode === 'signup') {
                            const userRes = await post(apiUrl('/user/create'), {
                                fname: setupData.fname,
                                lname: setupData.lname,
                                phone: setupData.phone
                            })
                            const userData = await processResponse(userRes, 'Sign up Failed', setSetupStatus)
                            if (userData) {
                                const shopRes = await post(apiUrl('/shop/create'), {
                                    owner_id: userData.id,
                                    name: setupData.shop
                                })
                                const shopData = await processResponse(shopRes, 'Shop creation failed', setSetupStatus)
                                if (shopData) {
                                    const session = {
                                        shop_id: shopData.id,
                                        sname: setupData.shop,
                                        fname: setupData.fname,
                                        lname: setupData.lname,
                                        phone: setupData.phone,
                                        id: userData.id
                                    }
                                    localStorage.setItem('kitabu_session', JSON.stringify(session))
                                    setShop(session)
                                }
                            }
                        } else {
                            const userRes = await fetch(apiUrl(`/user/phone/${encodeURIComponent(setupData.phone)}`))
                            if (userRes.status !== 200) {
                                setSetupStatus('Account not found')
                                return
                            }
                            const userData = await userRes.json()
                            const shopRes = await fetch(apiUrl(`/shop/owner/${userData.id}`))
                            if (shopRes.status !== 200) {
                                setSetupStatus('No shop found for this account')
                                return
                            }
                            const shopData = await shopRes.json()
                            const session = {
                                shop_id: shopData.id,
                                sname: shopData.sname,
                                fname: userData.fname,
                                lname: userData.lname,
                                phone: userData.phone,
                                id: userData.id
                            }
                            localStorage.setItem('kitabu_session', JSON.stringify(session))
                            setShop(session)
                        }
                    }}
                >
                    {setupMode === 'signup' ? (
                        <>
                            <label className="field-group">
                                <span className="field-label">Shop name</span>
                                <input
                                    className="field-input"
                                    type="text"
                                    value={setupData.shop}
                                    onChange={(e) => setSetupData((old) => ({ ...old, shop: e.target.value }))}
                                    placeholder="Makini Shop"
                                    required
                                />
                            </label>
                            <label className="field-group">
                                <span className="field-label">First name</span>
                                <input
                                    className="field-input"
                                    type="text"
                                    value={setupData.fname}
                                    onChange={(e) => setSetupData((old) => ({ ...old, fname: e.target.value }))}
                                    placeholder="Mike"
                                    required
                                />
                            </label>
                            <label className="field-group">
                                <span className="field-label">Last name</span>
                                <input
                                    className="field-input"
                                    type="text"
                                    value={setupData.lname}
                                    onChange={(e) => setSetupData((old) => ({ ...old, lname: e.target.value }))}
                                    placeholder="Mills"
                                    required
                                />
                            </label>
                            <label className="field-group">
                                <span className="field-label">Phone number</span>
                                <input
                                    className="field-input"
                                    type="tel"
                                    value={setupData.phone}
                                    onChange={(e) => setSetupData((old) => ({ ...old, phone: e.target.value }))}
                                    placeholder="0712 345 678"
                                    required
                                />
                            </label>
                        </>
                    ) : (
                        <label className="field-group">
                            <span className="field-label">Phone number</span>
                            <input
                                className="field-input"
                                type="tel"
                                value={setupData.phone}
                                onChange={(e) => setSetupData((old) => ({ ...old, phone: e.target.value }))}
                                placeholder="0712 345 678"
                                required
                            />
                        </label>
                    )}
                    <div className="modal-actions">
                        <button className="primary-button" type="submit">
                            {setupMode === 'signup' ? 'Activate dashboard' : 'Log in'}
                        </button>
                    </div>
                    <button
                        type="button"
                        className="ghost-button"
                        onClick={() => {
                            setSetupStatus('')
                            setSetupMode(setupMode === 'signup' ? 'login' : 'signup')
                        }}
                    >
                        {setupMode === 'signup' ? 'Already have an account? Log in' : 'New here? Create an account'}
                    </button>
                    {setupStatus && <span className="status-text">{setupStatus}</span>}
                </form>
            </div>
        </div>
    ) : null

    const detailNav = (
        <div className="detail-nav">
            <button className="ghost-button" type="button" onClick={() => setSelected(-1)}>
                Back
            </button>
            <div className="app-badge detail-app-badge">
                <img src={shopIcon} alt="Kitabu app icon" className="app-badge-icon" />
                <div className="app-badge-copy">
                    <span className="app-badge-label">Kitabu · {appBadgeShopName}</span>
                    <span className="app-badge-meta">Shop dashboard</span>
                </div>
            </div>
            <button
                className="primary-button detail-add-button"
                type="button"
                onClick={() => setActiveModal(
                    selected === 0 ? 'debt' :
                    selected === 1 ? 'sale' :
                    selected === 2 ? 'expense' :
                    'catalog'
                )}
            >
                +
            </button>
        </div>
    )

    const pageFooter = (
        <div className="page-footer">
            <div className="footer-copy">© {currentYear} Kitabu</div>
            <button className="footer-logout-link" type="button" onClick={logout}>
                Log out
            </button>
        </div>
    )

    const actionModal = activeModal ? (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
            <div className="modal-card action-modal" onClick={(e) => e.stopPropagation()}>
                {activeModal === 'debt' && (
                    <>
                        <h3>Add debt</h3>
                        <p className="page-subtitle">Record what was taken on credit and note the name or phone number.</p>
                        <form className="quick-entry-form" onSubmit={giveDebt}>
                            <label className="field-group">
                                <span className="field-label">Catalog item</span>
                                <select
                                    value={debt.product_id}
                                    disabled={catalogLoaded && catalog.length === 0}
                                    onChange={(e) => setDebt((old) => ({ ...old, product_id: parseInt(e.target.value, 10) }))}
                                >
                                    {uniqueCatalog.map((c) => <option key={c.product_id} value={c.product_id}>{c.pname}</option>)}
                                </select>
                            </label>
                            <label className="field-group">
                                <span className="field-label">Quantity</span>
                                <input type="number" min="1" placeholder="Qty" onChange={(e) => setDebt((old) => ({ ...old, quantity: parseInt(e.target.value, 10) }))} />
                            </label>
                            <label className="field-group">
                                <span className="field-label">Unit price</span>
                                <input type="number" min="0" step="0.01" placeholder="Unit price" onChange={(e) => setDebt((old) => ({ ...old, unit_price: parseFloat(e.target.value) }))} />
                            </label>
                            <label className="field-group span-2">
                                <span className="field-label">Comments</span>
                                <input type="text" placeholder="Name / phone number" value={debt.comments} onChange={(e) => setDebt((old) => ({ ...old, comments: e.target.value }))} />
                            </label>
                            <div className="modal-actions span-2">
                                <button className="ghost-button" type="button" onClick={() => setActiveModal(null)}>Cancel</button>
                                <button className="primary-button" type="submit" disabled={catalogLoaded && catalog.length === 0}>Record debt</button>
                            </div>
                        </form>
                    </>
                )}
                {activeModal === 'sale' && (
                    <>
                        <h3>Add sale</h3>
                        <p className="page-subtitle">Capture a walk-in or cash sale.</p>
                        <form className="quick-entry-form" onSubmit={addSale}>
                            <label className="field-group">
                                <span className="field-label">Catalog item</span>
                                <select value={saleForm.product_id} onChange={(e) => setSaleForm((old) => ({ ...old, product_id: e.target.value }))}>
                                    <option value="">Select item</option>
                                    {uniqueCatalog.map((c) => <option key={c.product_id} value={c.product_id}>{c.pname}</option>)}
                                </select>
                            </label>
                            <label className="field-group">
                                <span className="field-label">Quantity</span>
                                <input type="number" min="1" value={saleForm.quantity} onChange={(e) => setSaleForm((old) => ({ ...old, quantity: e.target.value }))} />
                            </label>
                            <label className="field-group">
                                <span className="field-label">Unit price</span>
                                <input type="number" min="0" step="0.01" placeholder="0.00" value={saleForm.unit_price} onChange={(e) => setSaleForm((old) => ({ ...old, unit_price: e.target.value }))} />
                            </label>
                            <label className="field-group span-2">
                                <span className="field-label">Note</span>
                                <input type="text" placeholder="Optional note" value={saleForm.notes} onChange={(e) => setSaleForm((old) => ({ ...old, notes: e.target.value }))} />
                            </label>
                            <div className="modal-actions span-2">
                                <button className="ghost-button" type="button" onClick={() => setActiveModal(null)}>Cancel</button>
                                <button className="primary-button" type="submit">Add sale</button>
                            </div>
                        </form>
                    </>
                )}
                {activeModal === 'expense' && (
                    <>
                        <h3>Add expense</h3>
                        <p className="page-subtitle">Capture spend before it gets forgotten.</p>
                        <form className="quick-entry-form" onSubmit={addExpense}>
                            <label className="field-group">
                                <span className="field-label">Category</span>
                                <input type="text" placeholder="Stock, rent, transport" value={expenseForm.category} onChange={(e) => setExpenseForm((old) => ({ ...old, category: e.target.value }))} />
                            </label>
                            <label className="field-group">
                                <span className="field-label">Amount</span>
                                <input type="number" min="0" step="0.01" placeholder="0.00" value={expenseForm.amount} onChange={(e) => setExpenseForm((old) => ({ ...old, amount: e.target.value }))} />
                            </label>
                            <label className="field-group span-2">
                                <span className="field-label">Note</span>
                                <input type="text" placeholder="Optional note" value={expenseForm.notes} onChange={(e) => setExpenseForm((old) => ({ ...old, notes: e.target.value }))} />
                            </label>
                            <div className="modal-actions span-2">
                                <button className="ghost-button" type="button" onClick={() => setActiveModal(null)}>Cancel</button>
                                <button className="primary-button" type="submit">Record expense</button>
                            </div>
                        </form>
                    </>
                )}
                {activeModal === 'catalog' && (
                    <>
                        <h3>Add catalog item</h3>
                        <p className="page-subtitle">Type the product name and add it straight to your catalog.</p>
                        <form className="quick-entry-form" onSubmit={(e) => { e.preventDefault(); addToCatalog() }}>
                            <label className="field-group span-2">
                                <span className="field-label">Product name</span>
                                <input
                                    type="text"
                                    placeholder="Face Towel"
                                    value={catalogForm.name}
                                    onChange={(e) => setCatalogForm((old) => ({ ...old, name: e.target.value }))}
                                />
                            </label>
                            <label className="field-group span-2">
                                <span className="field-label">Description</span>
                                <input
                                    type="text"
                                    placeholder="Optional short description"
                                    value={catalogForm.description}
                                    onChange={(e) => setCatalogForm((old) => ({ ...old, description: e.target.value }))}
                                />
                            </label>
                            <div className="modal-actions span-2">
                                <span className="status-text">{catalogStatus}</span>
                                <button className="ghost-button" type="button" onClick={() => setActiveModal(null)}>Cancel</button>
                                <button className="primary-button" type="submit">Add to catalog</button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    ) : null

    if (!sessionChecked) {
        return (
            <div className="shop-page">
                <div className="panel glass debts-panel">
                    <div className="empty-state">Checking session...</div>
                </div>
            </div>
        )
    }

    if(selected === -1) {
        return <div className="shop-page home-page">
            {topBar}
            {setupModal}
            {actionModal}
            {pageFooter}
            {showScrollTop && (
                <button
                    className="scroll-top"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                    Back to top
                </button>
            )}
        </div>
    }

    if(selected === 0) {
        return <div className="shop-page detail-page debt-detail-page">
            {setupModal}
            {actionModal}
            {detailNav}
            <div className="debt-inline-zone detail-intro detail-intro-debt">
                <div className="inline-header">
                    <div>
                        <span className="detail-page-kicker">Debts detail</span>
                        <h2>Debt ledger</h2>
                        <p className="page-subtitle">
                            Review outstanding balances, open a record to see payment history, and settle or forgive debt when needed.
                        </p>
                    </div>
                </div>
                <div className="panel-search">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M15.5 14h-.8l-.3-.3a6.5 6.5 0 1 0-.7.7l.3.3v.8l4.8 4.8a1 1 0 0 0 1.4-1.4L15.5 14zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search debts"
                        value={debtQuery}
                        onChange={(e) => setDebtQuery(e.target.value)}
                    />
                </div>
                {catalogLoaded && catalog.length === 0 && (
                    <div className="notice-card">
                        <div className="notice-title">Catalog required</div>
                        <p className="notice-text">
                            Add at least one catalog item before recording a debt.
                            Switch to the Catalog tab to add items.
                        </p>
                        <button className="notice-link" onClick={() => setSelected(3)}>
                            Go to Catalog
                        </button>
                    </div>
                )}
            </div>
            <div className="panel glass debts-panel detail-scroll-panel debt-tone-panel">
                <div className="panel-header debts-header">
                    <label className="filter-select-wrap">
                        <span className="filter-select-label">Debt filter</span>
                        <select className="compact-select" value={debtFilter} onChange={(e) => setDebtFilter(e.target.value)}>
                            {debtFilterOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </label>
                </div>
                <div className="ledger-total">
                    <span className="ledger-label">{currentTotals.label}</span>
                    <span className="ledger-value">{currentTotals.amount.toFixed(2)}</span>
                    <span className="ledger-meta">{currentTotals.count} debts</span>
                </div>
                <div className="panel-list detail-scroll-list">
                    {filteredDebts.length === 0 && (
                        <div className="empty-state">No debts recorded yet.</div>
                    )}
                    {filteredDebts
                        .filter(d => d?.pname)
                        .map(d => {
                            const isForgiven = d.forgiven === true || Number(d.forgiven) === 1
                            const isFull = Number(d.full_settlement) === 1
                            const hasSettlement = Number(d.has_settlement) > 0 || Number(d.total_paid) > 0
                            const isPartial = hasSettlement && !isFull
                            const totalPaid = Number(d.total_paid) || 0
                            const totalPrice = Number(d.total_price) || 0
                            const remaining = Math.max(totalPrice - totalPaid, 0)
                            const issuedAt = formatTs(d.date_issued)
                            const settledAt = formatTs(d.last_settlement_date)
                            const debtorLabel = d.debtor || d.comments || 'Customer not specified'
                            const status = isForgiven
                                ? { label: 'Forgiven', className: 'status-tag forgiven', dot: 'dot-forgiven' }
                                : isFull
                                    ? { label: 'Fully paid', className: 'status-tag paid', dot: 'dot-paid' }
                                    : isPartial
                                        ? { label: 'Partially paid', className: 'status-tag partial', dot: 'dot-partial' }
                                        : { label: 'Outstanding', className: 'status-tag outstanding', dot: 'dot-outstanding' }
                            const isExpanded = expandedDebtId === d.id
                            const showStatusBadge = !(debtFilter === 'outstanding' && status.label === 'Outstanding')
                            return (
                        <div className={`list-item debt-card ${isExpanded ? 'expanded' : 'collapsed'}`} key={d.id}>
                            <button
                                className="debt-toggle"
                                onClick={() => setExpandedDebtId(isExpanded ? null : d.id)}
                                aria-expanded={isExpanded}
                                type="button"
                            >
                                <div>
                                    <div className="item-title">{debtorLabel}</div>
                                    <div className="item-meta">
                                        {d.debtor_phone ? `${d.debtor_phone} · ` : ''}
                                        {d.pname} · {d.quantity} × {d.unit_price}
                                    </div>
                                    {!d.debtor_phone && d.comments && (
                                        <div className="item-meta">{d.comments}</div>
                                    )}
                                </div>
                                <div className="debt-summary">
                                    <span className="total-value">Total {d.total_price}</span>
                                    {showStatusBadge && (
                                        <span className={status.className}>
                                            <span className={`status-dot ${status.dot}`} />
                                            {status.label}
                                        </span>
                                    )}
                                    <span className={`debt-chevron ${isExpanded ? 'expanded' : ''}`} aria-hidden="true">
                                        <svg viewBox="0 0 24 24">
                                            <path d="M6.7 9.3a1 1 0 0 1 1.4 0L12 13.2l3.9-3.9a1 1 0 1 1 1.4 1.4l-4.6 4.6a1 1 0 0 1-1.4 0l-4.6-4.6a1 1 0 0 1 0-1.4z" />
                                        </svg>
                                    </span>
                                </div>
                            </button>
                            {isExpanded && (
                                <>
                                    <div className="debt-main">
                                        {issuedAt && (
                                            <div className="item-meta timestamp-meta">Recorded {issuedAt}</div>
                                        )}
                                        {settledAt && (
                                            <div className="item-meta timestamp-meta">Last payment {settledAt}</div>
                                        )}
                                        {isPartial && (
                                            <div className="item-meta partial-meta">
                                                Paid {totalPaid} · Remaining {remaining}
                                            </div>
                                        )}
                                        {isFull && (
                                            <div className="item-meta partial-meta">
                                                Paid {totalPaid} · Remaining 0
                                            </div>
                                        )}
                                    </div>
                                    <div className="debt-total">
                                        <span className="total-label">Balance</span>
                                        <div className="total-right">
                                            <span className="total-value">Total {d.total_price}</span>
                                            {showStatusBadge && (
                                                <span className={status.className}>
                                                    <span className={`status-dot ${status.dot}`} />
                                                    {status.label}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {!isForgiven && (
                                        <div className="debt-actions">
                                            <button
                                                className="ghost-button settle"
                                                onClick={() => {
                                                    setSettleTarget(d)
                                                    setSettleAmount(String(d.total_price))
                                                    setSettleQuantity('')
                                                    setSettleMode('amount')
                                                }}
                                            >
                                                <span className="action-dot settle-dot" />
                                                Settle
                                            </button>
                                            <button className="ghost-button forgive" onClick={(e) => forgiveDebt(d)}>
                                                <span className="action-dot forgive-dot" />
                                                Forgive
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )
                })}
                </div>
            </div>
            {settleTarget && (
                <div className="modal-backdrop" onClick={() => setSettleTarget(null)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <h3>Settle debt</h3>
                        <p className="page-subtitle">
                            {settleTarget.debtor || settleTarget.comments || 'Customer'} · {settleTarget.pname}
                        </p>
                        <div className="mode-toggle">
                            <button
                                className={settleMode === 'amount' ? 'tab-button active' : 'tab-button'}
                                onClick={() => setSettleMode('amount')}
                            >
                                By amount
                            </button>
                            <button
                                className={settleMode === 'quantity' ? 'tab-button active' : 'tab-button'}
                                onClick={() => setSettleMode('quantity')}
                            >
                                By quantity
                            </button>
                        </div>
                        <label className="field-group">
                            <span className="field-label">
                                {settleMode === 'amount' ? 'Amount' : `Quantity (max ${settleTarget.quantity})`}
                            </span>
                            {settleMode === 'amount' ? (
                                <input
                                    className="field-input"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={settleAmount}
                                    onChange={(e) => setSettleAmount(e.target.value)}
                                />
                            ) : (
                                <input
                                    className="field-input"
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={settleQuantity}
                                    onChange={(e) => setSettleQuantity(e.target.value)}
                                />
                            )}
                        </label>
                        {settleMode === 'quantity' && (
                            <div className="modal-hint">
                                Amount to settle: {settleQuantity
                                    ? calcAmountFromQuantity(settleQuantity, settleTarget.unit_price).toFixed(2)
                                    : '0.00'}
                            </div>
                        )}
                        <div className="modal-actions">
                            <button className="ghost-button" onClick={() => setSettleTarget(null)}>Cancel</button>
                            <button
                                className="primary-button"
                                onClick={() => settleDebt(settleTarget, settleAmount, settleQuantity, settleMode)}
                            >
                                Settle
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showScrollTop && (
                <button
                    className="scroll-top"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                    Back to top
                </button>
            )}
        </div>
    }
    else if (selected === 1) {
        return <div className="shop-page detail-page sales-detail-page">
            {setupModal}
            {actionModal}
            {detailNav}
            <div className="debt-inline-zone detail-intro detail-intro-sales">
                <div className="inline-header">
                    <div>
                        <span className="detail-page-kicker">Sales detail</span>
                        <h2>Sales ledger</h2>
                        <p className="page-subtitle">Record and review sales for the selected period.</p>
                    </div>
                </div>
                <div className="panel-search">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M15.5 14h-.8l-.3-.3a6.5 6.5 0 1 0-.7.7l.3.3v.8l4.8 4.8a1 1 0 0 0 1.4-1.4L15.5 14zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search sales"
                        value={debtQuery}
                        onChange={(e) => setDebtQuery(e.target.value)}
                    />
                </div>
            </div>
            <div className="panel glass detail-scroll-panel sales-tone-panel">
                <div className="ledger-total">
                    <span className="ledger-label">Sales total</span>
                    <span className="ledger-value">{formatMoney(overview.sales_total)}</span>
                    <span className="ledger-meta">{sales.length} sales</span>
                </div>
                <div className="panel-list detail-scroll-list">
                    {filteredSales.length === 0 && (
                        <div className="empty-state">No sales in this period yet.</div>
                    )}
                    {filteredSales.map((sale) => (
                        <div className="list-item" key={sale.id}>
                            <div>
                                <div className="item-title">{sale.product_name}</div>
                                <div className="item-meta">{sale.quantity} × {sale.unit_price} · {sale.notes || 'No note'} · {formatTs(sale.sale_date)}</div>
                            </div>
                            <div className="total-value">{formatMoney(sale.total_amount)}</div>
                        </div>
                    ))}
                </div>
            </div>
            {showScrollTop && (
                <button
                    className="scroll-top"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                    Back to top
                </button>
            )}
        </div>
    } else if (selected === 2) {
        return <div className="shop-page detail-page expenses-detail-page">
            {setupModal}
            {actionModal}
            {detailNav}
            <div className="debt-inline-zone detail-intro detail-intro-expenses">
                <div className="inline-header">
                    <div>
                        <span className="detail-page-kicker">Expenses detail</span>
                        <h2>Expense ledger</h2>
                        <p className="page-subtitle">Track where the cash is going over the same selected period.</p>
                    </div>
                </div>
                <div className="panel-search">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M15.5 14h-.8l-.3-.3a6.5 6.5 0 1 0-.7.7l.3.3v.8l4.8 4.8a1 1 0 0 0 1.4-1.4L15.5 14zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search expenses"
                        value={debtQuery}
                        onChange={(e) => setDebtQuery(e.target.value)}
                    />
                </div>
            </div>
            <div className="panel glass detail-scroll-panel expenses-tone-panel">
                <div className="ledger-total">
                    <span className="ledger-label">Expense total</span>
                    <span className="ledger-value">{formatMoney(overview.expense_total)}</span>
                    <span className="ledger-meta">{expenses.length} expenses</span>
                </div>
                <div className="panel-list detail-scroll-list">
                    {filteredExpenses.length === 0 && (
                        <div className="empty-state">No expenses in this period yet.</div>
                    )}
                    {filteredExpenses.map((expense) => (
                        <div className="list-item" key={expense.id}>
                            <div>
                                <div className="item-title">{expense.category}</div>
                                <div className="item-meta">{expense.notes || 'No note'} · {formatTs(expense.expense_date)}</div>
                            </div>
                            <div className="total-value">{formatMoney(expense.amount)}</div>
                        </div>
                    ))}
                </div>
            </div>
            {showScrollTop && (
                <button
                    className="scroll-top"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                    Back to top
                </button>
            )}
        </div>
    }
    else if (selected === 3) {
        return <div className="shop-page detail-page catalog-detail-page">
            {setupModal}
            {actionModal}
            {detailNav}
            <div className="debt-inline-zone detail-intro detail-intro-catalog">
                <div className="inline-header">
                    <div>
                        <span className="detail-page-kicker">Catalog detail</span>
                        <h2>Add catalog item</h2>
                        <p className="page-subtitle">Choose a product to add to your shop catalog.</p>
                    </div>
                </div>
            </div>
            <div className="panel glass detail-scroll-panel catalog-tone-panel">
                <div className="panel-header">
                    <div>
                        <h2>Catalog items</h2>
                        <p className="page-subtitle">Items available for credit.</p>
                    </div>
                </div>
                <div className="panel-list detail-scroll-list">
                    {catalog.length === 0 && (
                        <div className="empty-state">No catalog items yet.</div>
                    )}
                    {catalog.filter(c => c?.pname).map(c => (
                        <div className="list-item" key={c.product_id}>
                            <div>
                                <div className="item-title">{c.pname}</div>
                                <div className="item-meta">{c.description}</div>
                            </div>
                            <button className="ghost-button danger" onClick={(e) => removeCatalogItem(c)}>Remove</button>
                        </div>
                    ))}
                </div>
            </div>
            {showScrollTop && (
                <button
                    className="scroll-top"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                    Back to top
                </button>
            )}
        </div>
    }else{
        return <div className="shop-page home-page">{logoutButton}{topBar}{setupModal}{actionModal}{pageFooter}</div>
    }
}
