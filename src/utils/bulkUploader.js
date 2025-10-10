import { supabase } from '../lib/supabase'
import { uploadImageToStorage } from './imageUpload'

/**
 * Bulk upload challenges with images to Supabase
 * @param {Array} csvData - Validated CSV data
 * @param {Map} images - Extracted images from ZIP
 * @param {string} challengeSetId - ID of the challenge set to upload to
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<{success: boolean, results: Array, errors: Array}>}
 */
export const bulkUploadChallenges = async (csvData, images, challengeSetId, onProgress = () => {}) => {
  console.log('🚀 Starting bulk upload:', {
    challengeCount: csvData.length,
    imageCount: images.size,
    challengeSetId
  })

  const results = []
  const errors = []
  let completedCount = 0

  try {
    // Validate challenge set ID is provided
    if (!challengeSetId) {
      throw new Error('Challenge set ID is required for bulk upload')
    }

    // Process each challenge
    for (let i = 0; i < csvData.length; i++) {
      const challengeData = csvData[i]
      const progress = {
        index: i,
        total: csvData.length,
        current: challengeData,
        status: 'processing',
        step: 'validating'
      }

      try {
        onProgress(progress)

        progress.step = 'uploading_image'
        onProgress(progress)

        // Step 1: Upload image to storage
        let imageStoragePath = null
        const imageFileName = challengeData.image_file_name

        if (imageFileName && images.has(imageFileName)) {
          const imageData = images.get(imageFileName)

          // Create storage path: challenge-sets/{challenge_set_id}/day-{day_number}/{filename}
          const storagePrefix = `challenge-sets/${challengeSetId}/day-${challengeData.day_number}/`

          console.log(`📤 Uploading image: ${imageFileName}`)
          const uploadResult = await uploadImageToStorage(imageData.file, storagePrefix)

          if (uploadResult.error) {
            throw new Error(`Image upload failed: ${uploadResult.error}`)
          }

          imageStoragePath = uploadResult.url
          console.log(`✅ Image uploaded: ${imageStoragePath}`)
        } else if (imageFileName) {
          throw new Error(`Image file "${imageFileName}" not found in uploaded ZIP`)
        }

        progress.step = 'saving_database'
        onProgress(progress)

        // Step 2: Check for existing challenge
        const existingChallenge = await checkExistingChallenge(challengeSetId, challengeData.day_number)

        // Step 3: Prepare challenge record for challenges table
        const challengeRecord = {
          challenge_set_id: challengeSetId,
          order_index: challengeData.day_number,
          title: challengeData.challenge_title,
          challenge_1: challengeData.challenge_description,
          challenge_1_type: 'Custom', // Default type for bulk uploads
          challenge_2: null, // Bulk upload focuses on single challenge per day
          challenge_2_type: null,
          video_url_1: challengeData.video_url,
          video_url_2: null,
          challenge_1_image_url: imageStoragePath,
          challenge_2_image_url: null,
          reflection_question: `Reflect on today's challenge: ${challengeData.challenge_title}`,
          intended_aha_moments: [`Key insight from ${challengeData.challenge_title}`],
          is_active: true
        }

        // Step 4: Insert or update challenge
        let dbResult
        if (existingChallenge) {
          console.log(`🔄 Updating existing challenge for day ${challengeData.day_number}`)
          dbResult = await supabase
            .from('challenges')
            .update(challengeRecord)
            .eq('challenge_set_id', challengeSetId)
            .eq('order_index', challengeData.day_number)
            .select()
        } else {
          console.log(`➕ Creating new challenge for day ${challengeData.day_number}`)
          dbResult = await supabase
            .from('challenges')
            .insert(challengeRecord)
            .select()
        }

        if (dbResult.error) {
          throw new Error(`Database operation failed: ${dbResult.error.message}`)
        }

        // Success!
        completedCount++
        const result = {
          index: i,
          challengeData,
          success: true,
          action: existingChallenge ? 'updated' : 'created',
          databaseId: dbResult.data[0]?.id,
          imageUploaded: !!imageStoragePath
        }
        results.push(result)

        progress.status = 'completed'
        progress.step = 'done'
        onProgress(progress)

        console.log(`✅ Challenge ${i + 1}/${csvData.length} completed:`, challengeData.challenge_title)

      } catch (error) {
        console.error(`❌ Challenge ${i + 1} failed:`, error)
        
        const errorResult = {
          index: i,
          challengeData,
          success: false,
          error: error.message
        }
        results.push(errorResult)
        errors.push(error.message)

        progress.status = 'error'
        progress.error = error.message
        onProgress(progress)
      }
    }

    const summary = {
      success: errors.length === 0,
      total: csvData.length,
      completed: completedCount,
      failed: csvData.length - completedCount,
      results,
      errors
    }

    console.log('🎯 Bulk upload complete:', summary)
    return summary

  } catch (error) {
    console.error('❌ Bulk upload failed:', error)
    return {
      success: false,
      total: csvData.length,
      completed: completedCount,
      failed: csvData.length - completedCount,
      results,
      errors: [...errors, error.message]
    }
  }
}

/**
 * Check if challenge already exists for challenge set and day
 * @param {string} challengeSetId - Challenge set ID
 * @param {number} dayNumber - Day number
 * @returns {Promise<Object|null>} Existing challenge or null
 */
const checkExistingChallenge = async (challengeSetId, dayNumber) => {
  try {
    const { data, error } = await supabase
      .from('challenges')
      .select('id, title, challenge_1')
      .eq('challenge_set_id', challengeSetId)
      .eq('order_index', dayNumber)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing challenge:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error checking existing challenge:', error)
    return null
  }
}

/**
 * Rollback uploaded challenges (cleanup on failure)
 * @param {Array} successfulResults - Array of successfully uploaded challenge results
 * @returns {Promise<{success: boolean, errors: Array}>}
 */
export const rollbackChallenges = async (successfulResults) => {
  console.log('🔄 Rolling back uploaded challenges:', successfulResults.length)

  const errors = []

  for (const result of successfulResults) {
    try {
      if (result.databaseId) {
        const { error } = await supabase
          .from('challenges')
          .delete()
          .eq('id', result.databaseId)

        if (error) {
          errors.push(`Failed to rollback challenge ${result.databaseId}: ${error.message}`)
        } else {
          console.log(`🗑️ Rolled back challenge:`, result.challengeData.challenge_title)
        }
      }
    } catch (error) {
      errors.push(`Rollback error for challenge ${result.index}: ${error.message}`)
    }
  }

  return {
    success: errors.length === 0,
    errors
  }
}

/**
 * Generate upload summary for display
 * @param {Object} uploadResult - Result from bulkUploadChallenges
 * @returns {Object} Formatted summary
 */
export const generateUploadSummary = (uploadResult) => {
  const summary = {
    total: uploadResult.total,
    successful: uploadResult.completed,
    failed: uploadResult.failed,
    successRate: uploadResult.total > 0 ? Math.round((uploadResult.completed / uploadResult.total) * 100) : 0,
    details: {
      created: uploadResult.results.filter(r => r.success && r.action === 'created').length,
      updated: uploadResult.results.filter(r => r.success && r.action === 'updated').length,
      withImages: uploadResult.results.filter(r => r.success && r.imageUploaded).length,
      withoutImages: uploadResult.results.filter(r => r.success && !r.imageUploaded).length
    },
    errors: uploadResult.errors,
    failedChallenges: uploadResult.results.filter(r => !r.success)
  }
  
  return summary
} 