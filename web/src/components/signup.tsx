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
        <p>About: Running a shop means trusting your neighbors, but keeping track of 'deni' shouldn't be a headache. My app is a digital ledger that sits right in your pocket. You can register your regular customers, record what they take on credit, and see exactly when they pay you back. If you decide to forgive a small debt, the app handles that too. It’s built to make sure you get paid on time and your records are always organized</p>
        
        <div>
            <h3>You will be guided through the following steps</h3>
            <ul style={{alignContent: 'flex-start'}}>
                <li>Sign Up</li>
                <li>Make a Dummy Shop that is linked to your account (you are now deemed a shop owner)</li>
                <li>Add items to your catalog (i.e., items you want to give on credit) - choose from products provided by the system</li>
                <li>Lend Items to your customers. The system has a set of predefined ones - additional users can be created using postman/curl requests. Please ake sure you add several items to the catalog before attempting to give items on credid. This is because you can only lend whay you have in stock!</li>
            </ul>
        </div>
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