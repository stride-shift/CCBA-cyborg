import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Layout from '../components/Layout'
import CohortManagement from '../components/CohortManagement'
import { supabase } from '../lib/supabase'
import { useUserProfile } from '../hooks/useUserProfile'
import { uploadImageToStorage, convertImageToDataUrl } from '../utils/imageUpload'
import { parseCSV, generateSampleCSV } from '../utils/csvParser'
import { extractZip, getSampleFolderStructure } from '../utils/zipExtractor'
import { bulkUploadChallenges, generateUploadSummary } from '../utils/bulkUploader'

const CHALLENGE_TYPES = [
	'Explain It',
	'Improve It',
	'Imagine It',
	'Critique It',
	'Plan It',
	'Guide It',
	'Suggest It'
]

const YOUTUBE_BY_TYPE = {
	'Imagine It': 'qLmXUWbbPKI',
	'Explain It': 'FJ9d_pMfOnk',
	'Suggest It': 'FQn6fjjiqKw',
	'Improve It': 'GfpgLe_HRSc',
	'Critique It': 'qs4nElAh0Lg',
	'Plan It': 'Z9QQsk1rlWU',
	'Guide It': 'c6zlR1Zh4EY'
}

const HABIT_OPTIONS = [
	'Habit A',
	'Habit B',
	'Habit C',
	'Habit D',
	'Habit E'
]

function createEmptyDayRow(dayNumber) {
	return {
		day: dayNumber,
		challenge1: '',
		challenge1Type: '',
		video1Url: '',
		image1File: null,
		image1Preview: '',
		challenge2: '',
		challenge2Type: '',
		video2Url: '',
		image2File: null,
		image2Preview: '',
		reflectionQuestion: '',
		ahaInput: '',
		ahaList: []
	}
}

function hasAnyContent(row) {
	return (
		row.challenge1 ||
		row.challenge1Type ||
		row.video1Url ||
		row.image1File ||
		row.challenge2 ||
		row.challenge2Type ||
		row.video2Url ||
		row.image2File ||
		row.reflectionQuestion ||
		(row.ahaList && row.ahaList.length > 0)
	)
}

function PreviewChips({ items }) {
	if (!items || items.length === 0) return null
	return (
		<div className="flex flex-wrap gap-2 mt-2">
			{items.map((item, idx) => (
				<span key={idx} className="px-2 py-1 text-xs rounded-full bg-white/20 text-white border border-white/30">{item}</span>
			))}
		</div>
	)
}

function ImagePicker({ value, onChange }) {
	return (
		<div className="flex flex-col gap-2">
			{value?.preview ? (
				<img src={value.preview} alt="preview" className="w-28 h-28 object-cover rounded-xl border border-white/40 shadow" />
			) : (
				<div className="w-28 h-28 rounded-xl border border-dashed border-white/30 bg-white/10 flex items-center justify-center text-white/60 text-xs">
					No image
				</div>
			)}
			<input
				type="file"
				accept="image/*"
				onChange={(e) => {
					const file = e.target.files && e.target.files[0] ? e.target.files[0] : null
					if (!file) {
						onChange({ file: null, preview: '' })
						return
					}
					const preview = URL.createObjectURL(file)
					onChange({ file, preview })
				}}
				className="text-white/80 block"
			/>
		</div>
	)
}

