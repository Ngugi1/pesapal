import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent, MouseEvent } from 'react'
import {useLocation} from 'react-router-dom'
import { apiUrl, post, processResponse, put } from './util'
import kenyaFlagGif from '../assets/flag-of-kenya.gif'
import shopLogo from '../assets/shop-icon.png'
import './shopdisplay.css'

type ShopSession = {
    id: number
    shop_id?: number
    sname: string
    fname?: string
    lname?: string
    phone?: string
}

type DebtRecord = {
    id: number
    product_id?: number | null
    debtor_user_id?: number | null
    debtor?: string
    debtor_phone?: string
    phone?: string
    comments?: string
    pname: string
    quantity: number
    unit_price: number
    total_price: number
    forgiven?: boolean | number
    date_issued?: number
    date_forgiven?: number
    total_paid?: number
    full_settlement?: number
    has_settlement?: number
    last_settlement_date?: number
}

type CatalogItem = {
    id: number
    shop_id: number
    product_id: number
    pname: string
    description?: string
    stock_quantity: number
    default_unit_price: number
}

type SaleRecord = {
    id: number
    shop_id: number
    product_id?: number | null
    product_name: string
    quantity: number
    unit_price: number
    total_amount: number
    sale_date: number
    notes?: string
}

type ExpenseRecord = {
    id: number
    shop_id: number
    category: string
    amount: number
    expense_date: number
    notes?: string
}

type OverviewSummary = {
    sales_count: number
    sales_total: number
    expense_count: number
    expense_total: number
    debt_issued_count: number
    debt_issued_total: number
    debt_payment_count: number
    debt_paid_total: number
    outstanding_count: number
    outstanding_total: number
    net_flow: number
    stock_value: number
    recent_activity: Array<Record<string, unknown>>
}

type DetailSection = -1 | 0 | 1 | 2 | 3 | 4

type UserCreateResponse = { id: number; existing?: boolean; error?: string }
type ShopCreateResponse = { id: number; error?: string }
type EntityCreateResponse = { id: number; error?: string }
type ProductRow = { id: number; pname?: string; name?: string }
type EditableModal = 'debt' | 'sale' | 'expense' | 'catalog' | 'stock'
type ModalTone = 'debt' | 'sale' | 'expense' | 'catalog' | 'stock'
type PeriodOption = 'day' | 'week' | 'month' | 'year' | 'custom'
type SetupMode = 'signup' | 'login'

const PERIOD_STORAGE_KEY = 'kitabu-period'
const PERIOD_FROM_STORAGE_KEY = 'kitabu-period-custom-from'
const PERIOD_TO_STORAGE_KEY = 'kitabu-period-custom-to'
const PERIOD_OPTIONS: PeriodOption[] = ['day', 'week', 'month', 'year', 'custom']

function isPeriodOption(value: string): value is PeriodOption {
    return PERIOD_OPTIONS.includes(value as PeriodOption)
}

