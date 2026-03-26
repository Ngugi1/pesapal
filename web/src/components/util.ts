const defaultApiBase =
    typeof window === 'undefined'
        ? 'http://http://158.220.86.151:5173'
        : `${window.location.protocol}//${window.location.hostname}:3003`

type StatusSetter = (message: string) => void

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || defaultApiBase).replace(/\/$/, '')

export function apiUrl(path: string) {
    return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export async function post<TBody>(url: string, body: TBody) {
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    })
    return res
}


export async function processResponse<TResponse extends { error?: string }>(
    res: Response,
    failMessage: string,
    setStatus: StatusSetter
) {
    let jsonData: TResponse | undefined
    if (res.status === 200) {
        jsonData = await res.json()
        if (jsonData?.error) {
            setStatus(jsonData.error)
        }
    } else {
        setStatus(failMessage)
    }
    return jsonData
}
