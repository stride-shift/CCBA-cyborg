import Papa from 'papaparse'

/**
 * Parse CSV file and validate data for bulk challenge upload
 * @param {File} file - CSV file to parse
 * @param {Array} existingCohorts - Array of existing cohort objects from database
 * @returns {Promise<{data: Array, errors: Array, warnings: Array}>}
 */
export const parseCSV = async (file, existingCohorts = []) => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      complete: (results) => {
        const { data, errors: parseErrors } = results
        const validatedData = []
        const errors = [...parseErrors]
        const warnings = []

        console.log('📊 CSV Parse Results:', { 
          totalRows: data.length, 
          parseErrors: parseErrors.length,
          headers: results.meta.fields 
        })

        // Validate required columns
        const requiredColumns = ['cohort_name', 'day_number', 'challenge_title', 'challenge_description', 'image_file_name']
        const headers = results.meta.fields || []
        const missingColumns = requiredColumns.filter(col => !headers.includes(col))
        
        if (missingColumns.length > 0) {
          errors.push({
            type: 'MissingColumns',
            message: `Missing required columns: ${missingColumns.join(', ')}`
          })
          resolve({ data: [], errors, warnings })
          return
        }

        // Validate each row
        data.forEach((row, index) => {
          const rowNumber = index + 2 // +2 because header is row 1, and index starts at 0
          const validationResult = validateRow(row, rowNumber, existingCohorts)
          
          if (validationResult.errors.length > 0) {
            errors.push(...validationResult.errors)
          }
          
          if (validationResult.warnings.length > 0) {
            warnings.push(...validationResult.warnings)
          }
          
          if (validationResult.isValid) {
            validatedData.push(validationResult.cleanedRow)
          }
        })

        // Check for duplicate day numbers within same cohort
        const cohortDayMap = new Map()
        validatedData.forEach((row, index) => {
          const key = `${row.cohort_name}-${row.day_number}`
          if (cohortDayMap.has(key)) {
            errors.push({
              type: 'DuplicateDay',
              message: `Duplicate day ${row.day_number} for cohort "${row.cohort_name}" found in rows ${cohortDayMap.get(key)} and ${index + 2}`
            })
          } else {
            cohortDayMap.set(key, index + 2)
          }
        })

        console.log('✅ CSV Validation Complete:', { 
          validRows: validatedData.length, 
          errors: errors.length, 
          warnings: warnings.length 
        })

        resolve({ data: validatedData, errors, warnings })
      },
      error: (error) => {
        console.error('❌ CSV Parse Error:', error)
        resolve({ 
          data: [], 
          errors: [{ type: 'ParseError', message: `Failed to parse CSV: ${error.message}` }], 
          warnings: [] 
        })
      }
    })
  })
}

/**
 * Validate individual CSV row
 * @param {Object} row - CSV row data
 * @param {number} rowNumber - Row number for error reporting
 * @param {Array} existingCohorts - Array of existing cohorts
 * @returns {Object} Validation result with errors, warnings, and cleaned data
 */
