import { useLocation } from 'react-router-dom';
import { useState } from "react"
import {useNavigate} from 'react-router-dom'
import {post, processResponse} from './util'
export function MakeShop() {
    const navigate = useNavigate()
    const {state} = useLocation()
    console
    const [user, _] = useState(state)
    const [shop, setShop] = useState('')
    const [status, setStatus] = useState('')
    async function makeShop(e) {
        setStatus('')
        e.preventDefault();
        const result = await post('http://localhost:3003/shop/create', 
            {owner_id: user.id, name: shop})
        const jsonData = await processResponse(result, 'Make Shop Failed', setStatus)
        if(jsonData) {
            navigate('/shopdisplay', {state: {shop_id: jsonData.id, ...user, sname: shop}})
        }
    }
    return <div>
        <h1>Welcome</h1>
        <div>{user.fname} {user.phone} </div>
        <h2>Make A Shop</h2>
        <div>Shop Name</div>
        <div><input type="text" placeholder="Makini Shop" onChange={(e) => setShop(e.target.value)} value={shop}/></div>
        <div><button onClick={makeShop}>Done</button></div>
        <div>{status}</div>
    </div>
}