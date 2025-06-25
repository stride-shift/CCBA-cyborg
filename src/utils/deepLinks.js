// Deep link utilities for email campaigns and sharing

const BASE_URL = import.meta.env.PROD ? 'https://cyborghabits.strideshift.ai' : window.location.origin

/**
 * Generate a deep link to a specific day's challenge
 * @param {number} dayNumber - The day number (1-15)
 * @param {object} options - Additional options
 * @returns {string} Complete URL with protocol
 */
export function generateDayLink(dayNumber, options = {}) {
  const { utm_source, utm_medium, utm_campaign } = options
  
  let url = `${BASE_URL}/day/${dayNumber}`
  
  // Add UTM parameters for tracking
  const params = new URLSearchParams()
  if (utm_source) params.append('utm_source', utm_source)
  if (utm_medium) params.append('utm_medium', utm_medium)  
  if (utm_campaign) params.append('utm_campaign', utm_campaign)
  
  if (params.toString()) {
    url += `?${params.toString()}`
  }
  
  return url
}

/**
 * Generate a deep link to the challenges overview
 * @param {object} options - Additional options
 * @returns {string} Complete URL with protocol
 */
export function generateChallengesLink(options = {}) {
  const { utm_source, utm_medium, utm_campaign } = options
  
  let url = `${BASE_URL}/challenges`
  
  const params = new URLSearchParams()
  if (utm_source) params.append('utm_source', utm_source)
  if (utm_medium) params.append('utm_medium', utm_medium)
  if (utm_campaign) params.append('utm_campaign', utm_campaign)
  
  if (params.toString()) {
    url += `?${params.toString()}`
  }
  
  return url
}

/**
 * Generate a deep link to a survey day
 * @param {number} dayNumber - Survey day (0 for pre-survey, 16 for post-survey)
 * @param {object} options - Additional options
 * @returns {string} Complete URL with protocol
 */
export function generateSurveyLink(dayNumber, options = {}) {
  const { utm_source, utm_medium, utm_campaign } = options
  
  let url = `${BASE_URL}/survey/${dayNumber}`
  
  const params = new URLSearchParams()
  if (utm_source) params.append('utm_source', utm_source)
  if (utm_medium) params.append('utm_medium', utm_medium)
  if (utm_campaign) params.append('utm_campaign', utm_campaign)
  
  if (params.toString()) {
    url += `?${params.toString()}`
  }
  
  return url
}

/**
 * Generate email-friendly links with common UTM parameters
 * @param {number} dayNumber - The day number
 * @param {string} emailCampaign - Campaign identifier
 * @returns {string} Complete URL for email
 */
export function generateEmailDayLink(dayNumber, emailCampaign = 'daily_reminder') {
  return generateDayLink(dayNumber, {
    utm_source: 'email',
    utm_medium: 'email_campaign',
    utm_campaign: emailCampaign
  })
}

/**
 * Copy a day link to clipboard for easy sharing
 * @param {number} dayNumber - The day number
 * @param {object} options - Additional options
 * @returns {Promise<boolean>} Success status
 */
export async function copyDayLinkToClipboard(dayNumber, options = {}) {
  try {
    const link = generateDayLink(dayNumber, options)
    await navigator.clipboard.writeText(link)
    return true
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
    return false
  }
}

/**
 * Get day name for email subject lines
 * @param {number} dayNumber - The day number
 * @returns {string} Human-readable day description
 */
export function getDayDisplayName(dayNumber) {
  if (dayNumber === 0) return 'Pre-Program Survey'
  if (dayNumber === 16) return 'Post-Program Survey'
  return `Day ${dayNumber} Challenge`
}

// Example usage for email templates:
// generateEmailDayLink(1, 'week_1_reminder') 
// -> "https://cyborghabits.strideshift.ai/day/1?utm_source=email&utm_medium=email_campaign&utm_campaign=week_1_reminder" 