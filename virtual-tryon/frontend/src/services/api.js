import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error('[API] Request error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`[API] Response ${response.status}:`, response.data)
    return response
  },
  (error) => {
    console.error('[API] Response error:', error.response?.data || error.message)
    
    if (error.response?.status === 400) {
      toast.error(error.response.data?.detail || 'Invalid request')
    } else if (error.response?.status === 500) {
      toast.error('Server error. Please try again.')
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout. Please try again.')
    }
    
    return Promise.reject(error)
  }
)

// Health check
export const checkHealth = async () => {
  try {
    const res = await api.get('/health')
    return res.data
  } catch (error) {
    console.error('Health check failed:', error)
    throw error
  }
}

// Crop image and detect faces
export const cropImage = async (imageFile) => {
  try {
    const formData = new FormData()
    formData.append('image', imageFile)
    
    const res = await api.post('/api/images/crop', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    
    if (!res.data.cropped_image) {
      throw new Error('No cropped image in response')
    }
    
    return {
      base64Image: res.data.cropped_image,
      faceDetected: res.data.face_detected,
      faceCount: res.data.face_count
    }
  } catch (error) {
    console.error('Image crop failed:', error)
    
    // Handle specific error messages from backend
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail)
    }
    
    throw error
  }
}

// Analyze skin tone
export const analyzeImage = async (base64Image) => {
  try {
    const res = await api.post('/api/images/analyze', { 
      base64Image 
    })
    
    return {
      season: res.data.season,
      undertone: res.data.undertone,
      lightness: res.data.lightness,
      characteristics: res.data.characteristics,
      colorsToSuggest: res.data.colorsToSuggest || [],
      reasonToSuggest: res.data.reasonToSuggest,
      colorsToAvoid: res.data.colorsToAvoid || [],
      reasonToAvoid: res.data.reasonToAvoid,
      content: res.data.content,
      saturationLevel: res.data.saturation_level,
      lightnessPercentage: res.data.lightness_percentage
    }
  } catch (error) {
    console.error('Image analysis failed:', error)
    
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail)
    }
    
    throw error
  }
}

export default api
