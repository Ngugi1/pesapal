const browserBasePath = (import.meta.env.VITE_APP_BASE_PATH || '/').replace(/\/$/, '')
const defaultApiBase =
    typeof window === 'undefined'
        ? 'http://127.0.0.1:3003'
        : `${browserBasePath === '' ? '' : browserBasePath}/api`

type StatusSetter = (message: string) => void

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || defaultApiBase).replace(/\/$/, '')

export function apiUrl(path: string) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    return `${API_BASE_URL}${normalizedPath}`
}

export async function post<TBody>(url: string, body: TBody) {
    return sendJson('POST', url, body)
}

export async function put<TBody>(url: string, body: TBody) {
    return sendJson('PUT', url, body)
}

async function sendJson<TBody>(method: 'POST' | 'PUT', url: string, body: TBody) {
    const res = await fetch(url, {
        method,
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
