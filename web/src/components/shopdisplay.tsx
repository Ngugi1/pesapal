import { useEffect, useState } from 'react'
import {useLocation} from 'react-router-dom'
import { post, processResponse } from './util'
import './shopdisplay.css'
import shopLogo from '../assets/shop-icon.png'
export function ShopDisplay() {
    const {state} = useLocation()
    console.log(state)
    const [shop, ____________] = useState(state)
    const [debts, setDebts] = useState([])
    const [catalog, setCatalog] = useState([])
    const [products, setProducts] = useState([])
    const [users, setUsers] = useState([])
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
    const [debt, setDebt] = useState({
        creditor_shop_id: shop?.shop_id ?? shop?.id ?? null,
        debtor_user_id: -1,
        product_id: -1,
        quantity: -1, 
        unit_price: -1
    })
    const [selectedProduct, setSelectedProduct] = useState(-1)
    const [selected, setSelected] = useState(0) // default to debts view
    const [debtFilter, setDebtFilter] = useState('all')
    console.log(state)
    const shopId = shop?.shop_id ?? shop?.id

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
        fetch('http://localhost:3003/catalog/shop/'+shopId).then((res) => {
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
        fetch('http://localhost:3003/debt/list/'+shopId).then((value) => {
            if(value.status === 200) {
                value.json().then((data) => {
                   setDebts(data)
                })
            }
        })
    }

    function loadUsers() {
        fetch('http://localhost:3003/users/all').then((value) => {
            if(value.status === 200) {
                value.json().then((data) => {
                   setUsers(data)
                   if (data?.length && debt.debtor_user_id === -1) {
                       setDebt((old) => ({
                           ...old,
                           debtor_user_id: data[0].id
                       }))
                   }
                })
            }
        })
    }

    function loadProducts() {
        fetch('http://localhost:3003/product/all').then((res) => {
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
        fetch('http://localhost:3003/debt/stats/'+shopId).then((res) => {
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

    useEffect(() => {
        if(selected === 0) {
            loadDebts()
            loadUsers()
            loadStats()
        }else if (selected === 1) {
            loadProducts()
        }else if (selected === 2) {
            loadDebts()
        }
    }, [selected, shopId])

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

    useEffect(() => {
        if (users?.length && debt.debtor_user_id === -1) {
            setDebt((old) => ({
                ...old,
                debtor_user_id: users[0].id
            }))
        }
    }, [users, debt.debtor_user_id])

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
    })

    function forgiveDebt(debt) {
        post('http://localhost:3003/debt/forgive/'+ debt.id, {})
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
        fetch('http://localhost:3003/debt/settle', {
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
        fetch(`http://localhost:3003/catalog/remove/${item.shop_id}/${item.product_id}`, {
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
        if(selectedProduct === -1) {
            alert('no selected product')
            return
        }
        const selectedId = parseInt(selectedProduct)
        const product = products.find(p => p.id === selectedId)
        if (!product) {
            alert('Invalid product selection')
            return
        }
        post('http://localhost:3003/catalog/create', {shop_id: shopId, product_id: product.id}).then((res) => {
            if(res.status === 200) {
                fetch('http://localhost:3003/catalog/shop/'+shopId).then((catalogRes) => {
                    if (catalogRes.status === 200) {
                        catalogRes.json().then((value) => {
                            setCatalog(value)
                        })
                    }
                })
            }
        })
    }

    const topBar =  (
        <div className="shop-header">
            <section className="region-card">
                <div className="shop-identity">
                    <div className="shop-visual small-logo">
                        <img src={shopLogo} alt="Shop logo" />
                    </div>
                    <div className="shop-title">
                    <div className="hero-eyebrow">Kitabu · Shop dashboard</div>
                        <h1 className="page-title">{shop.sname}</h1>
                        <div className="owner-block">
                            <div className="owner-row">
                                <span className="owner-label">Owner</span>
                                <span className="owner-name">{shop.fname} {shop.lname}</span>
                            </div>
                            <div className="owner-row">
                                <span className="owner-label">Phone</span>
                                <span className="owner-phone">{shop.phone}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="stats-row">
                    <div className="stat-card">
                        <span className="stat-label">All Debts</span>
                        <span className="stat-value">{statsLoaded ? stats.total_count : '—'}</span>
                        <span className="stat-sub">Total {statsLoaded ? stats.total_amount : '—'}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Paid</span>
                        <span className="stat-value">{statsLoaded ? stats.paid_count : '—'}</span>
                        <span className="stat-sub">Total {statsLoaded ? stats.paid_amount : '—'}</span>
                    </div>
                    <div className="stat-card highlight">
                        <span className="stat-label">Outstanding</span>
                        <span className="stat-value">{statsLoaded ? stats.outstanding_count : '—'}</span>
                        <span className="stat-sub">Total {statsLoaded ? stats.outstanding_amount : '—'}</span>
                    </div>
                </div>
            </section>
            <section className="region-card">
                <div className="split-nav">
                    <div className="split-group">
                        <button
                            className={selected === 0 ? 'split-button active' : 'split-button'}
                            onClick={(e) => setSelected(0)}
                        >
                            Debts
                        </button>
                        <button
                            className={selected === 1 ? 'split-button active' : 'split-button'}
                            onClick={(e) => setSelected(1)}
                        >
                            Catalog
                        </button>
                        <button
                            className={selected === 2 ? 'split-button active' : 'split-button'}
                            onClick={(e) => setSelected(2)}
                        >
                            Customers
                        </button>
                    </div>
                </div>
            </section>
        </div>
    )

    async function giveDebt(e) {
        e.preventDefault()
        if(!shopId) {
            alert('Shop id missing. Please go back and open a shop.')
            return
        }
        if(Object.values(debt).filter(e => e === -1).length > 0) {
            alert('Fill all fields')
            return
        }
        post('http://localhost:3003/debt/create', {...debt, creditor_shop_id: shopId}).then((res) => {
            if(res.status === 200) {
                res.json().then((created) => {
                    loadDebts()
                    loadStats()
                })
            }
        })
    }
    
    if(selected === 0) {
        return <div className="shop-page">
            {topBar}
            <div className="debt-inline-zone">
                {catalogLoaded && catalog.length === 0 && (
                    <div className="notice-card">
                        <div className="notice-title">Catalog required</div>
                        <p className="notice-text">
                            Add at least one catalog item before recording a debt.
                            Switch to the Catalog tab to add items.
                        </p>
                        <button className="notice-link" onClick={() => setSelected(1)}>
                            Go to Catalog
                        </button>
                    </div>
                )}
                <div className="inline-header">
                    <div>
                        <h2>Give a debt</h2>
                        <p className="page-subtitle">Record what a customer took on credit.</p>
                    </div>
                </div>
                <form className="inline-form" onSubmit={giveDebt}>
                    <select
                        value={debt.product_id}
                        disabled={catalogLoaded && catalog.length === 0}
                        onChange={(e) => {
                          setDebt((old) => {
                            return {
                                ...old,
                                product_id: parseInt(e.target.value)
                            }
                          })
                        }}
                    >
                        {
                            uniqueCatalog.map(c => <option key={c.product_id} value={c.product_id}>{c.pname}</option>)
                        }
                    </select>
                    <select
                        value={debt.debtor_user_id}
                        disabled={catalogLoaded && catalog.length === 0}
                        onChange={(e) => {
                        setDebt((old) => {
                            return {...old, debtor_user_id: parseInt(e.target.value)}
                        })
                    }}>
                        {
                            users.map(u => <option key={u.id} value={u.id}>{u.fname + ' ' + u.lname + ' · ' + u.phone}</option>)
                        }
                    </select>
                    <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        onChange={(e) => {
                            setDebt((old) => {
                                return {...old, quantity: parseInt(e.target.value)}
                            })
                        }}
                    />
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Unit price"
                        onChange={(e) => {
                            setDebt((old) => {
                                return {
                                    ...old, 
                                    unit_price: parseFloat(e.target.value)
                                }
                            })
                        }}
                    />
                    <button className="primary-button" type="submit" disabled={catalogLoaded && catalog.length === 0}>
                        Record debt
                    </button>
                </form>
            </div>
            <div className="panel glass debts-panel">
                <div className="panel-header debts-header">
                    <div className="filter-row">
                        <button className={debtFilter === 'all' ? 'filter-chip active' : 'filter-chip'} onClick={() => setDebtFilter('all')}>All</button>
                        <button className={debtFilter === 'paid' ? 'filter-chip active' : 'filter-chip'} onClick={() => setDebtFilter('paid')}>Paid</button>
                        <button className={debtFilter === 'forgiven' ? 'filter-chip active' : 'filter-chip'} onClick={() => setDebtFilter('forgiven')}>Forgiven</button>
                        <button className={debtFilter === 'fully' ? 'filter-chip active' : 'filter-chip'} onClick={() => setDebtFilter('fully')}>Fully paid</button>
                        <button className={debtFilter === 'partial' ? 'filter-chip active' : 'filter-chip'} onClick={() => setDebtFilter('partial')}>Partially paid</button>
                        <button className={debtFilter === 'outstanding' ? 'filter-chip active' : 'filter-chip'} onClick={() => setDebtFilter('outstanding')}>Outstanding</button>
                    </div>
                </div>
                <div className="panel-list">
                    {filteredDebts.length === 0 && (
                        <div className="empty-state">No debts recorded yet.</div>
                    )}
                    {filteredDebts
                        .filter(d => d?.debtor && d?.pname)
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
                            const status = isForgiven
                                ? { label: 'Forgiven', className: 'status-tag forgiven', dot: 'dot-forgiven' }
                                : isFull
                                    ? { label: 'Fully paid', className: 'status-tag paid', dot: 'dot-paid' }
                                    : isPartial
                                        ? { label: 'Partially paid', className: 'status-tag partial', dot: 'dot-partial' }
                                        : { label: 'Outstanding', className: 'status-tag outstanding', dot: 'dot-outstanding' }
                            const canRemind = !isForgiven && !isFull
                            return (
                        <div className="list-item debt-card" key={d.id}>
                            <div className="debt-main">
                                <div className="item-title">{d.debtor}</div>
                                <div className="item-meta">{d.pname} · {d.quantity} × {d.unit_price}</div>
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
                                <span className="total-label">Outstanding balance</span>
                                <div className="total-right">
                                    <span className="total-value">Total {d.total_price}</span>
                                    <span className={status.className}>
                                        <span className={`status-dot ${status.dot}`} />
                                        {status.label}
                                    </span>
                                </div>
                            </div>
                            {!isForgiven && (
                                <div className="debt-actions">
                                    {canRemind && (
                                        <button className="ghost-button remind" onClick={() => alert('Reminder sent')}>
                                            <span className="action-dot remind-dot" />
                                            Remind
                                        </button>
                                    )}
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
                            {settleTarget.debtor} · {settleTarget.pname}
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
        </div>
    }
    else if (selected === 1) {
        return <div className="shop-page">
            {topBar}
            <div className="debt-inline-zone">
                <div className="inline-header">
                    <div>
                        <h2>Add catalog item</h2>
                        <p className="page-subtitle">Choose a product to add to your shop catalog.</p>
                    </div>
                </div>
                <form className="inline-form" onSubmit={(e) => { e.preventDefault(); addToCatalog() }}>
                    <select
                        value={selectedProduct}
                        onChange={(e) => setSelectedProduct(parseInt(e.target.value))}
                    >
                        {uniqueProducts.map(p => <option key={p.id} value={p.id}>{p.pname}</option>)}
                    </select>
                    <button className="primary-button" type="submit">Add to catalog</button>
                </form>
            </div>
            <div className="panel glass">
                <div className="panel-header">
                    <div>
                        <h2>Catalog items</h2>
                        <p className="page-subtitle">Items available for credit.</p>
                    </div>
                </div>
                <div className="panel-list">
                    {catalog.length === 0 && (
                        <div className="empty-state">No catalog items yet.</div>
                    )}
                    {catalog.filter(c => c?.pname).map(c => (
                        <div className="list-item" key={c.product_id}>
                            <div>
                                <div className="item-title">{c.pname}</div>
                                <div className="item-meta">{c.description}</div>
                            </div>
                            <button className="ghost-button" onClick={(e) => removeCatalogItem(c)}>Remove</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    }else if (selected === 2) {
        const customersWithCredit = Array.from(
            new Map(
                debts
                    .filter(d => d?.debtor)
                    .map(d => {
                        const key = d?.debtor_user_id ?? `${d.debtor}-${d.debtor_phone ?? ''}`
                        return [key, d]
                    })
            ).values()
        )
        return <div className="shop-page">
            {topBar}
            <div className="panel glass">
                <div className="panel-header">
                    <div>
                        <h2>Customers</h2>
                        <p className="page-subtitle">People who have taken items on credit.</p>
                    </div>
                </div>
                <div className="panel-list">
                    {customersWithCredit.length === 0 && (
                        <div className="empty-state">No customers with credit yet.</div>
                    )}
                    {customersWithCredit.map(u => (
                        <div className="list-item" key={u.debtor_user_id ?? `${u.debtor}-${u.debtor_phone ?? ''}`}>
                            <div>
                                <div className="item-title">{u.debtor}</div>
                                <div className="item-meta">{u.debtor_phone}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    }else{
        return <div className="shop-page">{topBar}</div>
    }
}
