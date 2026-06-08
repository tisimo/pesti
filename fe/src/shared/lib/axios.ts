import axios from "axios"
import { fetchAuthSession } from "aws-amplify/auth"
import { emitApiAccessDenied, getAccessDeniedMessage } from "@/shared/lib/apiErrors"


const API_BASE_URL_SHARED = import.meta.env.VITE_API_URL_SHARED || "http://localhost:4001/api"

export const apiShared = axios.create({
  baseURL: API_BASE_URL_SHARED,
})

function attachAccessDeniedInterceptor(instance: typeof apiShared) {
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 403) {
        const message = getAccessDeniedMessage(error.response.data)
        error.message = message
        error.response.data =
          error.response.data && typeof error.response.data === "object"
            ? {
                ...error.response.data,
                message,
                code: (error.response.data as { code?: string }).code ?? "INSUFFICIENT_PERMISSIONS",
              }
            : { message, code: "INSUFFICIENT_PERMISSIONS" }

        emitApiAccessDenied(message, error.config?.url)
      }

      return Promise.reject(error)
    },
  )
}

apiShared.interceptors.request.use(async (config) => {
  const session = await fetchAuthSession()
  const token = session.tokens?.accessToken?.toString()

  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

attachAccessDeniedInterceptor(apiShared)

const API_BASE_URL_BACKOFFICE = import.meta.env.VITE_API_URL_BACKOFFICE || "http://localhost:4002/api"

export const apiBackoffice = axios.create({
  baseURL: API_BASE_URL_BACKOFFICE,
})

apiBackoffice.interceptors.request.use(async (config) => {
  const session = await fetchAuthSession()
  const token = session.tokens?.accessToken?.toString()

  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`

    // Pass email from ID token so the backend can use it in audit logs
    const idPayload = session.tokens?.idToken?.payload
    const email = idPayload?.email as string | undefined
    if (email) {
      config.headers["x-admin-email"] = email
    }
  }

  return config
})

attachAccessDeniedInterceptor(apiBackoffice)
