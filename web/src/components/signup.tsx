import { useState } from "react"
import type { ChangeEvent, FormEvent } from "react"
import {useNavigate} from 'react-router-dom'
import { apiUrl, post, processResponse } from './util'
import './signup.css'
import dashboardShot from '../assets/dashboard-screenshot.svg'

type AuthMode = 'login' | 'signup'
type SignUpResponse = { id: number; existing?: boolean; error?: string }
type ShopResponse = { id: number; error?: string }

export function SignUp() {
    const navigate = useNavigate()
    const [mode, setMode] = useState<AuthMode>('login')
    const [user, setUser] = useState({
        phone: '',
        shop: ''
    })
    const [status, setStatus] = useState("")

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setUser((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    async function authenticate(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setStatus('')

        const phone = user.phone.trim()
        if (!phone) {
            setStatus('Phone number is required')
            return
        }

        if (mode === 'signup') {
            const shopName = user.shop.trim()
            if (!shopName) {
                setStatus('Shop name is required')
                return
            }

            const userRes = await post(apiUrl('/user/create'), {
                fname: shopName,
                lname: '',
                phone
            })

            const userData = await processResponse<SignUpResponse>(userRes, 'Sign up Failed', setStatus)
            if (!userData) return

            const shopRes = await post(apiUrl('/shop/create'), {
                owner_id: userData.id,
                name: shopName
            })
            const shopData = await processResponse<ShopResponse>(shopRes, 'Shop creation failed', setStatus)
            if (!shopData) return

            const session = {
                shop_id: shopData.id,
                sname: shopName,
                fname: shopName,
                lname: '',
                phone,
                id: userData.id
            }
            localStorage.setItem('kitabu_session', JSON.stringify(session))
            navigate('/shopdisplay', {
                state: session,
                replace: true
            })
            return
        }

        const loginRes = await fetch(apiUrl(`/user/phone/${encodeURIComponent(phone)}`))
        if (loginRes.status !== 200) {
            setStatus('Account not found')
            return
        }

        const loginUser = await loginRes.json()
        const shopRes = await fetch(apiUrl(`/shop/owner/${loginUser.id}`))
        if (shopRes.status !== 200) {
            setStatus('No shop found for this account')
            return
        }

        const shopData = await shopRes.json()
        const session = {
            shop_id: shopData.id,
            sname: shopData.sname,
            fname: loginUser.fname,
            lname: loginUser.lname,
            phone: loginUser.phone,
            id: loginUser.id
        }
        localStorage.setItem('kitabu_session', JSON.stringify(session))
        navigate('/shopdisplay', {
            state: session,
            replace: true
        })
    }

    return (
        <div className="signup-page">
            <section className="signup-grid">
                <div className="signup-hero">
                    <div className="hero-copy-block">
                        <div className="hero-eyebrow brand-line">
                            <i className="fa-solid fa-book brand-icon" aria-hidden="true" />
                            <span className="brand-name">Kitabu</span>
                        </div>
                        <h1 className="hero-title">Kitabu cha deni.</h1>
                        <p className="hero-copy">
                            Land on the dashboard first, then configure your account when you are ready.
                        </p>
                        <div className="hero-metrics">
                            <div className="metric">
                                <span className="metric-value">1 phone</span>
                                <span className="metric-label">to log in</span>
                            </div>
                            <div className="metric">
                                <span className="metric-value">2 fields</span>
                                <span className="metric-label">to sign up</span>
                            </div>
                            <div className="metric">
                                <span className="metric-value">0 paper</span>
                                <span className="metric-label">ledger mess</span>
                            </div>
                        </div>
                    </div>
                    <div className="hero-shot">
                        <div className="shot-header">
                            <span className="shot-label">Main dashboard</span>
                            <span className="shot-note">Live balances and customer status at a glance.</span>
                        </div>
                        <img src={dashboardShot} alt="Kitabu dashboard preview" />
                    </div>
                    <div className="steps-card">
                        <h3>Fast setup flow</h3>
                        <ul className="steps-list">
                            <li className="steps-item">
                                <span className="step-badge">1</span>
                                <span className="step-text">Log in with your phone number.</span>
                            </li>
                            <li className="steps-item">
                                <span className="step-badge">2</span>
                                <span className="step-text">If you are new, create an account with shop name + phone.</span>
                            </li>
                            <li className="steps-item">
                                <span className="step-badge">3</span>
                                <span className="step-text">Start recording debts, sales, and expenses.</span>
                            </li>
                        </ul>
                    </div>
                </div>
                <form className="signup-card" onSubmit={authenticate}>
                    <div>
                        <h2>{mode === 'signup' ? 'Create account' : 'Log in'}</h2>
                        <p className="page-subtitle">
                            {mode === 'signup'
                                ? 'Use your shop name and phone to activate your dashboard.'
                                : 'Use your phone number to open your dashboard.'}
                        </p>
                    </div>
                    <div>
                        {mode === 'signup' && (
                            <label className="field-group">
                                <span className="field-label">Shop name</span>
                                <input
                                    className="field-input"
                                    name="shop"
                                    type="text"
                                    placeholder="Makini Shop"
                                    onChange={handleChange}
                                    value={user.shop}
                                    required
                                />
                            </label>
                        )}
                        <label className="field-group">
                            <span className="field-label">Phone number</span>
                            <input
                                className="field-input"
                                name="phone"
                                type="tel"
                                placeholder="0712 345 678"
                                onChange={handleChange}
                                value={user.phone}
                                required
                            />
                        </label>
                    </div>
                    <div className="submit-row">
                        <button className="primary-button" type="submit">
                            {mode === 'signup' ? 'Create account' : 'Log in'}
                        </button>
                        <button
                            className="secondary-button"
                            type="button"
                            onClick={() => {
                                setStatus('')
                                setMode((old) => old === 'signup' ? 'login' : 'signup')
                            }}
                        >
                            {mode === 'signup' ? 'Already have an account? Log in' : 'Register'}
                        </button>
                        <span className="status-text">{status}</span>
                    </div>
                </form>
            </section>

        </div>
    )
}
