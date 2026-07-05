import axios from 'axios'

const CLIENT_ID_KEY = 'datamorph_client_id'

function getClientId() {
  let id = sessionStorage.getItem(CLIENT_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(CLIENT_ID_KEY, id)
  }
  return id
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

// Attach the client id to every outgoing request
api.interceptors.request.use((config) => {
  config.headers['X-Client-Id'] = getClientId()
  return config
})

// Uploads
export const uploadFile = (file, onProgress) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/api/uploads/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    },
  })
}
export const getUpload = (uploadId) => api.get(`/api/uploads/${uploadId}/`)
export const listUploads = () => api.get('/api/uploads/')
export const deleteUpload = (uploadId) => api.delete(`/api/uploads/${uploadId}/`)

// Jobs
export const createJob = (payload) => api.post('/api/jobs/', payload)
export const getJob = (jobId) => api.get(`/api/jobs/${jobId}/`)
export const cancelJob = (jobId) => api.delete(`/api/jobs/${jobId}/`)
export const getJobResult = (jobId, page = 1, pageSize = 50) =>
  api.get(`/api/jobs/${jobId}/result/`, {
    params: { page, page_size: pageSize },
  })
export const listJobs = () => api.get('/api/jobs/')
export const deleteAllJobs = () => api.delete('/api/jobs/')

export default api