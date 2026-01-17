export async function post(url: string, body: any) {
    console.log(body)
    const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
    })
    return res
}


export async function processResponse(res: any, failMessage: string, setStatus: any) {
    let jsonData;
    if(res.status == 200) {
            jsonData = await res.json()
            if(jsonData.error) {
                setStatus(jsonData.error)
            }
    }else{
            setStatus(failMessage)
    }
    return jsonData;
}