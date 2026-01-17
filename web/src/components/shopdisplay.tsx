import { useEffect, useState } from 'react'
import {useLocation} from 'react-router-dom'
import { post, processResponse } from './util'
export function ShopDisplay() {
    const {state} = useLocation()
    console.log(state)
    const [shop, _] = useState(state)
    const [debts, setDebts] = useState([])
    const [catalog, setCatalog] = useState([])
    const [products, setProducts] = useState([])
    const [users, setUsers] = useState([])
    const [debt, setDebt] = useState({
        creditor_shop_id: shop.shop_id, 
        debtor_user_id: -1,
        product_id: -1,
        quantity: -1, 
        unit_price: -1
    })
    const [selectedProduct, setSelectedProduct] = useState(-1)
    const [selected, setSelected] = useState(-1) // default fetch debts
    console.log(state)
    useEffect(() => {
        if(selected === 0) {
            fetch('http://localhost:3003/debt/getall/'+shop.shop_id).then((value) => {
                if(value.status === 200) {
                    value.json().then((data) => {
                       setDebts(data)
                    })
                }
            })
             fetch('http://localhost:3003/users/all').then((value) => {
                if(value.status === 200) {
                    value.json().then((data) => {
                       setUsers(data)
                    })
                }
            })
        }else if (selected === 1) {
            fetch('http://localhost:3003/product/all').then((res) => {
                res.json().then((v) => {
                    setProducts(v)
                })
            })
            fetch('http://localhost:3003/catalog/shop/'+shop.shop_id).then((res) => {
                if(res.status === 200) {
                    res.json().then((value) => {
                        console.log("----------- Catalog:::::::", value)
                        setCatalog(value)
                    })
                }
            })
            
        }
    }, [selected])

    function forgiveDebt(debt) {
        post('http://localhost:3003/debt/forgive/'+ debt.id, {})
        .then((res) => {
            if(res.status == 200) {
                setDebts((d) => {
                    return d.filter(d.id != debt.id)
                })
            }else{
                alert("Something went wrong")
            }
        })
    }
    function settleDebt(debt) {
        fetch('http://localhost:3003/debt/settle', {
            method: 'PUT',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({debt_id: debt.id, amount: debt.total_price, is_full_settlement: true, comments: "Paid in full"})
        }).then((res) => {
            if(res.status === 200) {
                setDebts((old) => 
                {
                    return old.filter(d => d.id != debt.id)
                })
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
        if(selectedProduct === -1) alert('no selected product')
        const product = products.filter(p => p.id = selectedProduct).pop()
        post('http://localhost:3003/catalog/create', {shop_id: shop.shop_id, product_id: product.id}).then((res) => {
            if(res.status === 200) {
                res.json().then((value) => {
                    // setSelected(-1)
                })
            }
        })
    }

    const topBar =  <div>
            <h1>{shop.sname}</h1>
            <div>Owner: {shop.fname} {shop.lname}</div>
            <div>Contact: {shop.phone}</div>
              <div>
            <button onClick={(e) => setSelected(1)}>Catalog</button>
            <button onClick={(e) => setSelected(0)}>Debts</button>

        </div>
        </div>

    async function giveDebt(e) {
        e.preventDefault()
        if(Object.values(debt).filter(e => e === -1).length > 0) {
            alert('Fill all fields')
            return
        }
        post('http://localhost:3003/debt/create', debt).then((res) => {
            if(res.status === 200) {
                res.json().then((_) => {
                })
            }
        })
    }
    
    if(selected === 0) {
        return <div>
            {topBar}
            <div>
                Product:
                <select onChange={(e) => {
                      setDebt((old) => {
                        return {
                            ...old,
                            product_id: e.target.value
                        }
                      })
                    }}
                >
                    {
                        catalog.map(c => <option key={c.id} value={c.product_id}>{c.pname}</option>)
                    }
                </select>
                Customer:
                <select onChange={(e) => {
                    setDebt((old) => {
                        return {...old, debtor_user_id: e.target.value}
                    })
                }}>
                    {
                        users.map(u => <option key={u.id} value={u.id}>{u.fname + ' ' + u.lname + '-' + u.phone}</option>)
                    }
                </select>
                Quanity:
                <input type="text" onChange={(e) => {
                    setDebt((old) => {
                        return {...old, quantity: parseInt(e.target.value)}
                    })
                }}/>
                Unit Price:
                <input type="text" onChange={(e) => {
                    setDebt((old) => {
                        return {
                            ...old, 
                            unit_price: parseInt(e.target.value)
                        }
                    })
                }}/>
                <button onClick={(e) => giveDebt(e)}>Give Debt</button>

            </div>
            <div>
                {debts.map(d => <div><button onClick={(e) => forgiveDebt(d)}>forgive</button> {d.debtor} | {d.pname} | {d.quantity} | {d.unit_price} | {d.total_price} <button onClick={(e) => settleDebt(d)}>settle</button><hr/><br/></div>)}
            </div>
           
        </div>
    }
    else if (selected === 1) {
        return <div>
            {topBar}
            <br></br>
            Add Product:
            <select onChange={(e) => setSelectedProduct(e.target.value)}>
                {products.map(p => <option value={p.id}>{p.pname}</option>)}
            </select>
            <button onClick={(e) => addToCatalog()}>Add</button>
            <br></br>
            <div>
                {
                catalog.map(c => <div>
                    {c.pname} | {c.description} <button onClick={(e) => removeCatalogItem(c)}>Remove</button> <hr/><br/>
                    </div>)
                }
            </div>
        </div>
    }else{
        return <div>{topBar}</div>
    }
}