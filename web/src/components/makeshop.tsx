import { useLocation } from 'react-router-dom';
import { useState } from "react"
import type { FormEvent } from 'react';
import {useNavigate} from 'react-router-dom'
import { apiUrl, post, processResponse } from './util'
import './makeshop.css'
import shopLogo from '../assets/shop-icon.png'
export function MakeShop() {
    const navigate = useNavigate()
    const {state} = useLocation()
    const [user] = useState(state as { id: number; fname: string; lname: string; phone: string })
    const [shop, setShop] = useState('')
    const [status, setStatus] = useState('')
    async function makeShop(e: FormEvent<HTMLFormElement>) {
        setStatus('')
        e.preventDefault();
        const result = await post(apiUrl('/shop/create'), 
            {owner_id: user.id, name: shop})
        const jsonData = await processResponse<ShopResponse>(result, 'Make Shop Failed', setStatus)
        if(jsonData) {
            navigate('/shopdisplay', {state: {shop_id: jsonData.id, ...user, sname: shop}})
        }
    }
    return (
        <div className="makeshop-page">
            <div className="makeshop-header">
                <div className="identity-block with-logo">
                    <div className="shop-visual small-logo">
                        <img src={shopLogo} alt="Shop logo" />
                    </div>
                    <div className="identity-text">
                        <div className="hero-eyebrow">Kitabu · Set up your shop</div>
                        <h1 className="page-title">Create your shop profile</h1>
                        <p className="page-subtitle">
                            Name your shop so customers can recognize it on their statements.
                        </p>
                        <div className="owner-block">
                            <div className="owner-row">
                                <span className="owner-label">Owner</span>
                                <span className="owner-name">{user.fname} {user.lname}</span>
                            </div>
                            <div className="owner-row">
                                <span className="owner-label">Phone</span>
                                <span className="owner-phone">{user.phone}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="makeshop-grid single lifted">
                <form className="makeshop-card" onSubmit={makeShop}>
                    <div>
                        <h2>Create your shop</h2>
                        <p className="page-subtitle">Use the name shown on your storefront.</p>
                    </div>
                    <label className="field-group">
                        <span className="field-label">Shop name</span>
                        <input
                            className="field-input"
                            type="text"
                            placeholder="Makini Shop"
                            onChange={(e) => setShop(e.target.value)}
                            value={shop}
                            required
                        />
                    </label>
                    <div className="submit-row">
                        <button className="primary-button" type="submit">Create shop</button>
                        <span className="status-text">{status}</span>
                    </div>
                </form>
            </div>
        </div>
    )
}
    type ShopResponse = { id: number; error?: string }
