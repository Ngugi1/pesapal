import { useState } from "react"
import {useNavigate} from 'react-router-dom'
import { processResponse } from './util'
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
   
     
    return <div>
         <h1>Sign Up</h1>
        <div>First Name</div>
        <input name="fname" type="text" placeholder="mike" onChange={handleChange} value={user.fname}/>
        <div>Last Name</div>
        <input name="lname" type="text" placeholder="mill"  onChange={handleChange} value={user.lname}/>
        <div>Phone</div>
        <input name="phone" type="text" placeholder="0712345678" onChange={handleChange} value={user.phone}/>
        <div>
            <button onClick={(e) => signUp(e)}>Signup</button>
        </div>
        <div>{status}</div>
    </div>
}