const validateRow = (row, rowNumber, existingCohorts) => {
  const errors = []
  const warnings = []
  const cleanedRow = { ...row }

  // Validate cohort_name
  if (!row.cohort_name || row.cohort_name.trim() === '') {
    errors.push({
      type: 'InvalidCohort',
      row: rowNumber,
      message: `Row ${rowNumber}: Cohort name is required`
    })
  } else {
    cleanedRow.cohort_name = row.cohort_name.trim()
    
    // Check if cohort exists (if we have cohort data)
    if (existingCohorts.length > 0) {
      const cohortExists = existingCohorts.some(c => c.name === cleanedRow.cohort_name)
      if (!cohortExists) {
        warnings.push({
          type: 'UnknownCohort',
          row: rowNumber,
          message: `Row ${rowNumber}: Cohort "${cleanedRow.cohort_name}" not found in database`
        })
      }
    }
    
    // Validate cohort name format
    if (!/^[a-zA-Z0-9_-]+$/.test(cleanedRow.cohort_name)) {
      errors.push({
        type: 'InvalidCohortFormat',
        row: rowNumber,
        message: `Row ${rowNumber}: Cohort name can only contain letters, numbers, hyphens, and underscores`
      })
    }
    
    if (cleanedRow.cohort_name.length > 50) {
      errors.push({
        type: 'CohortNameTooLong',
        row: rowNumber,
        message: `Row ${rowNumber}: Cohort name cannot exceed 50 characters`
      })
    }
  }

  // Validate day_number
  if (!row.day_number) {
    errors.push({
      type: 'InvalidDay',
      row: rowNumber,
      message: `Row ${rowNumber}: Day number is required`
    })
  } else {
    const dayNum = parseInt(row.day_number)
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 15) {
      errors.push({
        type: 'InvalidDayRange',
        row: rowNumber,
        message: `Row ${rowNumber}: Day number must be between 1 and 15`
      })
    } else {
      cleanedRow.day_number = dayNum
    }
  }

  // Validate challenge_title
  if (!row.challenge_title || row.challenge_title.trim() === '') {
    errors.push({
      type: 'InvalidTitle',
      row: rowNumber,
      message: `Row ${rowNumber}: Challenge title is required`
    })
  } else {
    cleanedRow.challenge_title = row.challenge_title.trim()
    if (cleanedRow.challenge_title.length < 5 || cleanedRow.challenge_title.length > 100) {
      errors.push({
        type: 'InvalidTitleLength',
        row: rowNumber,
        message: `Row ${rowNumber}: Challenge title must be between 5 and 100 characters`
      })
    }
  }

  // Validate challenge_description
  if (!row.challenge_description || row.challenge_description.trim() === '') {
    errors.push({
      type: 'InvalidDescription',
      row: rowNumber,
      message: `Row ${rowNumber}: Challenge description is required`
    })
  } else {
    cleanedRow.challenge_description = row.challenge_description.trim()
    if (cleanedRow.challenge_description.length < 10 || cleanedRow.challenge_description.length > 500) {
      errors.push({
        type: 'InvalidDescriptionLength',
        row: rowNumber,
        message: `Row ${rowNumber}: Challenge description must be between 10 and 500 characters`
      })
    }
  }

  // Validate video_url (optional)
  if (row.video_url && row.video_url.trim() !== '') {
    cleanedRow.video_url = row.video_url.trim()
    try {
      new URL(cleanedRow.video_url)
      // Additional check for common video platforms
      if (!/(youtube\.com|youtu\.be|vimeo\.com|wistia\.com)/i.test(cleanedRow.video_url)) {
        warnings.push({
          type: 'UnknownVideoProvider',
          row: rowNumber,
          message: `Row ${rowNumber}: Video URL is not from a recognized provider (YouTube, Vimeo, Wistia)`
        })
      }
    } catch (e) {
      errors.push({
        type: 'InvalidVideoURL',
        row: rowNumber,
        message: `Row ${rowNumber}: Invalid video URL format`
      })
    }
  } else {
    cleanedRow.video_url = null
  }

  // Validate image_file_name
  if (!row.image_file_name || row.image_file_name.trim() === '') {
    errors.push({
      type: 'InvalidImageName',
      row: rowNumber,
      message: `Row ${rowNumber}: Image file name is required`
    })
  } else {
    cleanedRow.image_file_name = row.image_file_name.trim()
    
    // Validate file extension
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp']
    const hasValidExtension = validExtensions.some(ext => 
      cleanedRow.image_file_name.toLowerCase().endsWith(ext)
    )
    
    if (!hasValidExtension) {
      errors.push({
        type: 'InvalidImageExtension',
        row: rowNumber,
        message: `Row ${rowNumber}: Image file must be .jpg, .jpeg, .png, or .webp`
      })
    }
    
    // Check for valid filename characters
    if (!/^[a-zA-Z0-9._-]+$/.test(cleanedRow.image_file_name)) {
      errors.push({
        type: 'InvalidImageNameFormat',
        row: rowNumber,
        message: `Row ${rowNumber}: Image filename can only contain letters, numbers, dots, hyphens, and underscores`
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    cleanedRow
  }
}

/**
 * Generate a sample CSV content for download
 * @returns {string} CSV content
 */
export const generateSampleCSV = () => {
  const headers = [
    'cohort_name',
    'day_number', 
    'challenge_title',
    'challenge_description',
    'video_url',
    'image_file_name'
  ]
  
  const sampleData = [
    [
      'test-cohort-2024',
      '1',
      'Morning Focus Challenge',
      'Start your day with a 10-minute mindfulness session to improve focus and clarity throughout the day.',
      'https://www.youtube.com/watch?v=example1',
      'morning-focus-day1.jpg'
    ],
    [
      'test-cohort-2024',
      '2', 
      'Deep Work Session',
      'Practice the Pomodoro technique for 25 minutes of uninterrupted work on your most important task.',
      'https://www.youtube.com/watch?v=example2',
      'deep-work-day2.png'
    ],
    [
      'test-cohort-2024',
      '3',
      'Communication Excellence',
      'Send one thoughtful message to a colleague or friend, focusing on clear and empathetic communication.',
      '',
      'communication-day3.webp'
    ]
  ]
  
  return [headers, ...sampleData]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')
} 