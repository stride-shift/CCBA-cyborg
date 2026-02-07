import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'

function BulkUserUpload({ cohorts, onComplete, onClose }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [progress, setProgress] = useState({ processed: 0, total: 0, errors: [], successes: [], skipped: [] })
  const [dragActive, setDragActive] = useState(false)
  const [skipExisting, setSkipExisting] = useState(true) // Default to skip existing users
  const fileInputRef = useRef(null)
  const uploadInProgressRef = useRef(false)

  // Session storage keys for persistence
  const STORAGE_KEYS = {
    uploadState: 'bulkUpload_state',
    progress: 'bulkUpload_progress',
    fileInfo: 'bulkUpload_fileInfo',
    parsedUsers: 'bulkUpload_parsedUsers'
  }

  // Load persisted state on component mount
  useEffect(() => {
    try {
      const savedState = sessionStorage.getItem(STORAGE_KEYS.uploadState)
      const savedProgress = sessionStorage.getItem(STORAGE_KEYS.progress)
      const savedFileInfo = sessionStorage.getItem(STORAGE_KEYS.fileInfo)
      const savedUsers = sessionStorage.getItem(STORAGE_KEYS.parsedUsers)
      
      if (savedState) {
        const state = JSON.parse(savedState)
        setUploading(state.uploading)
        setParsing(state.parsing)
        setParseError(state.parseError || '')
        setSkipExisting(state.skipExisting !== undefined ? state.skipExisting : true)
        uploadInProgressRef.current = state.uploading
        
        if (state.uploading) {
          console.log('📋 Restored active upload session')
        }
      }
      
      if (savedProgress) {
        const progressData = JSON.parse(savedProgress)
        setProgress(progressData)
      }
      
      if (savedFileInfo && savedUsers) {
        const fileInfo = JSON.parse(savedFileInfo)
        const usersData = JSON.parse(savedUsers)
        
        // Create a mock File object for display purposes
        if (fileInfo.name && usersData.length > 0) {
          console.log(`📋 Restored upload session for file: ${fileInfo.name} (${usersData.length} users)`)
          
          // Create a synthetic file object for UI purposes
          const mockFile = new File([''], fileInfo.name, { type: fileInfo.type })
          setFile(mockFile)
          
          // Restore progress with user count
          setProgress(prev => ({ ...prev, total: usersData.length }))
        }
      }
    } catch (error) {
      console.log('No previous upload state to restore')
      clearPersistedState() // Clear corrupted state
    }
  }, [])

  // Persist state changes to sessionStorage
  useEffect(() => {
    const state = {
      uploading,
      parsing,
      parseError,
      skipExisting
    }
    sessionStorage.setItem(STORAGE_KEYS.uploadState, JSON.stringify(state))
    uploadInProgressRef.current = uploading
  }, [uploading, parsing, parseError, skipExisting])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(progress))
  }, [progress])

  useEffect(() => {
    if (file) {
      const fileInfo = {
        name: file.name,
        size: file.size,
        type: file.type
      }
      sessionStorage.setItem(STORAGE_KEYS.fileInfo, JSON.stringify(fileInfo))
    }
  }, [file])

  // Handle window/tab visibility changes to prevent upload interruption
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (uploadInProgressRef.current) {
        if (document.visibilityState === 'visible') {
          console.log('📱 Tab became visible - upload still in progress')
        } else {
          console.log('📱 Tab hidden - upload continues in background')
        }
      }
    }

    const handleBeforeUnload = (e) => {
      if (uploadInProgressRef.current) {
        e.preventDefault()
        e.returnValue = 'Upload in progress. Are you sure you want to leave?'
        return e.returnValue
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  // Clear persisted state when upload completes or component unmounts
  const clearPersistedState = () => {
    sessionStorage.removeItem(STORAGE_KEYS.uploadState)
    sessionStorage.removeItem(STORAGE_KEYS.progress)
    sessionStorage.removeItem(STORAGE_KEYS.fileInfo)
    sessionStorage.removeItem(STORAGE_KEYS.parsedUsers)
  }

  // Clean up on unmount if upload is not in progress
  useEffect(() => {
    return () => {
      if (!uploadInProgressRef.current) {
        clearPersistedState()
      }
    }
  }, [])

  // Generate template files
  const downloadTemplate = (format = 'csv') => {
    const headers = ['email', 'first_name', 'last_name', 'organization_name', 'department', 'role', 'cohort_name', 'password']
    const sampleData = [
      ['john.doe@company.com', 'John', 'Doe', 'Acme Corporation', 'Engineering', 'user', 'Spring 2024 Cohort', ''],
      ['jane.admin@company.com', 'Jane', 'Smith', 'Acme Corporation', 'Management', 'admin', '', 'custom123'],
      ['super.admin@company.com', 'Super', 'User', 'Cyborg Habit Co', 'IT', 'super_admin', '', ''],
      ['participant@company.com', 'Active', 'Participant', 'Test Org', 'Marketing', 'user', 'Test Cohort 1', 'mypassword']
    ]

    if (format === 'xlsx') {
      // Create XLSX template
      const wb = XLSX.utils.book_new()
      
      // Main data sheet
      const wsData = [headers, ...sampleData]
      const ws = XLSX.utils.aoa_to_sheet(wsData)
      
      // Set column widths
      ws['!cols'] = [
        { width: 25 }, // email
        { width: 15 }, // first_name
        { width: 15 }, // last_name
        { width: 20 }, // organization_name
        { width: 15 }, // department
        { width: 12 }, // role
        { width: 25 }, // cohort_name
        { width: 12 }  // password
      ]
      
      XLSX.utils.book_append_sheet(wb, ws, 'Users')
      
      // Instructions sheet
      const instructions = [
        ['Bulk User Upload Instructions'],
        [''],
        ['❗ IMPORTANT - Required Columns:'],
        ['email - Must be unique and valid email format'],
        ['first_name - User\'s first name'],
        ['last_name - User\'s last name'],
        ['role - Must be EXACTLY: user, admin, or super_admin (lowercase)'],
        [''],
        ['⚠️  ROLE FIELD REQUIREMENTS:'],
        ['✅ Valid: user, admin, super_admin'],
        ['❌ Invalid: User, Admin, Management, Private, UVU Africa, etc.'],
        ['🔧 Most users should be: user'],
        [''],
        ['Optional Columns:'],
        ['organization_name - Company or organization name'],
        ['department - Department within organization'],
        ['cohort_name - Exact name of cohort for participation (case sensitive)'],
        ['password - Leave empty to use default password \'test1234\''],
        [''],
        ['📋 Steps to Use:'],
        ['1. Remove the example rows from the Users sheet'],
        ['2. Add your real user data'],
        ['3. Make sure role column only contains: user, admin, or super_admin'],
        ['4. Save and upload the file'],
        [''],
        ['📋 Available Cohorts:'],
        ...cohorts.map(c => [`- ${c.name} (${c.organization_name})`])
      ]
      
      const wsInstructions = XLSX.utils.aoa_to_sheet(instructions)
      wsInstructions['!cols'] = [{ width: 60 }]
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions')
      
      // Download XLSX
      XLSX.writeFile(wb, 'bulk_user_upload_template.xlsx')
    } else {
      // Generate CSV template
      const csvContent = `${headers.join(',')}\n${sampleData.map(row => row.join(',')).join('\n')}

# BULK USER UPLOAD INSTRUCTIONS:
#
# ❗ REQUIRED COLUMNS:
# - email: Must be unique and valid email format
# - first_name: User's first name
# - last_name: User's last name  
# - role: Must be EXACTLY "user", "admin", or "super_admin" (no quotes in file)
#
# ⚠️  ROLE FIELD - COMMON MISTAKES:
# ✅ Valid: user, admin, super_admin
# ❌ Invalid: User, Admin, Management, Private, UVU Africa, etc.
# 🔧 Most users should be: user
#
# OPTIONAL COLUMNS:
# - organization_name: Company or organization name
# - department: Department within organization
# - cohort_name: Exact name of cohort (case sensitive)
# - password: Leave empty to use default 'test1234'
#
# STEPS:
# 1. Remove the example rows above
# 2. Add your real user data
# 3. Make sure role column only contains: user, admin, or super_admin
# 4. Save and upload this file
#
# AVAILABLE COHORTS:
${cohorts.map(c => `# - ${c.name} (${c.organization_name})`).join('\n')}`

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'bulk_user_upload_template.csv'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    }
  }

  // Parse CSV content with improved validation
  const parseCSV = (content) => {
    const lines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#')) // Remove empty lines and comments
    
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row')
    }

    // Parse header row with better CSV handling
    const headerLine = lines[0]
    const headers = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < headerLine.length; i++) {
      const char = headerLine[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        headers.push(current.trim().replace(/^"|"$/g, ''))
        current = ''
      } else {
        current += char
      }
    }
    headers.push(current.trim().replace(/^"|"$/g, '')) // Push the last header
    
    const requiredHeaders = ['email', 'first_name', 'last_name', 'role']
    
    // Validate headers (case-insensitive)
    const normalizedHeaders = headers.map(h => h.toLowerCase())
    const missingHeaders = requiredHeaders.filter(h => !normalizedHeaders.includes(h.toLowerCase()))
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}. Found headers: ${headers.join(', ')}`)
    }

    // Parse data rows
    const users = []
    const errors = []
    
    for (let i = 1; i < lines.length; i++) {
      try {
        // Simple CSV parsing that handles quoted values
        const values = []
        let current = ''
        let inQuotes = false
        let j = 0
        const line = lines[i]
        
        while (j < line.length) {
          const char = line[j]
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim())
            current = ''
          } else {
            current += char
          }
          j++
        }
        values.push(current.trim()) // Push the last value
        
        if (values.length !== headers.length) {
          throw new Error(`Expected ${headers.length} columns, found ${values.length}`)
        }

        const user = {}
        headers.forEach((header, index) => {
          // Normalize header to lowercase for consistent mapping
          const normalizedHeader = header.toLowerCase()
          user[normalizedHeader] = values[index] || ''
        })

        // Skip completely empty rows
        const hasData = Object.values(user).some(value => value && value.toString().trim())
        if (!hasData) continue

        // Validate required fields with better error messages
        if (!user.email || !user.email.trim()) {
          throw new Error(`email is required`)
        }
        if (!user.first_name || !user.first_name.trim()) {
          throw new Error(`first_name is required`)
        }
        if (!user.last_name || !user.last_name.trim()) {
          throw new Error(`last_name is required`)
        }
        if (!user.role || !user.role.trim()) {
          throw new Error(`role is required`)
        }

        // Validate and fix role field
        const roleValue = user.role.toLowerCase().trim()
        if (!['user', 'admin', 'super_admin'].includes(roleValue)) {
          // Try to guess the intended role or provide helpful error
          if (roleValue.includes('admin')) {
            user.role = 'admin'
          } else if (roleValue.includes('super')) {
            user.role = 'super_admin'
          } else {
            // Default to user but warn about invalid role
            user.role = 'user'
            console.warn(`Row ${i + 1}: Invalid role '${user.role}' converted to 'user'. Valid roles: user, admin, super_admin`)
          }
        } else {
          user.role = roleValue
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(user.email)) {
          throw new Error(`invalid email format: ${user.email}`)
        }

        // Clean up name fields
        user.first_name = user.first_name.trim()
        user.last_name = user.last_name.trim()
        user.organization_name = user.organization_name ? user.organization_name.trim() : ''
        user.department = user.department ? user.department.trim() : ''

        // Find cohort ID if cohort_name is provided
        if (user.cohort_name && user.cohort_name.trim()) {
          const cohortName = user.cohort_name.trim()
          const cohort = cohorts.find(c => c.name === cohortName)
          if (!cohort) {
            // List available cohorts in error message
            const availableCohorts = cohorts.map(c => c.name).slice(0, 5).join(', ')
            throw new Error(`cohort "${cohortName}" not found. Available cohorts: ${availableCohorts}${cohorts.length > 5 ? '...' : ''}`)
          }
          user.cohort_id = cohort.id
        }

        users.push(user)

      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`)
      }
    }

    // If we have validation errors, show them
    if (errors.length > 0) {
      throw new Error(`Validation errors:\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? `\n... and ${errors.length - 10} more errors` : ''}`)
    }

    if (users.length === 0) {
      throw new Error('No valid user data found in file')
    }

    return users
  }

  // Parse XLSX content - FIXED VERSION
  const parseXLSX = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          
          // Get first worksheet
          const firstSheetName = workbook.SheetNames[0]
          if (!firstSheetName) {
            throw new Error('No worksheets found in XLSX file')
          }
          
          const worksheet = workbook.Sheets[firstSheetName]
          
          // Convert to JSON with header row - get raw array data
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            raw: false, // Convert everything to strings
            defval: '' // Default value for empty cells
          })
          
          if (!jsonData || jsonData.length === 0) {
            throw new Error('XLSX file appears to be empty')
          }
          
          // Find the header row (first non-empty row)
          let headerRowIndex = -1
          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i]
            if (row && row.length > 0 && row.some(cell => cell && cell.toString().trim())) {
              headerRowIndex = i
              break
            }
          }
          
          if (headerRowIndex === -1) {
            throw new Error('No header row found in XLSX file')
          }
          
          // Get data rows (skip to after header)
          const dataRows = jsonData.slice(headerRowIndex)
          
          if (dataRows.length < 2) {
            throw new Error('XLSX must have at least a header row and one data row')
          }
          
          // Filter out completely empty rows and ensure consistent column count
          const filteredRows = dataRows.filter((row, index) => {
            if (index === 0) return true // Always keep header
            return row && row.some(cell => cell && cell.toString().trim())
          })
          
          // Convert to CSV format for consistent parsing
          const csvContent = filteredRows
            .map(row => {
              // Ensure all rows have the same number of columns as the header
              const headerLength = filteredRows[0].length
              const paddedRow = Array(headerLength).fill('').map((_, i) => {
                const cell = row[i]
                return cell !== undefined ? String(cell).trim() : ''
              })
              return paddedRow.join(',')
            })
            .join('\n')
          
          // Use existing CSV parser
          const users = parseCSV(csvContent)
          resolve(users)
        } catch (error) {
          reject(new Error(`Error parsing XLSX file: ${error.message}`))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read XLSX file'))
      reader.readAsArrayBuffer(file) // THIS WAS THE KEY FIX - use ArrayBuffer for XLSX
    })
  }

  // Process bulk upload - FIXED VERSION with persistence
  const processBulkUpload = async () => {
    if (!file) return

    setUploading(true)
    setParseError('')
    setProgress({ processed: 0, total: 0, errors: [], successes: [], skipped: [] })

    try {
      // Check if we have stored users data from previous session
      let users
      const savedUsers = sessionStorage.getItem(STORAGE_KEYS.parsedUsers)
      
      if (savedUsers) {
        console.log('📋 Using stored users data from previous session')
        users = JSON.parse(savedUsers)
      } else {
        console.log('📋 Parsing users from file')
        // Parse users from file
        if (file.name.toLowerCase().endsWith('.csv')) {
          const content = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target.result)
            reader.onerror = reject
            reader.readAsText(file)
          })
          users = parseCSV(content)
        } else {
          users = await parseXLSX(file)
        }
        
        // Store parsed users for persistence
        sessionStorage.setItem(STORAGE_KEYS.parsedUsers, JSON.stringify(users))
      }

      console.log('📤 Starting bulk upload for', users.length, 'users')
      setProgress(prev => ({ ...prev, total: users.length }))

      // Process users one by one for better error handling
      const results = { successes: [], errors: [], skipped: [] }
      
      for (let i = 0; i < users.length; i++) {
        const user = users[i]
        
        try {
          console.log(`📤 Creating user ${i + 1}/${users.length}:`, user.email)
          
          // Create user using the same Edge Function as manual creation
          const response = await supabase.functions.invoke('create-user', {
            body: {
              email: user.email,
              password: user.password || 'test1234',
              first_name: user.first_name,
              last_name: user.last_name,
              organization_name: user.organization_name || '',
              department: user.department || '',
              role: user.role,
              cohort_id: user.cohort_id || null
            }
          })

          console.log(`📋 Response for ${user.email}:`, { 
            status: response.status, 
            error: response.error, 
            data: response.data 
          })

          // Simplified error handling - check for any non-success indicators
          let errorMessage = null
          let data = response.data

          // Parse string data if needed
          if (data && typeof data === 'string') {
            try {
              data = JSON.parse(data)
            } catch (parseError) {
              console.error('Failed to parse response data:', parseError)
              errorMessage = `Response parsing error: ${data.substring(0, 100)}...`
            }
          }

          // Check for errors in order of priority
          if (response.error) {
            errorMessage = response.error.message || response.error.toString()
          } else if (response.status && response.status >= 400) {
            errorMessage = data?.error || `HTTP ${response.status} error`
          } else if (data?.error) {
            errorMessage = data.error
          } else if (!data?.success && !data?.user) {
            errorMessage = 'User creation failed - no success confirmation'
          }

          if (errorMessage) {
            // Check if it's a duplicate user error
            const isDuplicateError = 
              errorMessage.toLowerCase().includes('already') ||
              errorMessage.toLowerCase().includes('duplicate') ||
              errorMessage.toLowerCase().includes('exists') ||
              errorMessage.includes('23505') // PostgreSQL unique constraint error
            
            if (isDuplicateError && skipExisting) {
              results.skipped.push({
                email: user.email,
                name: `${user.first_name} ${user.last_name}`,
                message: 'User already exists (skipped)'
              })
              console.warn(`⚠️ Row ${i + 1}: Skipped existing user ${user.email}`)
            } else {
              throw new Error(errorMessage)
            }
          } else {
            // Success case
            results.successes.push({
              email: user.email,
              name: `${user.first_name} ${user.last_name}`,
              message: data?.message || 'User created successfully'
            })
            console.log(`✅ Row ${i + 1}: User ${user.email} created successfully`)
          }

        } catch (error) {
          console.error(`❌ Failed to create user ${user.email}:`, error)
          results.errors.push({
            email: user.email,
            name: `${user.first_name} ${user.last_name}`,
            error: error.message || 'Unknown error occurred'
          })
        }

        // Update progress
        setProgress(prev => ({
          ...prev,
          processed: i + 1,
          successes: results.successes,
          errors: results.errors,
          skipped: results.skipped
        }))

        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      console.log('✅ Bulk upload completed:', results)

    } catch (error) {
      console.error('❌ Bulk upload failed:', error)
      setParseError(error.message)
      setProgress(prev => ({
        ...prev,
        errors: [{ email: 'File Error', name: '', error: error.message }]
      }))
    } finally {
      setUploading(false)
      // Clear persisted state when upload completes
      clearPersistedState()
    }
  }

  // Enhanced close handler to clear state
  const handleClose = () => {
    if (uploading) {
      const confirmClose = window.confirm(
        'Upload is in progress. Are you sure you want to close? This will cancel the upload.'
      )
      if (!confirmClose) return
    }
    
    clearPersistedState()
    onClose()
  }

  // Enhanced file selection to clear previous state
  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile) return

    // Clear any previous upload state when selecting new file
    clearPersistedState()

    const fileType = selectedFile.name.toLowerCase()
    if (!fileType.endsWith('.csv') && !fileType.endsWith('.xlsx')) {
      setParseError('Please select a CSV or XLSX file')
      return
    }

    setFile(selectedFile)
    setParseError('')
    setProgress({ processed: 0, total: 0, errors: [], successes: [], skipped: [] })

    // Immediately try to parse and validate the file
    setParsing(true)
    try {
      let users
      if (fileType.endsWith('.csv')) {
        const content = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target.result)
          reader.onerror = reject
          reader.readAsText(selectedFile)
        })
        users = parseCSV(content)
      } else {
        users = await parseXLSX(selectedFile)
      }
      
      console.log('✅ File parsed successfully:', users.length, 'users found')
      setProgress(prev => ({ ...prev, total: users.length }))
      
      // Store parsed users for persistence
      sessionStorage.setItem(STORAGE_KEYS.parsedUsers, JSON.stringify(users))
      
    } catch (error) {
      console.error('❌ File parsing failed:', error)
      setParseError(error.message)
      setFile(null) // Clear file on parse error
    } finally {
      setParsing(false)
    }
  }

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  // Check if we're in a restored session
  const isRestoredSession = uploading && progress.processed > 0
  const isComplete = progress.processed === progress.total && progress.total > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Bulk User Upload</h3>
          <p className="text-gray-600">Upload CSV or XLSX files to create multiple users at once</p>
          {isRestoredSession && (
            <div className="mt-2 flex items-center gap-2 text-blue-300 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Session restored - upload was in progress
            </div>
          )}
        </div>
        <button
          onClick={handleClose}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Template Download */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-300 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div className="flex-1">
            <h4 className="text-blue-300 font-medium mb-1">Download Template</h4>
            <p className="text-blue-200 text-sm mb-3">
              Download a template with required columns and example data. Follow the format exactly.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => downloadTemplate('csv')}
                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg text-blue-300 transition-all font-medium"
              >
                Download CSV
              </button>
              <button
                onClick={() => downloadTemplate('xlsx')}
                className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded-lg text-green-300 transition-all font-medium"
              >
                Download XLSX
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Warning for Restored Sessions */}
      {isRestoredSession && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-yellow-300 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="font-medium">Upload In Progress</span>
          </div>
          <p className="text-yellow-200 text-sm">
            Your upload session was restored. The upload will continue from where it left off. 
            You can safely switch tabs or close/reopen the browser during the upload process.
          </p>
        </div>
      )}

      {/* Parse Success Display */}
      {file && !parseError && !parsing && progress.total > 0 && !uploading && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-300 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">File Parsed Successfully</span>
          </div>
          <div className="text-green-200 text-sm">
            <p>✅ Found {progress.total} valid users ready for upload</p>
            <p>📄 File: {file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
          </div>
        </div>
      )}

      {/* Upload Options */}
      {file && !parseError && !parsing && progress.total > 0 && !uploading && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h4 className="text-gray-300 font-medium mb-3">Upload Options</h4>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={skipExisting}
                onChange={(e) => setSkipExisting(e.target.checked)}
                className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
              />
              <div className="flex-1">
                <span className="text-gray-300 font-medium">Skip existing users</span>
                <p className="text-gray-400 text-sm">
                  {skipExisting 
                    ? "Users that already exist will be skipped (recommended)" 
                    : "Attempt to create all users, even if they exist (may cause errors)"
                  }
                </p>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Parse Error Display */}
      {parseError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-300 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">File Parsing Error</span>
          </div>
          <div className="text-red-200 text-sm whitespace-pre-line max-h-40 overflow-y-auto">
            {parseError}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                setParseError('')
                setFile(null)
              }}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-red-300 transition-all font-medium"
            >
              Try Another File
            </button>
            <button
              onClick={() => downloadTemplate('xlsx')}
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg text-blue-300 transition-all font-medium"
            >
              Download Template
            </button>
          </div>
        </div>
      )}

      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          dragActive 
            ? 'border-blue-400 bg-blue-500/10' 
            : 'border-white/30 hover:border-white/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx"
          onChange={(e) => handleFileSelect(e.target.files[0])}
          className="hidden"
        />
        
        {parsing ? (
          <div className="space-y-3">
            <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-900 font-medium">Parsing file...</p>
            <p className="text-gray-900/60 text-sm">Validating data structure and content</p>
          </div>
        ) : file && !parseError ? (
          <div className="space-y-3">
            <svg className="w-12 h-12 text-green-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-gray-900 font-medium">{file.name}</p>
              <p className="text-gray-900/60 text-sm">{(file.size / 1024).toFixed(1)} KB • {progress.total} users ready</p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 glassmorphism text-gray-900 rounded-lg hover:bg-white/20 transition-all"
              >
                Choose Different File
              </button>
              {!uploading && progress.total > 0 && (
                <button
                  onClick={processBulkUpload}
                  className="px-6 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded-lg text-green-300 transition-all font-medium"
                >
                  Upload {progress.total} Users
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <svg className="w-12 h-12 text-gray-900/40 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <div>
              <p className="text-gray-900 font-medium mb-1">Drop your CSV or XLSX file here</p>
              <p className="text-gray-900/60 text-sm">or click to browse files</p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2 glassmorphism text-gray-900 rounded-lg hover:bg-white/20 transition-all font-medium"
            >
              Select File
            </button>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-300 mb-2">
              <div className="w-5 h-5 border-2 border-blue-300 border-t-transparent rounded-full animate-spin"></div>
              <span className="font-medium">Creating Users...</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress.total > 0 ? (progress.processed / progress.total) * 100 : 0}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-blue-200">
              <span>Progress: {progress.processed} / {progress.total}</span>
              <span>{progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0}%</span>
            </div>
            {progress.processed > 0 && (
              <div className="mt-3 text-sm text-blue-200 space-y-1">
                <div className="flex justify-between">
                  <span>✅ Created:</span>
                  <span className="text-green-300">{progress.successes.length}</span>
                </div>
                {progress.skipped.length > 0 && (
                  <div className="flex justify-between">
                    <span>⚠️ Skipped:</span>
                    <span className="text-yellow-300">{progress.skipped.length}</span>
                  </div>
                )}
                {progress.errors.length > 0 && (
                  <div className="flex justify-between">
                    <span>❌ Failed:</span>
                    <span className="text-red-300">{progress.errors.length}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results Display */}
      {isComplete && (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h4 className="text-gray-900 font-medium mb-3">Upload Complete</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-300">{progress.successes.length}</div>
                <div className="text-green-200 text-sm">Created</div>
              </div>
              {progress.skipped.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <div className="text-2xl font-bold text-yellow-300">{progress.skipped.length}</div>
                  <div className="text-yellow-200 text-sm">Skipped</div>
                </div>
              )}
              {progress.errors.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <div className="text-2xl font-bold text-red-300">{progress.errors.length}</div>
                  <div className="text-red-200 text-sm">Failed</div>
                </div>
              )}
            </div>
          </div>

          {/* Success Summary */}
          {progress.successes.length > 0 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-300 mb-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{progress.successes.length} Users Created Successfully</span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {progress.successes.map((success, index) => (
                  <div key={index} className="text-green-200 text-sm">
                    ✓ {success.name} ({success.email})
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Summary */}
          {progress.errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-300 mb-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{progress.errors.length} Users Failed</span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {progress.errors.map((error, index) => (
                  <div key={index} className="text-red-200 text-sm">
                    ✗ {error.name} ({error.email}): {error.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skipped Summary */}
          {progress.skipped.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-yellow-300 mb-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{progress.skipped.length} Users Skipped</span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {progress.skipped.map((skipped, index) => (
                  <div key={index} className="text-yellow-200 text-sm">
                    ⚠️ {skipped.name} ({skipped.email}): {skipped.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completion Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setFile(null)
                setProgress({ processed: 0, total: 0, errors: [], successes: [], skipped: [] })
                clearPersistedState()
              }}
              className="px-4 py-2 glassmorphism text-gray-900 rounded-lg hover:bg-white/20 transition-all"
            >
              Upload More Users
            </button>
            <button
              onClick={() => {
                onComplete()
                clearPersistedState()
                onClose()
              }}
              className="px-6 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded-lg text-green-300 transition-all font-medium"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default BulkUserUpload 