function InlineRowEditor({ row, onChange }) {
	const set = (key, value) => onChange({ ...row, [key]: value })
	return (
		<div className="space-y-5">
			<div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
				<div>
					<label className="block text-white font-medium mb-1">Challenge 1</label>
					<textarea value={row.challenge1} onChange={(e) => set('challenge1', e.target.value)} placeholder="Describe the first challenge..." className="w-full px-3 py-2 rounded bg-white/20 border border-white/30 text-white placeholder-white/60 min-h-[72px]" />
				</div>
				<div>
					<label className="block text-white font-medium mb-1">Challenge 1 Type</label>
					<select value={row.challenge1Type} onChange={(e) => { const v = e.target.value; const yt = YOUTUBE_BY_TYPE[v]; onChange({ ...row, challenge1Type: v, video1Url: yt ? `https://www.youtube.com/watch?v=${yt}` : row.video1Url }); }} className="w-full px-3 py-2 rounded bg-white/30 border border-white/30 text-gray-900">
						<option value="">Select type</option>
						{CHALLENGE_TYPES.map(t => (<option key={t} value={t}>{t}</option>))}
					</select>
				</div>
				<div>
					<label className="block text-white font-medium mb-1">Video 1 URL</label>
					<input value={row.video1Url} onChange={(e) => set('video1Url', e.target.value)} className="w-full px-3 py-2 rounded bg-white/20 border border-white/30 text-white placeholder-white/60" placeholder="https://www.youtube.com/watch?v=..." />
				</div>
				<div>
					<label className="block text-white font-medium mb-1">Image 1</label>
					<ImagePicker value={{ file: row.image1File, preview: row.image1Preview }} onChange={({ file, preview }) => onChange({ ...row, image1File: file, image1Preview: preview })} />
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
				<div>
					<label className="block text-white font-medium mb-1">Challenge 2</label>
					<textarea value={row.challenge2} onChange={(e) => set('challenge2', e.target.value)} placeholder="Describe the second challenge..." className="w-full px-3 py-2 rounded bg-white/20 border border-white/30 text-white placeholder-white/60 min-h-[72px]" />
				</div>
				<div>
					<label className="block text-white font-medium mb-1">Challenge 2 Type</label>
					<select value={row.challenge2Type} onChange={(e) => { const v = e.target.value; const yt = YOUTUBE_BY_TYPE[v]; onChange({ ...row, challenge2Type: v, video2Url: yt ? `https://www.youtube.com/watch?v=${yt}` : row.video2Url }); }} className="w-full px-3 py-2 rounded bg-white/30 border border-white/30 text-gray-900">
						<option value="">Select type</option>
						{CHALLENGE_TYPES.map(t => (<option key={t} value={t}>{t}</option>))}
					</select>
				</div>
				<div>
					<label className="block text-white font-medium mb-1">Video 2 URL</label>
					<input value={row.video2Url} onChange={(e) => set('video2Url', e.target.value)} className="w-full px-3 py-2 rounded bg-white/20 border border-white/30 text-white placeholder-white/60" placeholder="https://www.youtube.com/watch?v=..." />
				</div>
				<div>
					<label className="block text-white font-medium mb-1">Image 2</label>
					<ImagePicker value={{ file: row.image2File, preview: row.image2Preview }} onChange={({ file, preview }) => onChange({ ...row, image2File: file, image2Preview: preview })} />
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-end">
				<div>
					<label className="block text-white font-medium mb-1">Reflection Question</label>
					<input
						value={row.reflectionQuestion}
						onChange={(e) => set('reflectionQuestion', e.target.value)}
						className="w-full px-3 py-2 rounded bg-white/20 border border-white/30 text-white placeholder-white/60"
						placeholder="Prompt the user to reflect..."
					/>
				</div>
				<div>
					<label className="block text-white font-medium mb-1">Aha Moments</label>
					<div className="flex gap-2">
						<input
							value={row.ahaInput}
							onChange={(e) => set('ahaInput', e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault()
									const v = (row.ahaInput || '').trim()
									if (!v) return
									onChange({ ...row, ahaList: [...(row.ahaList || []), v], ahaInput: '' })
								}
							}}
							className="flex-1 px-3 py-2 rounded bg-white/20 border border-white/30 text-white placeholder-white/60"
							placeholder="Type an aha moment"
						/>
						<button
							onClick={() => {
								const v = (row.ahaInput || '').trim()
								if (!v) return
								onChange({ ...row, ahaList: [...(row.ahaList || []), v], ahaInput: '' })
							}}
							className="px-4 py-2 rounded bg-white/30 border border-white/40 text-gray-900 hover:bg-white/40"
						>
							Add
						</button>
					</div>
					{row.ahaList && row.ahaList.length > 0 && (
						<div className="flex flex-wrap gap-2 mt-2">
							{row.ahaList.map((item, idx) => (
								<span key={idx} className="px-2 py-1 text-xs rounded-full bg-white/20 text-white border border-white/30 inline-flex items-center gap-2">
									{item}
									<button
										onClick={() => onChange({ ...row, ahaList: row.ahaList.filter((_, i) => i !== idx) })}
										className="text-white/70 hover:text-white"
										aria-label="Remove"
									>
										×
									</button>
								</span>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

const AddCohortModal = ({ isOpen, onClose, onCreated }) => {
	if (!isOpen) return null
	return createPortal(
		<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[10000]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
			<div className="glassmorphism rounded-2xl p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto relative" onClick={(e) => e.stopPropagation()}>
				<div className="absolute -top-10 left-0 right-0 h-10"></div>
				<MinimalAddCohort onCancel={onClose} onSaved={async () => { await onCreated(); onClose(); }} />
			</div>
		</div>,
		document.body
	)
}

const MinimalAddCohort = ({ onCancel, onSaved }) => {
	const [form, setForm] = useState({ name: '', organization_name: '', start_date: '', end_date: '', max_participants: '', description: '', is_active: true })
	const [loading, setLoading] = useState(false)
	const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
	const submit = async (e) => {
		e.preventDefault()
		setLoading(true)
		try {
			const payload = {
				name: form.name,
				description: form.description || null,
				organization_name: form.organization_name || null,
				start_date: form.start_date || null,
				end_date: form.end_date || null,
				max_participants: form.max_participants ? parseInt(form.max_participants) : null,
				is_active: !!form.is_active
			}
			const { error } = await supabase.from('cohorts').insert([payload])
			if (error) throw error
			await onSaved()
		} catch (err) {
			console.error('Create cohort failed:', err)
		} finally {
			setLoading(false)
		}
	}
	return (
		<form onSubmit={submit} className="space-y-6">
			<div className="sticky top-0 bg-transparent z-10 pb-4 flex items-center justify-between">
				<h3 className="text-2xl font-bold text-white">Create New Cohort</h3>
				<button type="button" onClick={onCancel} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all">
					<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
				</button>
			</div>
			<div className="grid md:grid-cols-2 gap-6">
				<div className="md:col-span-2">
					<label className="block text-white font-medium mb-2">Cohort Name *</label>
					<input required value={form.name} onChange={(e) => set('name', e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 placeholder-gray-400 text-gray-800 focus:outline-none" placeholder="e.g., Spring 2025 Cohort" />
				</div>
				<div>
					<label className="block text-white font-medium mb-2">Organization</label>
					<input value={form.organization_name} onChange={(e) => set('organization_name', e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 text-gray-800" placeholder="e.g., Acme Corporation" />
				</div>
				<div>
					<label className="block text-white font-medium mb-2">Start Date</label>
					<input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 text-gray-800" />
				</div>
				<div>
					<label className="block text-white font-medium mb-2">End Date</label>
					<input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 text-gray-800" />
				</div>
				<div>
					<label className="block text-white font-medium mb-2">Max Participants</label>
					<input type="number" value={form.max_participants} onChange={(e) => set('max_participants', e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 text-gray-800" placeholder="Leave empty for no limit" />
				</div>
				<div className="md:col-span-2">
					<label className="block text-white font-medium mb-2">Description</label>
					<textarea value={form.description} onChange={(e) => set('description', e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 placeholder-gray-400 text-gray-800 resize-none" rows="3" />
				</div>
			</div>
			<div className="flex items-center">
				<input type="checkbox" id="is_active_add" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="w-4 h-4 rounded border-white/30 bg-white/20 text-white focus:ring-white/50" />
				<label htmlFor="is_active_add" className="ml-3 text-white font-medium">Active Cohort</label>
			</div>
			<div className="flex justify-end gap-3 pt-2">
				<button type="button" onClick={onCancel} className="px-6 py-3 glassmorphism text-gray-800 rounded-xl border border-white/30">Cancel</button>
				<button type="submit" disabled={loading} className="px-6 py-3 glassmorphism text-gray-800 rounded-xl border border-white/30">{loading ? 'Creating...' : 'Create Cohort'}</button>
			</div>
		</form>
	)
}

export default function AdminCustomisation() {
	const { isSuperAdmin } = useUserProfile()
	const [activeTab, setActiveTab] = useState('Upload')
	const [selectedChallengeSet, setSelectedChallengeSet] = useState('') // stores challenge_set_id
	const tabs = ['Upload', 'Bulk Upload', 'Challenge Sets', 'Cohort Management']

	// Day rows state
	const [rows, setRows] = useState(() => Array.from({ length: 15 }, (_, i) => createEmptyDayRow(i + 1)))

	// Challenges by set: { [challengeSetId]: Array<row> }
	const [challengesBySet, setChallengesBySet] = useState({})

	const challengesForSet = useMemo(() => challengesBySet[selectedChallengeSet] || [], [challengesBySet, selectedChallengeSet])

	const [challengeSetItems, setChallengeSetItems] = useState([])
	const [showAddModal, setShowAddModal] = useState(false)
	const [message, setMessage] = useState('')
	const [saving, setSaving] = useState(false)

	// Bulk upload state
	const [bulkCsvFile, setBulkCsvFile] = useState(null)
	const [bulkZipFile, setBulkZipFile] = useState(null)
	const [bulkUploading, setBulkUploading] = useState(false)
	const [bulkProgress, setBulkProgress] = useState([])
	const [bulkErrors, setBulkErrors] = useState([])
	const [bulkWarnings, setBulkWarnings] = useState([])
	const [bulkSummary, setBulkSummary] = useState(null)

	useEffect(() => {
		const load = async () => {
			const { data, error } = await supabase.from('challenge_sets').select('id, name').order('name')
			if (!error) setChallengeSetItems(data || [])
		}
		load()
	}, [])

	const refreshChallengeSets = async () => {
		const { data } = await supabase.from('challenge_sets').select('id, name').order('name')
		setChallengeSetItems(data || [])
	}

	// Fetch existing challenges when challenge set changes
	useEffect(() => {
		if (!selectedChallengeSet) return
		const fetchChallenges = async () => {
			try {
				setMessage('')
				const { data, error } = await supabase
					.from('challenges')
					.select('*')
					.eq('challenge_set_id', selectedChallengeSet)
					.order('order_index')
				if (error) throw error
				const map = new Map()
				for (const rec of data || []) {
					map.set(rec.order_index, rec)
				}
				setRows(Array.from({ length: 15 }, (_, i) => {
					const day = i + 1
					const rec = map.get(day)
					if (!rec) return createEmptyDayRow(day)
					return {
						day,
						challenge1: rec.challenge_1 || '',
						challenge1Type: rec.challenge_1_type || '',
						video1Url: rec.video_url_1 || '',
						image1File: null,
						image1Preview: rec.challenge_1_image_url || '',
						challenge2: rec.challenge_2 || '',
						challenge2Type: rec.challenge_2_type || '',
						video2Url: rec.video_url_2 || '',
						image2File: null,
						image2Preview: rec.challenge_2_image_url || '',
						reflectionQuestion: rec.reflection_question || '',
						ahaInput: (rec.intended_aha_moments || []).join(', '),
						ahaList: rec.intended_aha_moments || [],
						title: rec.title || '',
					}
				}))
				setChallengesBySet(prev => ({ ...prev, [selectedChallengeSet]: (data || []).map(d => d) }))
			} catch (err) {
				setMessage('Failed to load challenges: ' + err.message)
			}
		}
		fetchChallenges()
	}, [selectedChallengeSet])

	const setRow = (index, newRow) => {
		setRows(prev => prev.map((r, i) => (i === index ? newRow : r)))
	}

	const clearRow = async (index) => {
		try {
			const day = rows[index].day
			setRows(prev => prev.map((r, i) => (i === index ? createEmptyDayRow(r.day) : r)))
			if (!selectedChallengeSet) return
			const { error } = await supabase
				.from('challenges')
				.delete()
				.eq('challenge_set_id', selectedChallengeSet)
				.eq('order_index', day)
			if (error) throw error
		} catch (err) {
			setMessage('Failed to clear day: ' + err.message)
		}
	}

	const saveRowToChallengeSet = (row) => {
		setChallengesBySet(prev => {
			const current = prev[selectedChallengeSet] ? [...prev[selectedChallengeSet]] : []
			const existingIndex = current.findIndex(item => item.day === row.day)
			const payload = { ...row }
			if (existingIndex >= 0) {
				current[existingIndex] = payload
			} else {
				current.push(payload)
			}
			return { ...prev, [selectedChallengeSet]: current }
		})
	}

			// Helper function to convert image to base64 data URL (bypasses storage issues)
	const convertImageToDataUrl = async (file) => {
		if (!file) return null
		
		return new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onload = () => resolve(reader.result)
			reader.onerror = reject
			reader.readAsDataURL(file)
		})
	}

	const onSaveAll = async () => {
		if (!selectedChallengeSet) {
			setMessage('Please select a challenge set before saving.')
			return
		}
		try {
			setSaving(true)
			setMessage('Processing images and saving...')

			const filteredRows = rows.filter(r => hasAnyContent(r))
			const records = []

			for (const r of filteredRows) {
				let challenge1ImageUrl = null
				let challenge2ImageUrl = null

				// Process challenge 1 image: Try storage upload first, fallback to base64
				if (r.image1File) {
					console.log('📤 Uploading challenge 1 image to storage...')
					const storageResult = await uploadImageToStorage(r.image1File, `challenge-1-day-${r.day}-`)

					if (storageResult.error) {
						console.warn('⚠️ Storage upload failed for challenge 1, using base64 fallback:', storageResult.error)
						challenge1ImageUrl = await convertImageToDataUrl(r.image1File)
					} else {
						console.log('✅ Challenge 1 image uploaded to storage:', storageResult.url)
						challenge1ImageUrl = storageResult.url
					}
				} else if (r.image1Preview && !r.image1Preview.startsWith('blob:')) {
					// Keep existing stored URL or data URL if no new file
					challenge1ImageUrl = r.image1Preview
				}

				// Process challenge 2 image: Try storage upload first, fallback to base64
				if (r.image2File) {
					console.log('📤 Uploading challenge 2 image to storage...')
					const storageResult = await uploadImageToStorage(r.image2File, `challenge-2-day-${r.day}-`)

					if (storageResult.error) {
						console.warn('⚠️ Storage upload failed for challenge 2, using base64 fallback:', storageResult.error)
						challenge2ImageUrl = await convertImageToDataUrl(r.image2File)
					} else {
						console.log('✅ Challenge 2 image uploaded to storage:', storageResult.url)
						challenge2ImageUrl = storageResult.url
					}
				} else if (r.image2Preview && !r.image2Preview.startsWith('blob:')) {
					// Keep existing stored URL or data URL if no new file
					challenge2ImageUrl = r.image2Preview
				}

				records.push({
					challenge_set_id: selectedChallengeSet,
					order_index: r.day,
					challenge_1: r.challenge1 || null,
					challenge_1_type: r.challenge1Type || null,
					challenge_2: r.challenge2 || null,
					challenge_2_type: r.challenge2Type || null,
					video_url_1: r.video1Url || null,
					video_url_2: r.video2Url || null,
					challenge_1_image_url: challenge1ImageUrl,
					challenge_2_image_url: challenge2ImageUrl,
					reflection_question: r.reflectionQuestion || null,
					intended_aha_moments: r.ahaList && r.ahaList.length ? r.ahaList : null,
					title: r.title || null,
					is_active: true
				})
			}

			if (records.length === 0) {
				setMessage('Nothing to save.')
				return
			}

			setMessage('Saving to database...')
			const { error } = await supabase
				.from('challenges')
				.upsert(records, { onConflict: 'challenge_set_id,order_index' })
			if (error) throw error
			setMessage('Saved successfully.')
		} catch (err) {
			setMessage('Save failed: ' + err.message)
		} finally {
			setSaving(false)
		}
	}

	const onResetAll = () => {
		setRows(Array.from({ length: 15 }, (_, i) => createEmptyDayRow(i + 1)))
	}

	// Bulk upload functions
	const handleBulkUpload = async () => {
		if (!selectedChallengeSet) {
			setMessage('Please select a challenge set before bulk upload')
			return
		}

		if (!bulkCsvFile || !bulkZipFile) {
			setMessage('Please select both CSV and ZIP files')
			return
		}

		setBulkUploading(true)
		setBulkProgress([])
		setBulkErrors([])
		setBulkWarnings([])
		setBulkSummary(null)
		setMessage('Processing bulk upload...')

		try {
			// Step 1: Parse CSV
			setMessage('Parsing CSV file...')
			const csvResult = await parseCSV(bulkCsvFile, [])

			if (csvResult.errors.length > 0) {
				setBulkErrors(csvResult.errors.map(e => e.message || e))
				setMessage(`CSV validation failed with ${csvResult.errors.length} errors`)
				return
			}

			if (csvResult.warnings.length > 0) {
				setBulkWarnings(csvResult.warnings.map(w => w.message || w))
			}

			// Step 2: Extract images from ZIP
			setMessage('Extracting images from ZIP...')
			const requiredImages = csvResult.data.map(row => row.image_file_name).filter(Boolean)
			const zipResult = await extractZip(bulkZipFile, requiredImages)

			if (zipResult.errors.length > 0) {
				setBulkErrors(prev => [...prev, ...zipResult.errors.map(e => e.message || e)])
				setMessage(`Image extraction failed with ${zipResult.errors.length} errors`)
				return
			}

			if (zipResult.warnings.length > 0) {
				setBulkWarnings(prev => [...prev, ...zipResult.warnings.map(w => w.message || w)])
			}

			// Step 3: Upload challenges
			setMessage('Uploading challenges...')
			const uploadResult = await bulkUploadChallenges(
				csvResult.data,
				zipResult.images,
				selectedChallengeSet,
				(progress) => {
					setBulkProgress(prev => {
						const newProgress = [...prev]
						newProgress[progress.index] = progress
						return newProgress
					})
				}
			)

			// Generate summary
			const summary = generateUploadSummary(uploadResult)
			setBulkSummary(summary)

			if (uploadResult.success) {
				setMessage(`✅ Bulk upload completed! ${summary.successful}/${summary.total} challenges uploaded successfully.`)
			} else {
				setMessage(`⚠️ Bulk upload completed with errors. ${summary.successful}/${summary.total} challenges uploaded.`)
				setBulkErrors(prev => [...prev, ...uploadResult.errors])
			}

		} catch (error) {
			console.error('Bulk upload error:', error)
			setMessage(`❌ Bulk upload failed: ${error.message}`)
			setBulkErrors(prev => [...prev, error.message])
		} finally {
			setBulkUploading(false)
		}
	}

	const downloadSampleCSV = () => {
		const csvContent = generateSampleCSV()
		const blob = new Blob([csvContent], { type: 'text/csv' })
		const url = URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = 'sample-challenges.csv'
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		URL.revokeObjectURL(url)
		setMessage('Sample CSV downloaded!')
	}

	const resetBulkUpload = () => {
		setBulkCsvFile(null)
		setBulkZipFile(null)
		setBulkProgress([])
		setBulkErrors([])
		setBulkWarnings([])
		setBulkSummary(null)
		setMessage('')
	}

	const truncate = (text, len = 60) => {
		if (!text) return ''
		return text.length > len ? text.slice(0, len) + '…' : text
	}

	return (
		<Layout>
			<div className="container mx-auto px-4 py-12">
				{/* Message banner */}
				{message && (
					<div className="glassmorphism rounded-2xl p-4 mb-4">
						<p className="text-white">{message}</p>
					</div>
				)}
				{/* Page Header */}
				<div className="glassmorphism rounded-2xl p-8 mb-8">
					<h1 className="text-4xl font-bold text-white mb-4">Admin Customisation</h1>
					<p className="text-white/80">Configure cohorts, assignments, and assets. Placeholders only for now.</p>
				</div>

				{/* All Cohorts + Add Cohort */}
				<div className="glassmorphism rounded-2xl p-6 mb-8">
					<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
						<div>
							<h3 className="text-2xl font-bold text-white mb-2">Challenge Set Manager</h3>
							<p className="text-white/80">Select a challenge set to edit (Standard, Sales, Executive)</p>
						</div>
						<div className="flex gap-3 items-center">
							<select value={selectedChallengeSet} onChange={(e) => setSelectedChallengeSet(e.target.value)} className="px-4 py-3 rounded-xl bg-white/30 border border-white/30 text-gray-900 min-w-[18rem]">
								<option value="">Select a challenge set...</option>
								{challengeSetItems.map(c => (
									<option key={c.id} value={c.id}>{c.name}</option>
								))}
							</select>
							<button onClick={() => setShowAddModal(true)} className="px-6 py-3 glassmorphism text-gray-800 rounded-xl hover:bg-white/40 transition-all font-medium flex items-center gap-2 whitespace-nowrap border border-white/30">
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
								Add Cohort
							</button>
						</div>
					</div>
				</div>

				<AddCohortModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onCreated={refreshCohorts} />

				{/* Existing tabs */}
				<div className="glassmorphism rounded-2xl p-6 mb-8">
					<nav className="flex gap-4 flex-wrap">
						{tabs.map(tab => (
							<button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`px-6 py-3 rounded-lg font-medium transition-all ${activeTab === tab ? 'bg-white/30 text-white shadow' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>{tab}</button>
						))}
					</nav>
				</div>

				{!selectedChallengeSet && activeTab !== 'Cohort Management' && (
					<div className="glassmorphism rounded-2xl p-8">
						<p className="text-white text-lg">Please select a challenge set</p>
					</div>
				)}

				{selectedChallengeSet && activeTab === 'Upload' && (
					<div className="space-y-6">
						{/* Table */}
						<div className="glassmorphism rounded-2xl p-4 overflow-x-auto">
							<table className="min-w-full text-left align-top">
																	<thead className="sticky top-0">
										<tr className="text-white/90">
											<th className="py-3 px-4">Day</th>
											<th className="py-3 px-4">Editor</th>
										</tr>
									</thead>
								<tbody>
									{rows.map((row, idx) => (
										<tr key={row.day} className="align-top">
											<td className="py-4 px-4 text-white font-semibold">Day {row.day}</td>
																							<td className="py-4 px-4">
														<div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 shadow-inner">
														<InlineRowEditor row={row} onChange={(updated) => setRow(idx, updated)} />
															<div className="mt-4 flex justify-end">
																<button onClick={() => clearRow(idx)} className="px-4 py-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all border border-white/30">Clear Day</button>
															</div>
													</div>
												</td>
											</tr>
									))}
								</tbody>
							</table>
						</div>
						<div className="flex justify-end gap-3">
							<button onClick={onResetAll} className="px-6 py-3 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-all border border-white/30">Clear All</button>
							<button onClick={onSaveAll} className="px-6 py-3 rounded-xl bg-white/70 text-gray-900 hover:bg-white/80 transition-all shadow border border-white/40">Save</button>
						</div>
					</div>
				)}

				{selectedChallengeSet && activeTab === 'Bulk Upload' && (
					<div className="space-y-6">
						<div className="glassmorphism rounded-2xl p-8">
							<h3 className="text-2xl font-bold text-white mb-6">Bulk Upload Challenges</h3>
							
							{/* File Upload Section */}
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
								{/* CSV Upload */}
								<div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
									<h4 className="text-lg font-semibold text-white mb-4">1. Upload CSV File</h4>
									<input
										type="file"
										accept=".csv"
										onChange={(e) => setBulkCsvFile(e.target.files[0])}
										className="block w-full text-white/80 bg-white/10 border border-white/30 rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white/20 file:text-white hover:file:bg-white/30"
									/>
									{bulkCsvFile && (
										<p className="text-green-400 text-sm mt-2">✅ {bulkCsvFile.name}</p>
									)}
								</div>

								{/* ZIP Upload */}
								<div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
									<h4 className="text-lg font-semibold text-white mb-4">2. Upload Images ZIP</h4>
									<input
										type="file"
										accept=".zip"
										onChange={(e) => setBulkZipFile(e.target.files[0])}
										className="block w-full text-white/80 bg-white/10 border border-white/30 rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white/20 file:text-white hover:file:bg-white/30"
									/>
									{bulkZipFile && (
										<p className="text-green-400 text-sm mt-2">✅ {bulkZipFile.name}</p>
									)}
								</div>
							</div>

							{/* Action Buttons */}
							<div className="flex flex-wrap gap-4 mb-6">
								<button 
									onClick={handleBulkUpload}
									disabled={!bulkCsvFile || !bulkZipFile || bulkUploading}
									className="px-6 py-3 rounded-xl bg-blue-500/80 text-white hover:bg-blue-500/90 transition-all shadow border border-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{bulkUploading ? '⏳ Uploading...' : '🚀 Start Bulk Upload'}
								</button>
								
								<button 
									onClick={downloadSampleCSV}
									className="px-6 py-3 rounded-xl bg-green-500/80 text-white hover:bg-green-500/90 transition-all shadow border border-green-400/50"
								>
									📥 Download Sample CSV
								</button>
								
								<button 
									onClick={resetBulkUpload}
									className="px-6 py-3 rounded-xl bg-gray-500/80 text-white hover:bg-gray-500/90 transition-all shadow border border-gray-400/50"
								>
									🔄 Reset
								</button>
							</div>

							{/* Progress Section */}
							{bulkProgress.length > 0 && (
								<div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 mb-6">
									<h4 className="text-lg font-semibold text-white mb-4">Upload Progress</h4>
									<div className="space-y-2 max-h-60 overflow-y-auto">
										{bulkProgress.map((progress, index) => (
											<div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
												<div className="flex-1">
													<span className="text-white text-sm">
														Day {progress.current?.day_number}: {progress.current?.challenge_title}
													</span>
													{progress.step && (
														<span className="text-white/60 text-xs ml-2">
															({progress.step})
														</span>
													)}
												</div>
												<div className="ml-4">
													{progress.status === 'completed' && <span className="text-green-400">✅</span>}
													{progress.status === 'processing' && <span className="text-yellow-400">⏳</span>}
													{progress.status === 'error' && <span className="text-red-400">❌</span>}
												</div>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Summary Section */}
							{bulkSummary && (
								<div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 mb-6">
									<h4 className="text-lg font-semibold text-white mb-4">Upload Summary</h4>
									<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
										<div className="text-center">
											<div className="text-2xl font-bold text-green-400">{bulkSummary.successful}</div>
											<div className="text-white/60 text-sm">Successful</div>
										</div>
										<div className="text-center">
											<div className="text-2xl font-bold text-red-400">{bulkSummary.failed}</div>
											<div className="text-white/60 text-sm">Failed</div>
										</div>
										<div className="text-center">
											<div className="text-2xl font-bold text-blue-400">{bulkSummary.details.created}</div>
											<div className="text-white/60 text-sm">Created</div>
										</div>
										<div className="text-center">
											<div className="text-2xl font-bold text-yellow-400">{bulkSummary.details.updated}</div>
											<div className="text-white/60 text-sm">Updated</div>
										</div>
									</div>
									<div className="text-center">
										<div className="text-3xl font-bold text-white">{bulkSummary.successRate}%</div>
										<div className="text-white/60">Success Rate</div>
									</div>
								</div>
							)}

							{/* Errors and Warnings */}
							{(bulkErrors.length > 0 || bulkWarnings.length > 0) && (
								<div className="space-y-4">
									{bulkErrors.length > 0 && (
										<div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6">
											<h4 className="text-lg font-semibold text-red-400 mb-4">❌ Errors ({bulkErrors.length})</h4>
											<div className="space-y-2 max-h-40 overflow-y-auto">
												{bulkErrors.map((error, index) => (
													<div key={index} className="text-red-300 text-sm bg-red-500/10 rounded p-2">
														{error}
													</div>
												))}
											</div>
										</div>
									)}

									{bulkWarnings.length > 0 && (
										<div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-6">
											<h4 className="text-lg font-semibold text-yellow-400 mb-4">⚠️ Warnings ({bulkWarnings.length})</h4>
											<div className="space-y-2 max-h-40 overflow-y-auto">
												{bulkWarnings.map((warning, index) => (
													<div key={index} className="text-yellow-300 text-sm bg-yellow-500/10 rounded p-2">
														{warning}
													</div>
												))}
											</div>
										</div>
									)}
								</div>
							)}

							{/* Instructions */}
							<div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
								<h4 className="text-lg font-semibold text-white mb-4">📋 Instructions</h4>
								<div className="text-white/70 space-y-2 text-sm">
									<p>• <strong>CSV Columns:</strong> cohort_name, day_number, challenge_title, challenge_description, video_url, image_file_name</p>
									<p>• <strong>Images:</strong> Include all referenced images in a ZIP file with exact matching filenames</p>
									<p>• <strong>Validation:</strong> Files are validated for format, size (max 5MB), and required data</p>
									<p>• <strong>Storage:</strong> Images uploaded to Supabase Storage with organized folder structure</p>
									<p>• <strong>Overwrite:</strong> Existing challenges for same cohort/day will be updated</p>
								</div>
								<div className="mt-4 p-4 bg-white/10 rounded-lg">
									<p className="text-white/80 text-sm font-mono">
										{getSampleFolderStructure()}
									</p>
								</div>
							</div>
						</div>
					</div>
				)}

{selectedChallengeSet && activeTab === 'Challenge Sets' && (
	<div className="space-y-4">
		{challengesForSet.length === 0 ? (
			<div className="glassmorphism rounded-2xl p-8 text-white/90">
				No challenges yet for this set.
			</div>
		) : (
			challengesForSet
				.sort((a, b) => a.order_index - b.order_index)
				.map((item, i) => (
					<div key={`${item.day}-${i}`} className="space-y-4">
						<div className="glassmorphism rounded-2xl p-6">
							<div className="flex items-start justify-between gap-4">
								<div className="flex-1">
									<div className="flex items-center gap-3 mb-2">
										<span className="px-3 py-1 rounded-full bg-white/20 text-white text-sm border border-white/30">
											Day {item.day}
										</span>
										<div className="text-white/80 text-sm">
								Reflection: {truncate(item.reflectionQuestion || item.reflection_question, 80) || '—'}
										</div>
									</div>
									<div className="text-white mb-2">
										<strong>Challenge 1:</strong> {truncate(item.challenge1 || item.challenge_1)}
									</div>
									<div className="text-white/90 mb-2">
										<strong>Challenge 2:</strong> {truncate(item.challenge2 || item.challenge_2)}
									</div>
									{(item.video1Url || item.video_1_url || item.video2Url || item.video_2_url) && (
										<div className="text-white/70 text-sm mb-2">
											Videos: {[item.video1Url || item.video_url_1, item.video2Url || item.video_url_2]
												.filter(Boolean)
												.map(v => truncate(v, 40))
												.join(' • ')}
										</div>
									)}
									<PreviewChips items={item.ahaList || item.intended_aha_moments} />
								</div>
								<div className="flex gap-3">
																			{(item.image1Preview || item.challenge_1_image_url) && (
										<img
												src={item.image1Preview || item.challenge_1_image_url}
											className="w-16 h-16 object-cover rounded border border-white/40"
											alt="img1"
										/>
									)}
																			{(item.image2Preview || item.challenge_2_image_url) && (
										<img
												src={item.image2Preview || item.challenge_2_image_url}
											className="w-16 h-16 object-cover rounded border border-white/40"
											alt="img2"
										/>
									)}
								</div>
							</div>

							{/* Inline editor */}
							<div className="mt-4">
								<InlineRowEditor
									row={{
										day: item.day || item.order_index,
										challenge1: item.challenge1 || item.challenge_1 || '',
										challenge1Type: item.challenge1Type || item.challenge_1_type || '',
																					video1Url: item.video1Url || item.video_url_1 || '',
										image1File: null,
											image1Preview: item.image1Preview || item.challenge_1_image_url || '',
										challenge2: item.challenge2 || item.challenge_2 || '',
										challenge2Type: item.challenge2Type || item.challenge_2_type || '',
											video2Url: item.video2Url || item.video_url_2 || '',
										image2File: null,
											image2Preview: item.image2Preview || item.challenge_2_image_url || '',
										habit1: item.habit1 || item.habit_duo_a || '',
										habit2: item.habit2 || item.habit_duo_b || '',
										hahaInput: (item.ahaList || item.intended_aha_moments || []).join(', '),
										hahaList: item.ahaList || item.intended_aha_moments || [],
										title: item.title || '',
									}}
									onChange={(updated) => {
										setChallengesBySet(prev => {
											const current = [...(prev[selectedChallengeSet] || [])];
											const idx = current.findIndex(x => (x.day || x.order_index) === (item.day || item.order_index));
											if (idx >= 0) current[idx] = { ...current[idx], ...updated };
											return { ...prev, [selectedChallengeSet]: current };
										});
									}}
								/>
								<div className="flex gap-3 mt-3">
									<button
										disabled={!isSuperAdmin()}
										onClick={async () => {
											try {
												const r = {
													challenge_set_id: selectedChallengeSet,
													order_index: item.day || item.order_index,
													challenge_1: item.challenge1 || item.challenge_1 || null,
													challenge_1_type: item.challenge1Type || item.challenge_1_type || null,
													challenge_2: item.challenge2 || item.challenge_2 || null,
													challenge_2_type: item.challenge2Type || item.challenge_2_type || null,
													video_url_1: item.video1Url || item.video_url_1 || null,
													video_url_2: item.video2Url || item.video_url_2 || null,
													challenge_1_image_url: item.image1Preview || item.challenge_1_image_url || null,
													challenge_2_image_url: item.image2Preview || item.challenge_2_image_url || null,
													reflection_question: item.reflectionQuestion || item.reflection_question || null,
													intended_aha_moments: (item.ahaList || item.intended_aha_moments) || null,
													title: item.title || null,
													is_active: true
												};
												const { error } = await supabase.from('challenges').upsert([r], { onConflict: 'challenge_set_id,order_index' });
												if (error) throw error;
												setMessage('Saved.');
											} catch (err) {
												setMessage('Save failed: ' + err.message);
											}
										}}
										className="px-4 py-2 rounded-lg bg-white/70 text-gray-900 hover:bg-white/80 transition-all shadow border border-white/40 disabled:opacity-50"
									>
										Save
									</button>
									<button
										disabled={!isSuperAdmin()}
										onClick={async () => {
											try {
												const { error } = await supabase
													.from('challenges')
													.delete()
													.eq('challenge_set_id', selectedChallengeSet)
													.eq('order_index', item.day || item.order_index);
												if (error) throw error;
												setMessage('Deleted.');
											} catch (err) {
												setMessage('Delete failed: ' + err.message);
											}
										}}
										className="px-4 py-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all border border-white/30 disabled:opacity-50"
									>
										Delete
									</button>
								</div>
							</div>
						</div>
					</div>
				))
		)}
	</div>
)}

				{activeTab === 'Cohort Management' && (
					<div className="glassmorphism rounded-2xl p-8">
						<CohortManagement />
					</div>
				)}

</div>
</Layout>
);
}
