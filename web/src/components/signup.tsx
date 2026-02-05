import { useState } from "react"
import {useNavigate} from 'react-router-dom'
import { processResponse } from './util'
import './signup.css'
import shopHero from '../assets/shop-icon.png'
// Tellesserver to register this user
export function SignUp() {
    const navigate = useNavigate()
    const [user, setUser] = useState({
            fname: '', 
            lname: '',
            phone: ''
        }
    )
    const [status, setStatus] = useState("")
    const handleChange = (e) => {
        // get name and value of html target
        const { name, value } = e.target;
        setUser((prev) => ({
        ...prev,
        [name]: value
        }));
    };
    async function signUp(e){
        e.preventDefault(); 
        setStatus('') // reset status
        const res = await fetch('http://localhost:3003/user/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(user)
        })

        const jsonData = await processResponse(res, 'Sign up Failed', setStatus)
        if(jsonData) {
            // navigate to create shop page with user ID
            console.log({...jsonData})
            navigate('/makeshop',{ state: {...jsonData, ...user}, replace: true })
        }
    }

    function showLogin() {
        setStatus("Login will be available soon. For now, please sign up to continue.")
    }
   
     
    return (
        <div className="signup-page">
            <section className="signup-grid">
                <div className="signup-hero">
                <div>
                    <div className="hero-eyebrow brand-line">
                        <img className="brand-icon" src={shopHero} alt="Shop icon" />
                        <span className="brand-name">Kitabu</span>
                    </div>
                    <h1 className="hero-title">Kitabu cha deni.</h1>
                    <p className="hero-copy">
                        Deni ni kawaida. Kitabu keeps it clean — note every regular, record each item taken on
                        credit, and see who has paid, all without the paper mess.
                    </p>
                    <div className="hero-metrics">
                        <div className="metric">
                            <span className="metric-value">3 minutes</span>
                            <span className="metric-label">to set up</span>
                        </div>
                        <div className="metric">
                            <span className="metric-value">1 view</span>
                            <span className="metric-label">all balances</span>
                        </div>
                        <div className="metric">
                            <span className="metric-value">100%</span>
                            <span className="metric-label">transparent</span>
                        </div>
                    </div>
                </div>
                <div className="steps-card">
                    <h3>What happens next</h3>
                    <ul className="steps-list">
                        <li className="steps-item">
                            <span className="step-badge">1</span>
                            <span className="step-text">Sign up with your basic details.</span>
                        </li>
                        <li className="steps-item">
                            <span className="step-badge">2</span>
                            <span className="step-text">Create your shop so we can attach customers and items.</span>
                        </li>
                        <li className="steps-item">
                            <span className="step-badge">3</span>
                            <span className="step-text">Add catalog items before lending on credit.</span>
                        </li>
                    </ul>
                </div>
                </div>
                <form className="signup-card" onSubmit={signUp}>
                    <div>
                        <h2>Sign up</h2>
                        <p className="page-subtitle">Let’s get your ledger ready for daily use.</p>
                    </div>
                    <div className="form-grid">
                        <label className="field-group">
                            <span className="field-label">First name</span>
                            <input
                                className="field-input"
                                name="fname"
                                type="text"
                                placeholder="Mike"
                                onChange={handleChange}
                                value={user.fname}
                                required
                            />
                        </label>
                        <label className="field-group">
                            <span className="field-label">Last name</span>
                            <input
                                className="field-input"
                                name="lname"
                                type="text"
                                placeholder="Mills"
                                onChange={handleChange}
                                value={user.lname}
                                required
                            />
                        </label>
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
                    <button className="primary-button" type="submit">Create account</button>
                    <button className="secondary-button" type="button" onClick={showLogin}>Log in</button>
                    <span className="status-text">{status}</span>
                </div>
            </form>
            </section>

        </div>
    )
}