export function ShopDisplay() {
    const {state} = useLocation()
    const [shop, setShop] = useState<ShopSession | null>((state as ShopSession | null) ?? null)
    const [sessionChecked, setSessionChecked] = useState(false)
    const [debts, setDebts] = useState<DebtRecord[]>([])
    const [catalog, setCatalog] = useState<CatalogItem[]>([])
    const [catalogLoaded, setCatalogLoaded] = useState(false)
    const [settleTarget, setSettleTarget] = useState<DebtRecord | null>(null)
    const [settleAmount, setSettleAmount] = useState('')
    const [settleMode, setSettleMode] = useState('amount')
    const [settleQuantity, setSettleQuantity] = useState('')
    const [detailQuery, setDetailQuery] = useState('')
    const [debt, setDebt] = useState({
        creditor_shop_id: shop?.shop_id ?? shop?.id ?? null,
        product_id: -1,
        quantity: -1, 
        unit_price: -1,
        comments: ''
    })
    const [selected, setSelected] = useState<DetailSection>(-1)
    const [activeModal, setActiveModal] = useState<null | EditableModal>(null)
    const [debtFilter, setDebtFilter] = useState('outstanding')
    const [expandedDebtId, setExpandedDebtId] = useState<number | null>(null)
    const [overview, setOverview] = useState<OverviewSummary>({
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
        stock_value: 0,
        net_flow: 0,
        recent_activity: []
    })
    const [sales, setSales] = useState<SaleRecord[]>([])
    const [expenses, setExpenses] = useState<ExpenseRecord[]>([])
    const getStoredPeriod = (): PeriodOption => {
        if (typeof window === 'undefined') return 'day'
        const stored = window.localStorage.getItem(PERIOD_STORAGE_KEY) ?? ''
        return isPeriodOption(stored) ? stored : 'day'
    }
    const getStoredRange = (key: string) => {
        if (typeof window === 'undefined') return ''
        return window.localStorage.getItem(key) ?? ''
    }
    const [homePeriod, setHomePeriod] = useState<PeriodOption>(getStoredPeriod)
    const [homeCustomFrom, setHomeCustomFrom] = useState(() => getStoredRange(PERIOD_FROM_STORAGE_KEY))
    const [homeCustomTo, setHomeCustomTo] = useState(() => getStoredRange(PERIOD_TO_STORAGE_KEY))
    const [detailPeriod, setDetailPeriod] = useState<PeriodOption>(getStoredPeriod)
    const [detailCustomFrom, setDetailCustomFrom] = useState(() => getStoredRange(PERIOD_FROM_STORAGE_KEY))
    const [detailCustomTo, setDetailCustomTo] = useState(() => getStoredRange(PERIOD_TO_STORAGE_KEY))
    const [saleStatus, setSaleStatus] = useState('')
    const [expenseStatus, setExpenseStatus] = useState('')
    const [catalogStatus, setCatalogStatus] = useState('')
    const [debtStatus, setDebtStatus] = useState('')
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
        product_id: '',
        name: '',
        description: '',
        stock_quantity: '0',
        default_unit_price: ''
    })
    const [editingDebtId, setEditingDebtId] = useState<number | null>(null)
    const [editingSaleId, setEditingSaleId] = useState<number | null>(null)
    const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null)
    const [editingCatalogProductId, setEditingCatalogProductId] = useState<number | null>(null)
    const [setupStatus, setSetupStatus] = useState('')
    const [setupData, setSetupData] = useState({
        phone: '',
        shop: ''
    })
    const [setupMode, setSetupMode] = useState<SetupMode>('login')
    const [showSetupModal, setShowSetupModal] = useState(false)
    const [welcomeMessage, setWelcomeMessage] = useState('')
    const [visibleCounts, setVisibleCounts] = useState({
        debt: 12,
        sale: 12,
        expense: 12,
        catalog: 12,
        stock: 12
    })
    const detailListRef = useRef<HTMLDivElement | null>(null)
    const previousSelectedRef = useRef<DetailSection>(-1)
    const shopId = shop?.shop_id ?? shop?.id
    const needsSetup = !shopId
    const displayShop = shop ?? { sname: 'Demo dashboard' }
    const [showScrollTop, setShowScrollTop] = useState(false)
    const currentYear = new Date().getFullYear()
    const isEditingDebt = editingDebtId !== null

    useEffect(() => {
        if (typeof window === 'undefined') return
        window.localStorage.setItem(PERIOD_STORAGE_KEY, homePeriod)
    }, [homePeriod])

    useEffect(() => {
        if (typeof window === 'undefined') return
        window.localStorage.setItem(PERIOD_FROM_STORAGE_KEY, homeCustomFrom)
    }, [homeCustomFrom])

    useEffect(() => {
        if (typeof window === 'undefined') return
        window.localStorage.setItem(PERIOD_TO_STORAGE_KEY, homeCustomTo)
    }, [homeCustomTo])

    useEffect(() => {
        const previousSelected = previousSelectedRef.current
        if (previousSelected === -1 && selected !== -1) {
            setDetailPeriod(homePeriod)
            setDetailCustomFrom(homeCustomFrom)
            setDetailCustomTo(homeCustomTo)
        }
        previousSelectedRef.current = selected
    }, [selected, homePeriod, homeCustomFrom, homeCustomTo])
    const isEditingSale = editingSaleId !== null
    const isEditingExpense = editingExpenseId !== null
    const isEditingCatalog = editingCatalogProductId !== null
    const activeModalTitle = {
        debt: isEditingDebt ? 'Edit debt' : 'Add debt',
        sale: isEditingSale ? 'Edit sale' : 'Add sale',
        expense: isEditingExpense ? 'Edit expense' : 'Add expense',
        catalog: isEditingCatalog ? 'Edit catalog item' : 'Add catalog item',
        stock: isEditingCatalog ? 'Edit stock entry' : 'Add stock'
    }

    useEffect(() => {
        let cancelled = false

        async function restoreSession() {
            const clearSession = () => {
                localStorage.removeItem('kitabu_session')
                if (!cancelled) {
                    setShop(null)
                }
            }

            const validateSession = async (session: ShopSession) => {
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

    useEffect(() => {
        if (!sessionChecked || !shop?.id) return
        const firstName = shop.fname?.trim() || 'there'
        setWelcomeMessage(`Welcome back, ${firstName}`)
        const timer = window.setTimeout(() => setWelcomeMessage(''), 3200)
        return () => window.clearTimeout(timer)
    }, [sessionChecked, shop?.id])

    useEffect(() => {
        if (!sessionChecked) return

        const onPopState = (event: PopStateEvent) => {
            if (showSetupModal) {
                event.preventDefault?.()
                setShowSetupModal(false)
                setSetupStatus('')
                window.history.pushState({ kitabu: true }, '')
                return
            }

            if (activeModal || settleTarget) {
                event.preventDefault?.()
                closeActionModal()
                setSettleTarget(null)
                window.history.pushState({ kitabu: true }, '')
                return
            }

            if (selected !== -1) {
                event.preventDefault?.()
                setSelected(-1)
                window.history.pushState({ kitabu: true }, '')
                return
            }

            const shouldLeave = window.confirm('Leave Kitabu?')
            if (!shouldLeave) {
                window.history.pushState({ kitabu: true }, '')
            }
        }

        window.history.pushState({ kitabu: true }, '')
        window.addEventListener('popstate', onPopState)
        return () => window.removeEventListener('popstate', onPopState)
    }, [sessionChecked, selected, activeModal, settleTarget, showSetupModal])

    const formatMoney = (value: number | string | undefined | null) => {
        const amount = Number(value) || 0
        return amount.toFixed(2)
    }

    const formatCompactValue = (value: number | string | undefined | null) => {
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

    const fromDateTimeInput = (value: string) => {
        if (!value) return null
        const parsed = new Date(value).getTime()
        if (!Number.isFinite(parsed)) return null
        return Math.floor(parsed / 1000)
    }

    const activePeriod = selected === -1 ? homePeriod : detailPeriod
    const activeCustomFrom = selected === -1 ? homeCustomFrom : detailCustomFrom
    const activeCustomTo = selected === -1 ? homeCustomTo : detailCustomTo

    const getRange = () => {
        const now = new Date()
        const end = Math.floor(now.getTime() / 1000)
        if (activePeriod === 'custom') {
            const customStart = fromDateTimeInput(activeCustomFrom)
            const customEnd = fromDateTimeInput(activeCustomTo)
            return {
                from: customStart ?? end - 86400,
                to: customEnd ?? end
            }
        }

        const start = new Date(now)
        if (activePeriod === 'day') {
            start.setHours(0, 0, 0, 0)
        } else if (activePeriod === 'week') {
            const day = start.getDay()
            const diff = day === 0 ? -6 : 1 - day
            start.setDate(start.getDate() + diff)
            start.setHours(0, 0, 0, 0)
        } else if (activePeriod === 'month') {
            start.setDate(1)
            start.setHours(0, 0, 0, 0)
        } else if (activePeriod === 'year') {
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

    const uniqueById = <T extends Record<string, unknown>>(items: T[], idKey: keyof T) => {
        const seen = new Set()
        return items.filter((item) => {
            const key = item?.[idKey]
            if (seen.has(key)) return false
            seen.add(key)
            return true
        })
    }

    const parseNumber = (value: number | string | undefined | null) => {
        const num = Number(value)
        return Number.isFinite(num) ? num : NaN
    }

    const formatTs = (ts: number | string | undefined | null) => {
        if (!ts || ts === -1) return null
        const ms = Number(ts) * 1000
        if (!Number.isFinite(ms)) return null
        return new Date(ms).toLocaleString()
    }

    const normalizeAmount = (value: number) => {
        if (!Number.isFinite(value)) return NaN
        return Math.round(value * 100) / 100
    }

    const calcAmountFromQuantity = (qtyValue: string, unitPriceValue: number | string | undefined | null) => {
        const qty = parseInt(qtyValue, 10)
        const unitPrice = parseNumber(unitPriceValue)
        if (!Number.isFinite(qty) || !Number.isFinite(unitPrice)) return NaN
        return normalizeAmount(qty * unitPrice)
    }

    const uniqueCatalog = uniqueById(catalog, 'product_id')
    const getCatalogItem = (productId: number | string | undefined | null) => {
        const parsed = Number(productId)
        if (!Number.isFinite(parsed)) return null
        return uniqueCatalog.find((item) => item.product_id === parsed) ?? null
    }

    const resetDebtForm = () => {
        setDebt({
            creditor_shop_id: shopId ?? null,
            product_id: uniqueCatalog[0]?.product_id ?? -1,
            quantity: -1,
            unit_price: -1,
            comments: ''
        })
        setEditingDebtId(null)
    }

    const resetSaleForm = () => {
        setSaleForm({
            product_id: '',
            quantity: '1',
            unit_price: '',
            notes: ''
        })
        setEditingSaleId(null)
    }

    const resetExpenseForm = () => {
        setExpenseForm({
            category: '',
            amount: '',
            notes: ''
        })
        setEditingExpenseId(null)
    }

    const resetCatalogForm = () => {
        setCatalogForm({
            product_id: '',
            name: '',
            description: '',
            stock_quantity: '0',
            default_unit_price: ''
        })
        setEditingCatalogProductId(null)
    }

    const closeActionModal = () => {
        setActiveModal(null)
        setSaleStatus('')
        setExpenseStatus('')
        setCatalogStatus('')
        setDebtStatus('')
        resetDebtForm()
        resetSaleForm()
        resetExpenseForm()
        resetCatalogForm()
    }

    const openSetupDialog = (mode: SetupMode = 'login', statusMessage = '') => {
        setSetupMode(mode)
        setSetupStatus(statusMessage)
        setShowSetupModal(true)
    }

    const closeSetupDialog = () => {
        setShowSetupModal(false)
        setSetupStatus('')
    }

    const requireSessionForAction = () => {
        if (!needsSetup) return true
        openSetupDialog('login', 'Log in or sign up to continue.')
        return false
    }

    const openDetailSection = (section: DetailSection) => {
        if (section === -1) {
            setSelected(-1)
            return
        }
        if (!requireSessionForAction()) return
        setSelected(section)
    }

    const openModalForCreate = (modal: EditableModal) => {
        if (!requireSessionForAction()) return
        closeActionModal()
        if (modal === 'stock') {
            const firstCatalog = uniqueCatalog[0]
            setCatalogForm({
                product_id: firstCatalog ? String(firstCatalog.product_id) : '',
                name: firstCatalog?.pname ?? '',
                description: firstCatalog?.description ?? '',
                stock_quantity: '0',
                default_unit_price: firstCatalog?.default_unit_price ? String(firstCatalog.default_unit_price) : ''
            })
        }
        setActiveModal(modal)
    }

    const openDebtEditor = (record: DebtRecord) => {
        setSaleStatus('')
        setExpenseStatus('')
        setCatalogStatus('')
        setDebtStatus('')
        setEditingDebtId(record.id)
        setDebt({
            creditor_shop_id: shopId ?? null,
            product_id: record.product_id ?? uniqueCatalog[0]?.product_id ?? -1,
            quantity: Number(record.quantity) || -1,
            unit_price: Number(record.unit_price) || -1,
            comments: record.comments ?? ''
        })
        setActiveModal('debt')
    }

    const openSaleEditor = (record: SaleRecord) => {
        setSaleStatus('')
        setEditingSaleId(record.id)
        setSaleForm({
            product_id: record.product_id ? String(record.product_id) : '',
            quantity: String(record.quantity ?? 1),
            unit_price: String(record.unit_price ?? ''),
            notes: record.notes ?? ''
        })
        setActiveModal('sale')
    }

    const openExpenseEditor = (record: ExpenseRecord) => {
        setExpenseStatus('')
        setEditingExpenseId(record.id)
        setExpenseForm({
            category: record.category ?? '',
            amount: String(record.amount ?? ''),
            notes: record.notes ?? ''
        })
        setActiveModal('expense')
    }

    const openCatalogEditor = (item: CatalogItem, modal: 'catalog' | 'stock' = 'catalog') => {
        setCatalogStatus('')
        setEditingCatalogProductId(item.product_id)
        setCatalogForm({
            product_id: String(item.product_id),
            name: item.pname ?? '',
            description: item.description ?? '',
            stock_quantity: String(item.stock_quantity ?? 0),
            default_unit_price: item.default_unit_price ? String(item.default_unit_price) : ''
        })
        setActiveModal(modal)
    }
    function loadCatalog() {
        if (!shopId) return
        fetch(apiUrl(`/catalog/shop/${shopId}`)).then((res) => {
            if(res.status === 200) {
                res.json().then((value) => {
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
    }

    useEffect(() => {
        loadCatalog()
    }, [shopId])

    function loadDebts() {
        if (!shopId) return
        fetch(apiUrl(`/debt/list/${shopId}?${queryString()}`), { cache: 'no-store' }).then((value) => {
            if(value.status === 200) {
                value.json().then((data) => {
                   setDebts(data)
                })
            }
        })
    }

    function loadOverview() {
        if (!shopId) return
        fetch(apiUrl(`/overview/${shopId}?${queryString()}`), { cache: 'no-store' }).then((res) => {
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
    }, [shopId, activePeriod, activeCustomFrom, activeCustomTo])

    useEffect(() => {
        if(selected === -1) {
            loadDebts()
            loadSales()
            loadExpenses()
        } else if(selected === 0) {
            loadDebts()
        }else if (selected === 1) {
            loadSales()
        }else if (selected === 2) {
            loadExpenses()
        }
    }, [selected, shopId, activePeriod, activeCustomFrom, activeCustomTo])

    useEffect(() => {
        setDetailQuery('')
        setExpandedDebtId(null)
    }, [selected])

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
        const selectedCatalog = getCatalogItem(saleForm.product_id)
        if (!selectedCatalog) return
        if (saleForm.unit_price) return
        if (Number(selectedCatalog.default_unit_price) <= 0) return
        setSaleForm((old) => ({
            ...old,
            unit_price: String(selectedCatalog.default_unit_price)
        }))
    }, [saleForm.product_id, saleForm.unit_price, uniqueCatalog])

    useEffect(() => {
        const selectedCatalog = getCatalogItem(debt.product_id)
        if (!selectedCatalog) return
        if (debt.unit_price > 0) return
        if (Number(selectedCatalog.default_unit_price) <= 0) return
        setDebt((old) => ({
            ...old,
            unit_price: Number(selectedCatalog.default_unit_price)
        }))
    }, [debt.product_id, debt.unit_price, uniqueCatalog])

    const filteredSales = sales.filter((sale) => {
        const q = detailQuery.trim().toLowerCase()
        if (!q) return true
        return `${sale?.product_name ?? ''} ${sale?.notes ?? ''}`.toLowerCase().includes(q)
    })

    const filteredExpenses = expenses.filter((expense) => {
        const q = detailQuery.trim().toLowerCase()
        if (!q) return true
        return `${expense?.category ?? ''} ${expense?.notes ?? ''}`.toLowerCase().includes(q)
    })

    const filteredCatalog = uniqueCatalog.filter((item) => {
        const q = detailQuery.trim().toLowerCase()
        if (!q) return true
        return `${item?.pname ?? ''} ${item?.description ?? ''}`.toLowerCase().includes(q)
    })
    const filteredStock = filteredCatalog.filter((item) => Number(item.stock_quantity ?? 0) > 0)

    const totalStockValue = uniqueCatalog.reduce((sum, item) => {
        const qty = Number(item.stock_quantity ?? 0)
        const price = Number(item.default_unit_price ?? 0)
        if (!Number.isFinite(qty) || !Number.isFinite(price)) return sum
        return sum + qty * price
    }, 0)

    const stockValueToShow = Number(overview.stock_value ?? 0) || totalStockValue
    const filteredStockValue = filteredStock.reduce((sum, item) => {
        const qty = Number(item.stock_quantity ?? 0)
        const price = Number(item.default_unit_price ?? 0)
        if (!Number.isFinite(qty) || !Number.isFinite(price)) return sum
        return sum + qty * price
    }, 0)

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
        const q = detailQuery.trim().toLowerCase()
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

    const recentSales = filteredSales.slice(0, 3)
    const recentExpenses = filteredExpenses.slice(0, 1)
    const recentCatalog = uniqueCatalog.slice(0, 1)
    const visibleDebts = filteredDebts.slice(0, visibleCounts.debt)
    const visibleSales = filteredSales.slice(0, visibleCounts.sale)
    const visibleExpenses = filteredExpenses.slice(0, visibleCounts.expense)
    const visibleCatalog = filteredCatalog.slice(0, visibleCounts.catalog)
    const visibleStock = filteredStock.slice(0, visibleCounts.stock)
    const lowStockCount = uniqueCatalog.filter((item) => {
        const qty = Number(item.stock_quantity ?? 0)
        return qty > 0 && qty <= 3
    }).length
    const dashboardOutstandingTotal = debts.reduce((sum, debtItem) => {
        const isForgiven = debtItem.forgiven === true || Number(debtItem.forgiven) === 1
        const isFull = Number(debtItem.full_settlement) === 1
        if (isForgiven || isFull) return sum
        const total = Number(debtItem.total_price ?? 0)
        const paid = Number(debtItem.total_paid ?? 0)
        return sum + Math.max(total - paid, 0)
    }, 0)
    const healthTone = overview.net_flow < 0 ? 'performance-down' : 'performance-up'
    const demoNow = Math.floor(Date.now() / 1000)
    const demoTileData = {
        salesTotal: 32540,
        expensesTotal: 11850,
        debtTotal: 14600,
        catalogCount: 27,
        stockValue: 43200
    }
    const demoRecentSales: SaleRecord[] = [
        { id: -1, shop_id: -1, product_name: 'Rice (2kg)', quantity: 3, unit_price: 320, total_amount: 960, sale_date: demoNow - 7200, notes: 'Morning rush' },
        { id: -2, shop_id: -1, product_name: 'Cooking Oil', quantity: 5, unit_price: 410, total_amount: 2050, sale_date: demoNow - 5400, notes: 'Walk-in' },
        { id: -3, shop_id: -1, product_name: 'Sugar (1kg)', quantity: 4, unit_price: 190, total_amount: 760, sale_date: demoNow - 3600, notes: 'Regular customer' }
    ]
    const demoRecentExpenses: ExpenseRecord[] = [
        { id: -1, shop_id: -1, category: 'Restock transport', amount: 950, expense_date: demoNow - 4000, notes: 'Local supplier pickup' }
    ]
    const demoRecentDebts: DebtRecord[] = [
        { id: -1, pname: 'Bread', quantity: 6, unit_price: 85, total_price: 510, debtor: 'Akinyi', comments: 'Takes daily' }
    ]
    const demoRecentCatalog: CatalogItem[] = [
        { id: -1, shop_id: -1, product_id: -1, pname: 'Milk 500ml', description: 'Fast moving item', stock_quantity: 48, default_unit_price: 70 }
    ]
    const salesTotalForTiles = needsSetup ? demoTileData.salesTotal : overview.sales_total
    const expenseTotalForTiles = needsSetup ? demoTileData.expensesTotal : overview.expense_total
    const debtTotalForTiles = needsSetup ? demoTileData.debtTotal : dashboardOutstandingTotal
    const catalogCountForTiles = needsSetup ? demoTileData.catalogCount : catalog.length
    const stockValueForTiles = needsSetup ? demoTileData.stockValue : stockValueToShow
    const recentSalesForTiles = needsSetup ? demoRecentSales : recentSales
    const recentExpensesForTiles = needsSetup ? demoRecentExpenses : recentExpenses
    const recentDebtsForTiles = needsSetup ? demoRecentDebts : recentDebts
    const recentCatalogForTiles = needsSetup ? demoRecentCatalog : recentCatalog
    const performanceDeltaToShow = salesTotalForTiles - expenseTotalForTiles

    const loadMore = (listKey: keyof typeof visibleCounts) => {
        setVisibleCounts((old) => ({
            ...old,
            [listKey]: old[listKey] + 12
        }))
    }

    const currentListKey: keyof typeof visibleCounts =
        selected === 0 ? 'debt' :
        selected === 1 ? 'sale' :
        selected === 2 ? 'expense' :
        selected === 3 ? 'catalog' :
        'stock'

    const handleDetailScroll = () => {
        const el = detailListRef.current
        if (!el) return

        const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 72
        if (!nearBottom) return

        if (currentListKey === 'debt' && visibleCounts.debt < filteredDebts.length) {
            loadMore('debt')
        } else if (currentListKey === 'sale' && visibleCounts.sale < filteredSales.length) {
            loadMore('sale')
        } else if (currentListKey === 'expense' && visibleCounts.expense < filteredExpenses.length) {
            loadMore('expense')
        } else if (currentListKey === 'catalog' && visibleCounts.catalog < filteredCatalog.length) {
            loadMore('catalog')
        }
    }

    useEffect(() => {
        setVisibleCounts((old) => ({
            ...old,
            [currentListKey]: 12
        }))
    }, [currentListKey, detailQuery, debtFilter, sales.length, expenses.length, debts.length, filteredCatalog.length, filteredStock.length])

    const debtAmountForFilter = (debt: DebtRecord, filter: string) => {
        const totalPrice = Number(debt.total_price) || 0
        const totalPaid = Number(debt.total_paid) || 0
        const outstanding = Math.max(totalPrice - totalPaid, 0)
        switch (filter) {
            case 'paid':
                return totalPaid
            case 'forgiven':
                return outstanding
            case 'fully':
                return totalPaid || totalPrice
            case 'partial':
                return totalPaid
            case 'outstanding':
                return outstanding
            default:
                return totalPrice
        }
    }

    const filteredDebtAmount = filteredDebts.reduce(
        (acc, debt) => acc + debtAmountForFilter(debt, debtFilter),
        0
    )

    const filterLabels: Record<string, string> = {
        paid: 'Paid total',
        forgiven: 'Forgiven total',
        fully: 'Fully paid total',
        partial: 'Partially paid total',
        outstanding: 'Balance total',
        all: 'Grand total'
    }

    const currentTotals = {
        label: filterLabels[debtFilter] ?? filterLabels.all,
        count: filteredDebts.length,
        amount: filteredDebtAmount
    }

    function forgiveDebt(debt: DebtRecord) {
        post(apiUrl(`/debt/forgive/${debt.id}`), {})
        .then((res) => {
            if(res.status === 200) {
                setDebts((d) => {
                    return d.filter(item => item.id !== debt.id)
                })
                loadDebts()
                loadOverview()
            }else{
                alert("Something went wrong")
            }
        })
    }
    function settleDebt(debt: DebtRecord, amountValue: string, quantityValue: string, mode: string) {
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

    function submitSettlement(debt: DebtRecord, amount: number, isFull: boolean) {
        fetch(apiUrl('/debt/settle'), {
            method: 'PUT',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({debt_id: debt.id, amount, is_full_settlement: isFull, comments: isFull ? "Paid in full" : "Partial payment"})
        }).then((res) => {
            if(res.status === 200) {
                loadDebts()
                loadOverview()
                setSettleTarget(null)
                setSettleAmount('')
                setSettleQuantity('')
                setSettleMode('amount')
            }else {
                alert('Settlement failed')
            }
        })

    }

    function removeCatalogItem(item: CatalogItem) {
        if (!window.confirm(`Delete ${item.pname} from catalog? Warning: this has a cascading effect and will also delete associated sales, debts, and settlements for this item. This cannot be undone.`)) {
            return
        }
        fetch(apiUrl(`/catalog/remove/${item.shop_id}/${item.product_id}`), {
            method: 'DELETE'
        }).then(async (res) => {
            const data = await res.json().catch(() => undefined)
            if (res.status === 200) {
                if (data?.message === "deleted") {
                    setCatalog((old) => {
                        return old.filter(c => c.product_id !== item.product_id)
                    })
                    loadOverview()
                } else {
                    alert(data?.error || data?.message || 'Delete catalog item failed')
                }
            } else {
                alert(data?.error || 'Delete catalog item failed')
            }
        })
    }

    function clearStockItem(item: CatalogItem) {
        if (!window.confirm(`Delete stock entry for ${item.pname}? This keeps the catalog item.`)) {
            return
        }

        put(apiUrl(`/catalog/update/${item.id}`), {
            stock_quantity: 0,
            default_unit_price: Number(item.default_unit_price ?? 0)
        }).then(async (res) => {
            if (res.status === 200) {
                loadCatalog()
                loadOverview()
            } else {
                const json = await res.json().catch(() => undefined)
                alert(json?.error || 'Stock update failed')
            }
        })
    }

    function deleteDebtItem(item: DebtRecord) {
        const debtLabel = item.debtor || item.comments || item.pname
        if (!window.confirm(`Delete debt record for ${debtLabel}?`)) {
            return
        }

        fetch(apiUrl(`/debt/remove/${item.id}`), {
            method: 'DELETE'
        }).then(async (res) => {
            const json = await res.json().catch(() => undefined)
            if (res.status === 200) {
                const deletedId = Number(item.id)
                setDebts((old) => old.filter((debtItem) => Number(debtItem.id) !== deletedId))
                setExpandedDebtId((old) => Number(old) === deletedId ? null : old)
                loadDebts()
                loadOverview()
            } else {
                alert(json?.error || 'Debt deletion failed')
            }
        })
    }

    function addToCatalog() {
        if (!shopId) {
            alert('Shop id missing. Please go back and open a shop.')
            return
        }
        const stockQuantity = Math.max(0, parseInt(catalogForm.stock_quantity || '0', 10) || 0)
        const defaultUnitPrice = parseFloat(catalogForm.default_unit_price || '0')

        if (activeModal === 'stock' && isEditingCatalog && editingCatalogProductId) {
            const currentCatalogEntry = catalog.find((item) => item.product_id === editingCatalogProductId)
            if (!currentCatalogEntry) {
                setCatalogStatus('Catalog item not found')
                return
            }
            if (!Number.isFinite(defaultUnitPrice) || defaultUnitPrice < 0) {
                setCatalogStatus('Enter a valid default price')
                return
            }
            setCatalogStatus('')
            put(apiUrl(`/catalog/update/${currentCatalogEntry.id}`), {
                stock_quantity: stockQuantity,
                default_unit_price: defaultUnitPrice
            }).then(async (res) => {
                const catalogData = await processResponse<EntityCreateResponse>(res, 'Update stock failed', setCatalogStatus)
                if (catalogData) {
                    loadCatalog()
                    loadOverview()
                    closeActionModal()
                }
            })
            return
        }

        if (activeModal === 'stock' && !isEditingCatalog) {
            const selectedCatalog = getCatalogItem(catalogForm.product_id)
            if (!selectedCatalog) {
                setCatalogStatus('Select a catalog item')
                return
            }
            if (stockQuantity <= 0) {
                setCatalogStatus('Enter stock quantity above 0')
                return
            }
            const resolvedUnitPrice = Number.isFinite(defaultUnitPrice) && defaultUnitPrice >= 0
                ? defaultUnitPrice
                : Number(selectedCatalog.default_unit_price ?? 0)
            if (!Number.isFinite(resolvedUnitPrice) || resolvedUnitPrice < 0) {
                setCatalogStatus('Enter a valid default price')
                return
            }
            setCatalogStatus('')
            put(apiUrl(`/catalog/update/${selectedCatalog.id}`), {
                stock_quantity: stockQuantity,
                default_unit_price: resolvedUnitPrice
            }).then(async (res) => {
                const catalogData = await processResponse<EntityCreateResponse>(res, 'Add stock failed', setCatalogStatus)
                if (catalogData) {
                    loadCatalog()
                    loadOverview()
                    closeActionModal()
                }
            })
            return
        }

        const name = catalogForm.name.trim()
        if (!name) {
            setCatalogStatus('Enter a product name')
            return
        }
        setCatalogStatus('')
        if (isEditingCatalog && editingCatalogProductId) {
            put(apiUrl(`/product/update/${editingCatalogProductId}`), {
                name,
                description: catalogForm.description.trim()
            }).then(async (productRes) => {
                const productData = await processResponse<EntityCreateResponse>(productRes, 'Update product failed', setCatalogStatus)
                if (productData) {
                    loadCatalog()
                    closeActionModal()
                }
            })
            return
        }
        post(apiUrl('/product/create'), {
            name,
            description: catalogForm.description.trim()
        }).then(async (productRes) => {
            const productPayload = await productRes.json().catch(() => undefined) as EntityCreateResponse | { error?: string } | undefined
            let productData: EntityCreateResponse | undefined

            if (productRes.ok && productPayload && typeof (productPayload as EntityCreateResponse).id === 'number') {
                productData = productPayload as EntityCreateResponse
            } else if (productPayload?.error) {
                setCatalogStatus(productPayload.error)
            } else {
                setCatalogStatus('Create product failed')
            }

            if (!productData?.id) {
                const duplicateName = (productPayload?.error ?? '').toLowerCase().includes('same name already exists')
                if (duplicateName) {
                    const allProductsRes = await fetch(apiUrl('/product/all'), { cache: 'no-store' })
                    const allProducts = allProductsRes.ok
                        ? await allProductsRes.json().catch(() => [])
                        : []
                    const existingProduct = Array.isArray(allProducts)
                        ? (allProducts as ProductRow[]).find((row) => {
                            const rowName = typeof row?.pname === 'string'
                                ? row.pname.trim()
                                : (typeof row?.name === 'string' ? row.name.trim() : '')
                            return rowName.toLowerCase() === name.toLowerCase()
                        })
                        : undefined
                    if (existingProduct?.id) {
                        productData = { id: Number(existingProduct.id) }
                        setCatalogStatus('')
                    } else {
                        setCatalogStatus('Product already exists but could not be matched. Try refreshing and adding again.')
                        return
                    }
                } else {
                    return
                }
            }
            post(apiUrl('/catalog/create'), {
                shop_id: shopId,
                product_id: productData.id,
                stock_quantity: 0,
                default_unit_price: 0
            }).then(async (res) => {
                if(res.status === 200) {
                    loadCatalog()
                    closeActionModal()
                } else {
                    const json = await res.json().catch(() => undefined)
                    setCatalogStatus(json?.error || 'Add to catalog failed')
                }
            })
        })
    }

    function addSale(e: FormEvent<HTMLFormElement>) {
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
        const selectedProductId = parseInt(saleForm.product_id, 10)
        const payload = {
            shop_id: shopId,
            product_id: selectedProductId,
            quantity,
            unit_price: unitPrice,
            notes: saleForm.notes
        }
        const request = isEditingSale && editingSaleId
            ? put(apiUrl(`/sale/update/${editingSaleId}`), payload)
            : post(apiUrl('/sale/create'), payload)

        request.then(async (res) => {
            const jsonData = await processResponse<EntityCreateResponse>(res, isEditingSale ? 'Update sale failed' : 'Add sale failed', setSaleStatus)
            if (jsonData) {
                loadOverview()
                loadSales()
                loadCatalog()
                closeActionModal()
            }
        })
    }

    function deleteSaleItem(saleRecord: SaleRecord) {
        if (!window.confirm(`Delete sale for ${saleRecord.product_name || 'this item'}?`)) {
            return
        }

        fetch(apiUrl(`/sale/remove/${saleRecord.id}`), { method: 'DELETE' })
            .then(async (res) => {
                if (res.status === 200) {
                    loadSales()
                    loadOverview()
                } else {
                    const data = await res.json().catch(() => undefined)
                    alert(data?.error || 'Delete sale failed')
                }
            })
            .catch(() => alert('Delete sale failed'))
    }

    function addExpense(e: FormEvent<HTMLFormElement>) {
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
        const payload = {
            shop_id: shopId,
            category: expenseForm.category,
            amount,
            notes: expenseForm.notes
        }
        const request = isEditingExpense && editingExpenseId
            ? put(apiUrl(`/expense/update/${editingExpenseId}`), payload)
            : post(apiUrl('/expense/create'), payload)

        request.then(async (res) => {
            const jsonData = await processResponse<EntityCreateResponse>(res, isEditingExpense ? 'Update expense failed' : 'Add expense failed', setExpenseStatus)
            if (jsonData) {
                loadOverview()
                loadExpenses()
                closeActionModal()
            }
        })
    }

    function deleteExpenseItem(expenseRecord: ExpenseRecord) {
        if (!window.confirm(`Delete expense for ${expenseRecord.category}?`)) {
            return
        }

        fetch(apiUrl(`/expense/remove/${expenseRecord.id}`), { method: 'DELETE' })
            .then(async (res) => {
                if (res.ok) {
                    loadExpenses()
                    loadOverview()
                } else {
                    const data = await res.json().catch(() => undefined)
                    alert(data?.error || 'Delete expense failed')
                }
            })
            .catch(() => alert('Delete expense failed'))
    }

    function logout() {
        if (!window.confirm('Log out of Kitabu?')) {
            return
        }
        localStorage.removeItem('kitabu_session')
        setShop(null)
        setSelected(-1)
        closeActionModal()
        setDetailQuery('')
        setExpandedDebtId(null)
        setShowSetupModal(false)
        setSetupMode('login')
        setSetupStatus('')
    }

    const appBadgeShopName = displayShop.sname?.trim() || 'Demo dashboard'
    const showOverviewCards = selected === -1
    const debtFilterOptions = [
        { value: 'all', label: 'All' },
        { value: 'paid', label: 'Paid' },
        { value: 'forgiven', label: 'Forgiven' },
        { value: 'fully', label: 'Fully paid' },
        { value: 'partial', label: 'Partially paid' },
        { value: 'outstanding', label: 'Outstanding' }
    ]
    const detailHeaderTitle = selected === 0
        ? 'Debt'
        : selected === 1
            ? 'Sales'
            : selected === 2
                ? 'Expenses'
                : selected === 3
                    ? 'Catalog'
                    : selected === 4
                        ? 'Stock'
                        : 'Details'
    const detailModalTone: ModalTone | null = selected === 0
        ? 'debt'
        : selected === 1
            ? 'sale'
            : selected === 2
                ? 'expense'
                : selected === 3
                    ? 'catalog'
                    : selected === 4
                        ? 'stock'
                        : null
    const modalTone: ModalTone = detailModalTone ?? activeModal ?? 'debt'

    const topBar =  (
            <>
                <div className="brand-strip overview-row sticky-brand-strip plain-header">
                    <div className="plain-brand">
                        <span className="plain-brand-icon-wrap" aria-hidden="true">
                            <img src={shopLogo} alt="" className="plain-brand-logo" />
                        </span>
                        <div className="plain-brand-copy">
                            <span className="plain-brand-label">Kitabu</span>
                            <span className="plain-brand-shopline">{appBadgeShopName}</span>
                        </div>
                    </div>
                    <div className={`profit-panel ${performanceDeltaToShow >= 0 ? 'positive' : 'negative'}`}>
                        <div className="profit-panel-top">
                            <div className="header-period-wrap">
                                <select
                                    className="compact-select period-select header-period-select"
                                    aria-label="Select period"
                                    value={homePeriod}
                                    onChange={(e) => {
                                        if (isPeriodOption(e.target.value)) {
                                            setHomePeriod(e.target.value)
                                        }
                                    }}
                                >
                                    <option value="day">Daily</option>
                                    <option value="week">Weekly</option>
                                    <option value="month">Monthly</option>
                                    <option value="year">Yearly</option>
                                    <option value="custom">Custom</option>
                                </select>
                                <i className="fa-solid fa-chevron-down period-select-caret" aria-hidden="true" />
                            </div>
                            <span className="profit-context">Returns</span>
                            <span className={`profit-value ${performanceDeltaToShow >= 0 ? 'positive' : 'negative'}`}>
                                {performanceDeltaToShow >= 0 ? '+' : '-'}{formatMoney(Math.abs(performanceDeltaToShow))}
                            </span>
                        </div>
                    </div>
                </div>
                {needsSetup && (
                    <div className="overview-row setup-notice-card">
                        <button className="primary-button setup-trigger" type="button" onClick={() => openSetupDialog('login')}>
                            Set up shop
                        </button>
                    </div>
                )}
                {homePeriod === 'custom' && (
                    <div className="custom-range-grid overview-row">
                        <label className="field-group">
                            <span className="field-label">From</span>
                            <input type="datetime-local" value={homeCustomFrom} onChange={(e) => setHomeCustomFrom(e.target.value)} />
                        </label>
                        <label className="field-group">
                            <span className="field-label">To</span>
                            <input type="datetime-local" value={homeCustomTo} onChange={(e) => setHomeCustomTo(e.target.value)} />
                        </label>
                    </div>
                )}
                {showOverviewCards && (
                <>
                <div className="overview-card-grid overview-row arranged-grid">
                    <article className="mini-stat-card overview-tile sales-card tile-sales" onClick={() => openDetailSection(1)} role="button" tabIndex={0} onKeyDown={(e: KeyboardEvent<HTMLElement>) => { if (e.key === 'Enter' || e.key === ' ') openDetailSection(1) }}>
                        <div className="mini-stat-top">
                            <span className="mini-stat-icon positive">
                                <i className="fa-solid fa-cash-register" aria-hidden="true" />
                            </span>
                            <button className="mini-add-button sale-add-button" type="button" onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); openModalForCreate('sale') }}>+</button>
                        </div>
                        <span className="stat-label">Sales</span>
                        <span className="stat-value">KSh {formatCompactValue(salesTotalForTiles)}</span>
                        <div className="mini-records">
                            {recentSalesForTiles.length === 0 && <span className="mini-empty">No sales yet</span>}
                            {recentSalesForTiles.map((sale) => (
                                <div className="mini-record" key={`sale-${sale.id}`}>
                                    <span className="mini-record-title">{sale.product_name}</span>
                                    <span className="mini-record-meta">{formatCompactValue(sale.total_amount)}</span>
                                </div>
                            ))}
                        </div>
                    </article>
                    <article className="mini-stat-card overview-tile expenses-card tile-expenses" onClick={() => openDetailSection(2)} role="button" tabIndex={0} onKeyDown={(e: KeyboardEvent<HTMLElement>) => { if (e.key === 'Enter' || e.key === ' ') openDetailSection(2) }}>
                        <div className="mini-stat-top">
                            <span className="mini-stat-icon warning">
                                <i className="fa-solid fa-receipt" aria-hidden="true" />
                            </span>
                            <button className="mini-add-button expense-add-button" type="button" onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); openModalForCreate('expense') }}>+</button>
                        </div>
                        <span className="stat-label">Expenses</span>
                        <span className="stat-value">KSh {formatCompactValue(expenseTotalForTiles)}</span>
                        <div className="mini-records">
                            {recentExpensesForTiles.length === 0 && <span className="mini-empty">No expenses yet</span>}
                            {recentExpensesForTiles.map((expense) => (
                                <div className="mini-record" key={`expense-${expense.id}`}>
                                    <span className="mini-record-title">{expense.category}</span>
                                    <span className="mini-record-meta">{formatCompactValue(expense.amount)}</span>
                                </div>
                            ))}
                        </div>
                    </article>
                    <article className="mini-stat-card overview-tile debt-card-overview tile-debt" onClick={() => openDetailSection(0)} role="button" tabIndex={0} onKeyDown={(e: KeyboardEvent<HTMLElement>) => { if (e.key === 'Enter' || e.key === ' ') openDetailSection(0) }}>
                        <div className="mini-stat-top">
                            <span className="mini-stat-icon neutral">
                                <i className="fa-solid fa-hand-holding-dollar" aria-hidden="true" />
                            </span>
                            <button className="mini-add-button debt-add-button" type="button" onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); openModalForCreate('debt') }}>+</button>
                        </div>
                        <span className="stat-label">Debt</span>
                        <span className="stat-value">KSh {formatCompactValue(debtTotalForTiles)}</span>
                        <div className="mini-records">
                            {recentDebtsForTiles.length === 0 && <span className="mini-empty">No debts yet</span>}
                            {recentDebtsForTiles.map((debtItem) => (
                                <div className="mini-record" key={`debt-${debtItem.id}`}>
                                    <span className="mini-record-title">{debtItem.debtor || debtItem.comments || debtItem.pname}</span>
                                    <span className="mini-record-meta">{formatCompactValue(debtItem.total_price)}</span>
                                </div>
                            ))}
                        </div>
                    </article>
                    <article className="mini-stat-card overview-tile catalog-card tile-catalog" onClick={() => openDetailSection(3)} role="button" tabIndex={0} onKeyDown={(e: KeyboardEvent<HTMLElement>) => { if (e.key === 'Enter' || e.key === ' ') openDetailSection(3) }}>
                        <div className="mini-stat-top">
                            <span className="mini-stat-icon catalog">
                                <i className="fa-solid fa-tags" aria-hidden="true" />
                            </span>
                            <button className="mini-add-button catalog-add-button" type="button" onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); openModalForCreate('catalog') }}>+</button>
                        </div>
                        <span className="stat-label">Catalog</span>
                        <span className="stat-value">{catalogCountForTiles}</span>
                        <div className="mini-records">
                            {recentCatalogForTiles.length === 0 && <span className="mini-empty">No items yet</span>}
                            {recentCatalogForTiles.map((item) => (
                                <div className="mini-record" key={`catalog-${item.product_id}`}>
                                    <span className="mini-record-title">{item.pname}</span>
                                    <span className="mini-record-meta">{item.description || 'Catalog item'}</span>
                                </div>
                            ))}
                        </div>
                    </article>
                    <article className="mini-stat-card overview-tile stock-card stock-card-center tile-stock" onClick={() => openDetailSection(4)} role="button" tabIndex={0} onKeyDown={(e: KeyboardEvent<HTMLElement>) => { if (e.key === 'Enter' || e.key === ' ') openDetailSection(4) }}>
                        <div className="mini-stat-top">
                            <span className="mini-stat-icon stock">
                                <i className="fa-solid fa-boxes-stacked" aria-hidden="true" />
                            </span>
                            <button className="mini-add-button stock-add-button" type="button" onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); openModalForCreate('stock') }}>+</button>
                        </div>
                        <span className="stat-label">Stock</span>
                        <span className="stat-value">KSh {formatCompactValue(stockValueForTiles)}</span>
                        <div className="mini-records">
                            <div className="mini-record">
                                <span className="mini-record-title">Value in stock</span>
                                <span className="mini-record-meta">{formatMoney(stockValueForTiles)}</span>
                            </div>
                        </div>
                    </article>
                </div>
                </>
                )}
            </>
    )

    async function giveDebt(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setDebtStatus('')
        if(!shopId) {
            setDebtStatus('Shop id missing. Please go back and open a shop.')
            return
        }
        if (debt.product_id === -1 || debt.quantity === -1 || debt.unit_price === -1) {
            setDebtStatus('Fill all fields')
            return
        }
        const payload = {...debt, creditor_shop_id: shopId}
        const request = isEditingDebt && editingDebtId
            ? put(apiUrl(`/debt/update/${editingDebtId}`), payload)
            : post(apiUrl('/debt/create'), payload)

        request.then(async (res) => {
            const jsonData = await processResponse<EntityCreateResponse>(res, isEditingDebt ? 'Debt update failed' : 'Debt creation failed', setDebtStatus)
            if (jsonData && !jsonData.error) {
                loadDebts()
                loadOverview()
                closeActionModal()
            }
        })
    }

    const setupModal = showSetupModal ? (
        <div className="modal-backdrop setup-backdrop" onClick={closeSetupDialog}>
            <div className="modal-card setup-card" onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
                <h3>{setupMode === 'signup' ? 'Create your dashboard account' : 'Log in to your dashboard'}</h3>
                <p className="page-subtitle">
                    {setupMode === 'signup'
                        ? 'Use your shop name and phone number to activate the dashboard.'
                        : 'Enter your phone number to continue.'}
                </p>
                <form
                    className="setup-form"
                    onSubmit={async (e) => {
                        e.preventDefault()
                        setSetupStatus('')
                        const normalizedPhone = setupData.phone.trim()

                        if (!normalizedPhone) {
                            setSetupStatus('Phone number is required')
                            return
                        }

                        if (setupMode === 'signup') {
                            const shopName = setupData.shop.trim()
                            if (!shopName) {
                                setSetupStatus('Shop name is required')
                                return
                            }

                            const userRes = await post(apiUrl('/user/create'), {
                                fname: shopName,
                                lname: '',
                                phone: normalizedPhone
                            })
                            const userData = await processResponse<UserCreateResponse>(userRes, 'Sign up Failed', setSetupStatus)
                            if (userData) {
                                const shopRes = await post(apiUrl('/shop/create'), {
                                    owner_id: userData.id,
                                    name: shopName
                                })
                                const shopData = await processResponse<ShopCreateResponse>(shopRes, 'Shop creation failed', setSetupStatus)
                                if (shopData) {
                                    const session = {
                                        shop_id: shopData.id,
                                        sname: shopName,
                                        fname: shopName,
                                        lname: '',
                                        phone: normalizedPhone,
                                        id: userData.id
                                    }
                                    localStorage.setItem('kitabu_session', JSON.stringify(session))
                                    setShop(session)
                                    closeSetupDialog()
                                }
                            }
                        } else {
                            const userRes = await fetch(apiUrl(`/user/phone/${encodeURIComponent(normalizedPhone)}`))
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
                            closeSetupDialog()
                        }
                    }}
                >
                    {setupMode === 'signup' && (
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
                    )}
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
                    <div className="modal-actions setup-actions">
                        <button className="ghost-button" type="button" onClick={closeSetupDialog}>
                            Cancel
                        </button>
                        <button className="primary-button" type="submit">
                            {setupMode === 'signup' ? 'Create account' : 'Log in'}
                        </button>
                    </div>
                    <button
                        type="button"
                        className="ghost-button setup-switch-button"
                        onClick={() => {
                            setSetupStatus('')
                            setSetupMode(setupMode === 'signup' ? 'login' : 'signup')
                        }}
                    >
                        {setupMode === 'signup' ? 'Already have an account? Log in' : 'Register'}
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
            <div className="detail-nav-title">{detailHeaderTitle}</div>
            <button
                className="primary-button detail-add-button"
                type="button"
                onClick={() => openModalForCreate(
                    selected === 0 ? 'debt' :
                    selected === 1 ? 'sale' :
                    selected === 2 ? 'expense' :
                    selected === 3 ? 'catalog' :
                    'stock'
                )}
            >
                +
            </button>
        </div>
    )

    const pageFooter = (
        <div className="page-footer">
            <img className="footer-flag footer-flag-subtle" src={kenyaFlagGif} alt="" aria-hidden="true" />
            <div className="footer-copy footer-contact-label">Contact us</div>
            <div className="footer-copy">0741299069</div>
            <div className="footer-copy">Kikuyu, Thogoto</div>
            <div className="footer-copy">© {currentYear} Kitabu</div>
            <button className="footer-logout-link" type="button" onClick={logout}>
                Log out
            </button>
        </div>
    )

    const detailPeriodBar = (
        <div className="debt-inline-zone detail-period-anchor">
            <div className="period-strip detail-period-strip">
                <select
                    className="compact-select period-select"
                    aria-label="Select period"
                    value={detailPeriod}
                    onChange={(e) => {
                        if (isPeriodOption(e.target.value)) {
                            setDetailPeriod(e.target.value)
                        }
                    }}
                >
                    <option value="day">Daily</option>
                    <option value="week">Weekly</option>
                    <option value="month">Monthly</option>
                    <option value="year">Yearly</option>
                    <option value="custom">Custom</option>
                </select>
                {detailPeriod === 'custom' && (
                    <div className="custom-range-grid detail-period-grid">
                        <label className="field-group">
                            <span className="field-label">From</span>
                            <input
                                className="field-input"
                                type="datetime-local"
                                value={detailCustomFrom}
                                onChange={(e) => setDetailCustomFrom(e.target.value)}
                            />
                        </label>
                        <label className="field-group">
                            <span className="field-label">To</span>
                            <input
                                className="field-input"
                                type="datetime-local"
                                value={detailCustomTo}
                                onChange={(e) => setDetailCustomTo(e.target.value)}
                            />
                        </label>
                    </div>
                )}
            </div>
        </div>
    )

    const welcomeToast = welcomeMessage ? (
        <div className="welcome-toast welcome-toast-bottom" role="status" aria-live="polite">
            <i className="fa-solid fa-hand-sparkles" aria-hidden="true" />
            <span>{welcomeMessage}</span>
            <button type="button" className="welcome-dismiss" onClick={() => setWelcomeMessage('')} aria-label="Dismiss welcome message">
                <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
        </div>
    ) : null

    const actionModal = activeModal ? (
        <div className="modal-backdrop" onClick={closeActionModal}>
            <div className={`modal-card action-modal modal-tone-${modalTone}`} onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
                {activeModal === 'debt' && (
                    <>
                        <h3>{activeModalTitle.debt}</h3>
                        <p className="page-subtitle">Record what was taken on credit and note the name or phone number.</p>
                        <form className="quick-entry-form" onSubmit={giveDebt}>
                            <label className="field-group">
                                <span className="field-label">Catalog item</span>
                                <select
                                    value={debt.product_id}
                                    disabled={catalogLoaded && catalog.length === 0}
                                    onChange={(e) => {
                                        const nextProductId = parseInt(e.target.value, 10)
                                        const selectedCatalog = getCatalogItem(nextProductId)
                                        setDebt((old) => ({
                                            ...old,
                                            product_id: nextProductId,
                                            unit_price: Number(selectedCatalog?.default_unit_price ?? old.unit_price)
                                        }))
                                    }}
                                >
                                    {uniqueCatalog.map((c) => <option key={c.product_id} value={c.product_id}>{c.pname}</option>)}
                                </select>
                            </label>
                            <div className="modal-hint span-2">
                                Stock available: {formatCompactValue(getCatalogItem(debt.product_id)?.stock_quantity ?? 0)} · Default price: {formatMoney(getCatalogItem(debt.product_id)?.default_unit_price ?? 0)}
                            </div>
                            <label className="field-group">
                                <span className="field-label">Quantity</span>
                                <input type="number" min="1" placeholder="Qty" value={debt.quantity > 0 ? String(debt.quantity) : ''} onChange={(e) => setDebt((old) => ({ ...old, quantity: parseInt(e.target.value, 10) }))} />
                            </label>
                            <label className="field-group">
                                <span className="field-label">Unit price</span>
                                <input type="number" min="0" step="0.01" placeholder="Unit price" value={debt.unit_price > 0 ? String(debt.unit_price) : ''} onChange={(e) => setDebt((old) => ({ ...old, unit_price: parseFloat(e.target.value) }))} />
                            </label>
                            <label className="field-group span-2">
                                <span className="field-label">Comments</span>
                                <input type="text" placeholder="Name / phone number" value={debt.comments} onChange={(e) => setDebt((old) => ({ ...old, comments: e.target.value }))} />
                            </label>
                            <div className="modal-actions span-2">
                                <span className="status-text">{debtStatus}</span>
                                <button className="ghost-button" type="button" onClick={closeActionModal}>Cancel</button>
                                <button className="primary-button" type="submit" disabled={catalogLoaded && catalog.length === 0}>{isEditingDebt ? 'Save debt' : 'Record debt'}</button>
                            </div>
                        </form>
                    </>
                )}
                {activeModal === 'sale' && (
                    <>
                        <h3>{activeModalTitle.sale}</h3>
                        <p className="page-subtitle">Capture a walk-in or cash sale.</p>
                        <form className="quick-entry-form" onSubmit={addSale}>
                            <label className="field-group">
                                <span className="field-label">Catalog item</span>
                                <select value={saleForm.product_id} onChange={(e) => {
                                    const selectedCatalog = getCatalogItem(e.target.value)
                                    setSaleForm((old) => ({
                                        ...old,
                                        product_id: e.target.value,
                                        unit_price: String(selectedCatalog?.default_unit_price ?? '')
                                    }))
                                }}>
                                    <option value="">Select item</option>
                                    {uniqueCatalog.map((c) => <option key={c.product_id} value={c.product_id}>{c.pname}</option>)}
                                </select>
                            </label>
                            <div className="modal-hint span-2">
                                Stock available: {formatCompactValue(getCatalogItem(saleForm.product_id)?.stock_quantity ?? 0)} · Default price: {formatMoney(getCatalogItem(saleForm.product_id)?.default_unit_price ?? 0)}
                            </div>
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
                                <span className="status-text">{saleStatus}</span>
                                <button className="ghost-button" type="button" onClick={closeActionModal}>Cancel</button>
                                <button className="primary-button" type="submit">{isEditingSale ? 'Save sale' : 'Add sale'}</button>
                            </div>
                        </form>
                    </>
                )}
                {activeModal === 'expense' && (
                    <>
                        <h3>{activeModalTitle.expense}</h3>
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
                                <span className="status-text">{expenseStatus}</span>
                                <button className="ghost-button" type="button" onClick={closeActionModal}>Cancel</button>
                                <button className="primary-button" type="submit">{isEditingExpense ? 'Save expense' : 'Record expense'}</button>
                            </div>
                        </form>
                    </>
                )}
                {(activeModal === 'catalog' || activeModal === 'stock') && (
                    <>
                        <h3>{activeModal === 'stock' ? activeModalTitle.stock : activeModalTitle.catalog}</h3>
                        <p className="page-subtitle">
                            {activeModal === 'catalog'
                                ? isEditingCatalog
                                    ? 'Update the product details used by this catalog item.'
                                    : 'Type the product name and add it straight to your catalog.'
                                : isEditingCatalog
                                    ? 'Adjust the stock level and default price tracked for this item.'
                                    : 'Record a fresh stock arrival before it hits your shelves.'
                            }
                        </p>
                        <form className="quick-entry-form" onSubmit={(e) => { e.preventDefault(); addToCatalog() }}>
                            {activeModal === 'catalog' ? (
                                <>
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
                                </>
                            ) : (
                                <label className="field-group span-2">
                                    <span className="field-label">Catalog item</span>
                                    {isEditingCatalog ? (
                                        <input type="text" value={catalogForm.name} readOnly />
                                    ) : (
                                        <select
                                            value={catalogForm.product_id}
                                            disabled={catalogLoaded && uniqueCatalog.length === 0}
                                            onChange={(e) => {
                                                const selectedCatalog = getCatalogItem(e.target.value)
                                                setCatalogForm((old) => ({
                                                    ...old,
                                                    product_id: e.target.value,
                                                    name: selectedCatalog?.pname ?? '',
                                                    description: selectedCatalog?.description ?? '',
                                                    default_unit_price: selectedCatalog?.default_unit_price ? String(selectedCatalog.default_unit_price) : old.default_unit_price
                                                }))
                                            }}
                                        >
                                            <option value="">Select catalog item</option>
                                            {uniqueCatalog.map((c) => (
                                                <option key={c.product_id} value={c.product_id}>{c.pname}</option>
                                            ))}
                                        </select>
                                    )}
                                </label>
                            )}
                            {activeModal === 'stock' && (
                                <>
                                    <label className="field-group">
                                        <span className="field-label">Stock quantity</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={catalogForm.stock_quantity}
                                            onChange={(e) => setCatalogForm((old) => ({ ...old, stock_quantity: e.target.value }))}
                                        />
                                    </label>
                                    <label className="field-group">
                                        <span className="field-label">Default price</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={catalogForm.default_unit_price}
                                            onChange={(e) => setCatalogForm((old) => ({ ...old, default_unit_price: e.target.value }))}
                                        />
                                    </label>
                                </>
                            )}
                            <div className="modal-actions span-2">
                                <span className="status-text">{catalogStatus}</span>
                                <button className="ghost-button" type="button" onClick={closeActionModal}>Cancel</button>
                                <button
                                    className="primary-button"
                                    type="submit"
                                    disabled={activeModal === 'stock' && !isEditingCatalog && uniqueCatalog.length === 0}
                                >
                                    {activeModal === 'catalog'
                                        ? isEditingCatalog ? 'Save item' : 'Add to catalog'
                                        : isEditingCatalog ? 'Save stock' : 'Add stock'
                                    }
                                </button>
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
        return <div className={`shop-page home-page ${healthTone}`}>
            {topBar}
            {setupModal}
            {actionModal}
            {pageFooter}
            {welcomeToast}
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
        return <div className={`shop-page detail-page debt-detail-page ${healthTone}`}>
            {setupModal}
            {actionModal}
            {welcomeToast}
            {detailNav}
            <div className="debt-inline-zone detail-intro detail-intro-debt">
                <div className="panel-search">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M15.5 14h-.8l-.3-.3a6.5 6.5 0 1 0-.7.7l.3.3v.8l4.8 4.8a1 1 0 0 0 1.4-1.4L15.5 14zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search debts"
                        value={detailQuery}
                        onChange={(e) => setDetailQuery(e.target.value)}
                    />
                </div>
                {catalogLoaded && catalog.length === 0 && (
                    <div className="notice-card notice-compact">
                        <div className="notice-title">Catalog required</div>
                        <p className="notice-text">Add one item to continue.</p>
                        <button className="notice-link" onClick={() => openDetailSection(3)}>
                            Open Catalog
                        </button>
                    </div>
                )}
            </div>
            {detailPeriodBar}
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
                <div className="panel-list detail-scroll-list" ref={detailListRef} onScroll={handleDetailScroll}>
                    {filteredDebts.length === 0 && (
                        <div className="empty-state">No debts recorded yet.</div>
                    )}
                    {visibleDebts
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
                            const showDebtActions = !isForgiven && !isFull
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
                                    {showDebtActions && (
                                        <div className="debt-actions">
                                            {!hasSettlement && (
                                                <button
                                                    className="ghost-button icon-button"
                                                    onClick={() => openDebtEditor(d)}
                                                    aria-label="Edit debt"
                                                    title="Edit debt"
                                                >
                                                    <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
                                                </button>
                                            )}
                                            {!hasSettlement && (
                                                <button
                                                    className="ghost-button danger icon-button"
                                                    onClick={() => deleteDebtItem(d)}
                                                    aria-label="Delete debt"
                                                    title="Delete debt"
                                                >
                                                    <i className="fa-solid fa-trash-can" aria-hidden="true" />
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
                                            <button className="ghost-button forgive" onClick={() => forgiveDebt(d)}>
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
                    {visibleCounts.debt < filteredDebts.length && (
                        <div className="list-pagination-hint">Scroll down to load more debts</div>
                    )}
                </div>
            </div>
            {settleTarget && (
                <div className="modal-backdrop" onClick={() => setSettleTarget(null)}>
                    <div className="modal-card" onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
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
        return <div className={`shop-page detail-page sales-detail-page ${healthTone}`}>
            {setupModal}
            {actionModal}
            {welcomeToast}
            {detailNav}
            <div className="debt-inline-zone detail-intro detail-intro-sales">
                <div className="panel-search">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M15.5 14h-.8l-.3-.3a6.5 6.5 0 1 0-.7.7l.3.3v.8l4.8 4.8a1 1 0 0 0 1.4-1.4L15.5 14zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search sales"
                        value={detailQuery}
                        onChange={(e) => setDetailQuery(e.target.value)}
                    />
                </div>
            </div>
            {detailPeriodBar}
            <div className="panel glass detail-scroll-panel sales-tone-panel">
                <div className="ledger-total">
                    <span className="ledger-label">Sales total</span>
                    <span className="ledger-value">{formatMoney(overview.sales_total)}</span>
                    <span className="ledger-meta">{sales.length} sales</span>
                </div>
                <div className="panel-list detail-scroll-list" ref={detailListRef} onScroll={handleDetailScroll}>
                    {filteredSales.length === 0 && (
                        <div className="empty-state">No sales in this period yet.</div>
                    )}
                    {visibleSales.map((sale) => (
                        <div className="list-item" key={sale.id}>
                            <div>
                                <div className="item-title">{sale.product_name}</div>
                                <div className="item-meta">{sale.quantity} × {sale.unit_price} · {sale.notes || 'No note'} · {formatTs(sale.sale_date)}</div>
                            </div>
                            <div className="item-actions">
                                <div className="total-value">{formatMoney(sale.total_amount)}</div>
                                <button className="ghost-button icon-button" type="button" onClick={() => openSaleEditor(sale)} aria-label="Edit sale" title="Edit sale">
                                    <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
                                </button>
                                <button className="ghost-button danger icon-button" type="button" onClick={() => deleteSaleItem(sale)} aria-label="Delete sale" title="Delete sale">
                                    <i className="fa-solid fa-trash-can" aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {visibleCounts.sale < filteredSales.length && (
                        <div className="list-pagination-hint">Scroll down to load more sales</div>
                    )}
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
        return <div className={`shop-page detail-page expenses-detail-page ${healthTone}`}>
            {setupModal}
            {actionModal}
            {welcomeToast}
            {detailNav}
            <div className="debt-inline-zone detail-intro detail-intro-expenses">
                <div className="panel-search">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M15.5 14h-.8l-.3-.3a6.5 6.5 0 1 0-.7.7l.3.3v.8l4.8 4.8a1 1 0 0 0 1.4-1.4L15.5 14zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search expenses"
                        value={detailQuery}
                        onChange={(e) => setDetailQuery(e.target.value)}
                    />
                </div>
            </div>
            {detailPeriodBar}
            <div className="panel glass detail-scroll-panel expenses-tone-panel">
                <div className="ledger-total">
                    <span className="ledger-label">Expense total</span>
                    <span className="ledger-value">{formatMoney(overview.expense_total)}</span>
                    <span className="ledger-meta">{expenses.length} expenses</span>
                </div>
                <div className="panel-list detail-scroll-list" ref={detailListRef} onScroll={handleDetailScroll}>
                    {filteredExpenses.length === 0 && (
                        <div className="empty-state">No expenses in this period yet.</div>
                    )}
                    {visibleExpenses.map((expense) => (
                        <div className="list-item" key={expense.id}>
                            <div>
                                <div className="item-title">{expense.category}</div>
                                <div className="item-meta">{expense.notes || 'No note'} · {formatTs(expense.expense_date)}</div>
                            </div>
                            <div className="item-actions">
                                <div className="total-value">{formatMoney(expense.amount)}</div>
                                <button className="ghost-button icon-button" type="button" onClick={() => openExpenseEditor(expense)} aria-label="Edit expense" title="Edit expense">
                                    <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
                                </button>
                                <button className="ghost-button danger icon-button" type="button" onClick={() => deleteExpenseItem(expense)} aria-label="Delete expense" title="Delete expense">
                                    <i className="fa-solid fa-trash-can" aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {visibleCounts.expense < filteredExpenses.length && (
                        <div className="list-pagination-hint">Scroll down to load more expenses</div>
                    )}
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
        return <div className={`shop-page detail-page catalog-detail-page ${healthTone}`}>
            {setupModal}
            {actionModal}
            {welcomeToast}
            {detailNav}
            <div className="debt-inline-zone detail-intro detail-intro-catalog">
                <div className="panel-search">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M15.5 14h-.8l-.3-.3a6.5 6.5 0 1 0-.7.7l.3.3v.8l4.8 4.8a1 1 0 0 0 1.4-1.4L15.5 14zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search catalog"
                        value={detailQuery}
                        onChange={(e) => setDetailQuery(e.target.value)}
                    />
                </div>
            </div>
            {detailPeriodBar}
            <div className="panel glass detail-scroll-panel catalog-tone-panel">
                <div className="panel-header">
                    <div>
                        <h2>Catalog items</h2>
                    </div>
                </div>
                <div className="panel-list detail-scroll-list" ref={detailListRef} onScroll={handleDetailScroll}>
                    {filteredCatalog.length === 0 && (
                        <div className="empty-state">No catalog items yet.</div>
                    )}
                    {visibleCatalog.filter(c => c?.pname).map(c => (
                        <div className="list-item" key={c.product_id}>
                            <div>
                                <div className="item-title">{c.pname}</div>
                                <div className="item-meta">{c.description || 'No description'} · Default {formatMoney(c.default_unit_price)}</div>
                            </div>
                            <div className="item-actions">
                                <button className="ghost-button icon-button" type="button" onClick={() => openCatalogEditor(c)} aria-label="Edit catalog item" title="Edit catalog item">
                                    <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
                                </button>
                                <button className="ghost-button danger icon-button" onClick={() => removeCatalogItem(c)} aria-label="Delete catalog item" title="Delete catalog item">
                                    <i className="fa-solid fa-trash-can" aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {visibleCounts.catalog < filteredCatalog.length && (
                        <div className="list-pagination-hint">Scroll down to load more catalog items</div>
                    )}
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
    } else if (selected === 4) {
        return <div className={`shop-page detail-page stock-detail-page ${healthTone}`}>
            {setupModal}
            {actionModal}
            {welcomeToast}
            {detailNav}
            <div className="debt-inline-zone detail-intro detail-intro-stock">
                <div className="panel-search">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M15.5 14h-.8l-.3-.3a6.5 6.5 0 1 0-.7.7l.3.3v.8l4.8 4.8a1 1 0 0 0 1.4-1.4L15.5 14zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search stock"
                        value={detailQuery}
                        onChange={(e) => setDetailQuery(e.target.value)}
                    />
                </div>
            </div>
            {detailPeriodBar}
                <div className="panel glass detail-scroll-panel stock-tone-panel">
                    <div className="ledger-total">
                        <span className="ledger-label">Units in stock</span>
                        <span className="ledger-value">{formatCompactValue(filteredStock.reduce((sum, item) => sum + (Number(item.stock_quantity) || 0), 0))}</span>
                        <span className="ledger-meta">{lowStockCount} low-stock items</span>
                        <span className="ledger-meta">Value {formatMoney(filteredStockValue || stockValueToShow)}</span>
                    </div>
                <div className="panel-list detail-scroll-list" ref={detailListRef} onScroll={handleDetailScroll}>
                    {filteredStock.length === 0 && (
                        <div className="empty-state">No stock items yet.</div>
                    )}
                    {visibleStock.map((item) => (
                        <div className="list-item" key={`stock-${item.product_id}`}>
                            <div>
                                <div className="item-title">{item.pname}</div>
                                <div className="item-meta">
                                    {item.description || 'No description'} · Qty {formatCompactValue(item.stock_quantity)} · Default {formatMoney(item.default_unit_price)}
                                </div>
                            </div>
                            <div className="item-actions">
                                <button className="ghost-button icon-button" type="button" onClick={() => openCatalogEditor(item, 'stock')} aria-label="Edit stock item" title="Edit stock item">
                                    <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
                                </button>
                                <button className="ghost-button danger icon-button" type="button" onClick={() => clearStockItem(item)} aria-label="Clear stock item" title="Clear stock item">
                                    <i className="fa-solid fa-trash-can" aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {visibleCounts.stock < filteredStock.length && (
                        <div className="list-pagination-hint">Scroll down to load more stock items</div>
                    )}
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
        return <div className={`shop-page home-page ${healthTone}`}>{topBar}{setupModal}{actionModal}{pageFooter}{welcomeToast}</div>
    }
}
