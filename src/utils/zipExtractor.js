import JSZip from 'jszip'

/**
 * Extract images from ZIP file and validate them
 * @param {File} zipFile - ZIP file containing images
 * @param {Array} requiredImages - Array of image filenames from CSV
 * @returns {Promise<{images: Map, errors: Array, warnings: Array}>}
 */
export const extractZip = async (zipFile, requiredImages = []) => {
  try {
    console.log('📦 Extracting ZIP file:', zipFile.name, 'Size:', zipFile.size, 'bytes')
    
    const zip = new JSZip()
    const zipContent = await zip.loadAsync(zipFile)
    
    const images = new Map() // filename -> { file: File, data: ArrayBuffer }
    const errors = []
    const warnings = []
    
    // Get all files from ZIP
    const zipFiles = Object.keys(zipContent.files).filter(filename => {
      const file = zipContent.files[filename]
      return !file.dir && isImageFile(filename)
    })
    
    console.log('🖼️ Found image files in ZIP:', zipFiles.length)
    
    // Process each image file
    for (const filename of zipFiles) {
      try {
        const zipEntry = zipContent.files[filename]
        const arrayBuffer = await zipEntry.async('arraybuffer')
        
        // Validate file size (max 5MB)
        if (arrayBuffer.byteLength > 5 * 1024 * 1024) {
          errors.push({
            type: 'FileTooLarge',
            filename,
            message: `Image "${filename}" exceeds 5MB limit (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)}MB)`
          })
          continue
        }
        
        // Validate file type by checking file signature
        const validationResult = await validateImageBuffer(arrayBuffer, filename)
        if (!validationResult.isValid) {
          errors.push({
            type: 'InvalidImageFile',
            filename,
            message: `Image "${filename}" is not a valid image file: ${validationResult.error}`
          })
          continue
        }
        
        // Create File object from buffer
        const mimeType = getMimeType(filename)
        const file = new File([arrayBuffer], filename, { type: mimeType })
        
        // Store clean filename (remove directory paths)
        const cleanFilename = filename.split('/').pop().split('\\').pop()
        
        images.set(cleanFilename, {
          file,
          data: arrayBuffer,
          originalPath: filename,
          size: arrayBuffer.byteLength,
          mimeType
        })
        
        console.log('✅ Extracted image:', cleanFilename, 'Size:', (arrayBuffer.byteLength / 1024).toFixed(1), 'KB')
        
      } catch (error) {
        errors.push({
          type: 'ExtractionError',
          filename,
          message: `Failed to extract "${filename}": ${error.message}`
        })
      }
    }
    
    // Check for required images from CSV
    const extractedFilenames = Array.from(images.keys())
    const missingImages = requiredImages.filter(required => 
      !extractedFilenames.some(extracted => 
        extracted.toLowerCase() === required.toLowerCase()
      )
    )
    
    if (missingImages.length > 0) {
      errors.push(...missingImages.map(filename => ({
        type: 'MissingImage',
        filename,
        message: `Required image "${filename}" not found in ZIP file`
      })))
    }
    
    // Check for extra images not in CSV
    const extraImages = extractedFilenames.filter(extracted => 
      !requiredImages.some(required => 
        required.toLowerCase() === extracted.toLowerCase()
      )
    )
    
    if (extraImages.length > 0) {
      warnings.push(...extraImages.map(filename => ({
        type: 'ExtraImage',
        filename,
        message: `Image "${filename}" found in ZIP but not referenced in CSV`
      })))
    }
    
    console.log('📊 ZIP extraction complete:', {
      totalImages: images.size,
      errors: errors.length,
      warnings: warnings.length,
      missingImages: missingImages.length,
      extraImages: extraImages.length
    })
    
    return { images, errors, warnings }
    
  } catch (error) {
    console.error('❌ ZIP extraction failed:', error)
    return {
      images: new Map(),
      errors: [{
        type: 'ZipError',
        message: `Failed to extract ZIP file: ${error.message}`
      }],
      warnings: []
    }
  }
}

/**
 * Check if filename is an image file based on extension
 * @param {string} filename - Filename to check
 * @returns {boolean} True if filename has image extension
 */
const isImageFile = (filename) => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp']
  const ext = filename.toLowerCase().split('.').pop()
  return imageExtensions.includes(`.${ext}`)
}

/**
 * Get MIME type based on file extension
 * @param {string} filename - Filename
 * @returns {string} MIME type
 */
const getMimeType = (filename) => {
  const ext = filename.toLowerCase().split('.').pop()
  const mimeMap = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'bmp': 'image/bmp'
  }
  return mimeMap[ext] || 'application/octet-stream'
}

/**
 * Validate image file by checking file signature
 * @param {ArrayBuffer} buffer - File buffer
 * @param {string} filename - Filename for error reporting
 * @returns {Promise<{isValid: boolean, error?: string}>}
 */
const validateImageBuffer = async (buffer, filename) => {
  try {
    // Check file signature (magic numbers)
    const uint8Array = new Uint8Array(buffer)
    
    // JPEG: FF D8 FF
    if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8 && uint8Array[2] === 0xFF) {
      return { isValid: true }
    }
    
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
      return { isValid: true }
    }
    
    // WEBP: RIFF ... WEBP
    if (uint8Array[0] === 0x52 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46 && uint8Array[3] === 0x46) {
      // Check for WEBP signature at offset 8
      if (uint8Array[8] === 0x57 && uint8Array[9] === 0x45 && uint8Array[10] === 0x42 && uint8Array[11] === 0x50) {
        return { isValid: true }
      }
    }
    
    // GIF: GIF87a or GIF89a
    if (uint8Array[0] === 0x47 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46) {
      return { isValid: true }
    }
    
    // BMP: BM
    if (uint8Array[0] === 0x42 && uint8Array[1] === 0x4D) {
      return { isValid: true }
    }
    
    return { 
      isValid: false, 
      error: 'File signature does not match any supported image format' 
    }
    
  } catch (error) {
    return { 
      isValid: false, 
      error: `Failed to validate image: ${error.message}` 
    }
  }
}

/**
 * Create a sample folder structure description
 * @returns {string} Folder structure example
 */
export const getSampleFolderStructure = () => {
  return `
Sample ZIP structure:
my-images.zip
├── morning-focus-day1.jpg
├── deep-work-day2.png
├── communication-day3.webp
└── subfolder/
    └── another-image.jpg

Note: 
- Images can be in root or subfolders
- Filenames must match exactly with CSV
- Supported formats: JPG, PNG, WEBP, GIF, BMP
- Max size per image: 5MB
`
}

/**
 * Validate image dimensions (optional feature)
 * @param {File} imageFile - Image file to check
 * @returns {Promise<{width: number, height: number}>}
 */
export const getImageDimensions = (imageFile) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(imageFile)
    
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.width, height: img.height })
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    
    img.src = url
  })
} 