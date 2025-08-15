import { supabase } from '../lib/supabase'

/**
 * Upload image to Supabase Storage
 * @param {File} file - The image file to upload
 * @param {string} prefix - Optional prefix for the filename (e.g., 'challenge-1-', 'challenge-2-')
 * @returns {Promise<{url: string, path: string} | {error: string}>}
 */
export const uploadImageToStorage = async (file, prefix = '') => {
  if (!file) {
    return { error: 'No file provided' }
  }

  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { error: 'File must be an image' }
    }

    // Generate unique filename to prevent overwrites
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const fileExt = file.name.split('.').pop()
    const fileName = `${prefix}${timestamp}-${randomId}.${fileExt}`

    console.log('📤 Uploading image to storage:', fileName, 'Size:', file.size, 'bytes')

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('customized-challenge-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false // Don't overwrite existing files
      })

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError)
      return { error: `Upload failed: ${uploadError.message}` }
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('customized-challenge-images')
      .getPublicUrl(fileName)

    const publicUrl = publicUrlData.publicUrl

    console.log('✅ Image uploaded successfully:', publicUrl)

    return {
      url: publicUrl,
      path: fileName,
      size: file.size,
      type: file.type
    }

  } catch (error) {
    console.error('❌ Unexpected upload error:', error)
    return { error: `Unexpected error: ${error.message}` }
  }
}

/**
 * Delete image from Supabase Storage
 * @param {string} filePath - The file path to delete
 * @returns {Promise<{success: boolean} | {error: string}>}
 */
export const deleteImageFromStorage = async (filePath) => {
  if (!filePath) {
    return { error: 'No file path provided' }
  }

  try {
    const { error } = await supabase.storage
      .from('customized-challenge-images')
      .remove([filePath])

    if (error) {
      console.error('❌ Storage delete error:', error)
      return { error: `Delete failed: ${error.message}` }
    }

    console.log('🗑️ Image deleted successfully:', filePath)
    return { success: true }

  } catch (error) {
    console.error('❌ Unexpected delete error:', error)
    return { error: `Unexpected error: ${error.message}` }
  }
}

/**
 * Convert image file to base64 data URL (fallback method)
 * @param {File} file - The image file to convert
 * @returns {Promise<string | null>}
 */
export const convertImageToDataUrl = async (file) => {
  if (!file) return null
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
} 