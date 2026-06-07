'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { delegatesApi } from '@/lib/api'
import AppLayout from '@/components/AppLayout'

type DelegateData = {
  email: string
  firstName: string
  lastName: string
}

type BulkInviteResult = {
  email: string
  success: boolean
  message: string
}

type ColumnMapping = {
  email: string
  firstName: string
  lastName: string
}

type RawRowData = Record<string, string>

export default function InviteDelegatesPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Single invite form
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
  })

  // Bulk invite state
  const [rawData, setRawData] = useState<RawRowData[]>([])
  const [fileColumns, setFileColumns] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    email: '',
    firstName: '',
    lastName: '',
  })
  const [mappingConfirmed, setMappingConfirmed] = useState(false)
  const [parsedData, setParsedData] = useState<DelegateData[]>([])
  const [bulkResults, setBulkResults] = useState<BulkInviteResult[]>([])
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 })
  const [fileName, setFileName] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const userStr = localStorage.getItem('user')

    if (!token || !userStr) {
      router.push('/auth/login')
      return
    }

    const user = JSON.parse(userStr)

    if (!user.isStaff && !user.isSuperAdmin) {
      router.push('/')
      return
    }
  }, [router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.email || !formData.firstName || !formData.lastName) {
      setError('All fields are required')
      return
    }

    setLoading(true)

    try {
      const response = await delegatesApi.invite({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
      })

      if (response.data) {
        setSuccess(
          `Delegate ${formData.firstName} ${formData.lastName} invited successfully!`
        )
        setFormData({
          email: '',
          firstName: '',
          lastName: '',
        })
      } else {
        setError(response.message || 'Failed to invite delegate')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const guessColumnMapping = (columns: string[]): ColumnMapping => {
    const mapping: ColumnMapping = { email: '', firstName: '', lastName: '' }

    const normalizeForMatching = (str: string): string => {
      return str.toLowerCase().trim().replace(/[\s_-]+/g, '')
    }

    const emailPatterns = ['email', 'emailaddress', 'mail', 'e-mail', 'courriel']
    const firstNamePatterns = ['firstname', 'first', 'givenname', 'prenom', 'prénom', 'fname']
    const lastNamePatterns = ['lastname', 'last', 'surname', 'familyname', 'nom', 'lname']

    columns.forEach((col) => {
      const normalized = normalizeForMatching(col)

      if (!mapping.email && emailPatterns.some((p) => normalized.includes(p))) {
        mapping.email = col
      }
      if (!mapping.firstName && firstNamePatterns.some((p) => normalized.includes(p))) {
        mapping.firstName = col
      }
      if (!mapping.lastName && lastNamePatterns.some((p) => normalized.includes(p))) {
        mapping.lastName = col
      }
    })

    return mapping
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setSuccess('')
    setBulkResults([])
    setParsedData([])
    setMappingConfirmed(false)
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = event.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<RawRowData>(worksheet, { defval: '' })

        if (jsonData.length === 0) {
          setError('The file appears to be empty')
          setRawData([])
          setFileColumns([])
          return
        }

        const columns = Object.keys(jsonData[0])
        setFileColumns(columns)
        setRawData(jsonData)

        const guessedMapping = guessColumnMapping(columns)
        setColumnMapping(guessedMapping)
      } catch (err) {
        setError('Failed to parse the file. Please ensure it is a valid CSV or Excel file.')
        setRawData([])
        setFileColumns([])
      }
    }

    reader.onerror = () => {
      setError('Failed to read the file')
      setRawData([])
      setFileColumns([])
    }

    reader.readAsBinaryString(file)
  }

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    setColumnMapping((prev) => ({ ...prev, [field]: value }))
  }

  const isMappingComplete = (): boolean => {
    return !!(columnMapping.email && columnMapping.firstName && columnMapping.lastName)
  }

  const confirmMapping = () => {
    if (!isMappingComplete()) {
      setError('Please map all required fields')
      return
    }

    setError('')

    const mapped: DelegateData[] = rawData.map((row) => ({
      email: String(row[columnMapping.email] || '').trim(),
      firstName: String(row[columnMapping.firstName] || '').trim(),
      lastName: String(row[columnMapping.lastName] || '').trim(),
    }))

    const validRows = mapped.filter(
      (row) => row.email && row.firstName && row.lastName
    )

    if (validRows.length === 0) {
      setError('No valid rows found after applying the column mapping.')
      return
    }

    if (validRows.length < mapped.length) {
      setError(
        `${mapped.length - validRows.length} row(s) were skipped due to missing required fields.`
      )
    }

    setParsedData(validRows)
    setMappingConfirmed(true)
  }

  const resetMapping = () => {
    setMappingConfirmed(false)
    setParsedData([])
    setError('')
    setSuccess('')
  }

  const handleBulkInvite = async () => {
    if (parsedData.length === 0) return

    setLoading(true)
    setError('')
    setSuccess('')
    setBulkResults([])
    setBulkProgress({ current: 0, total: parsedData.length })

    const results: BulkInviteResult[] = []

    for (let i = 0; i < parsedData.length; i++) {
      const delegate = parsedData[i]
      setBulkProgress({ current: i + 1, total: parsedData.length })

      try {
        const response = await delegatesApi.invite(delegate)
        results.push({
          email: delegate.email,
          success: !!response.data,
          message: response.data ? 'Invited successfully' : (response.message || 'Failed'),
        })
      } catch (err) {
        results.push({
          email: delegate.email,
          success: false,
          message: 'Network error',
        })
      }
    }

    setBulkResults(results)
    setLoading(false)

    const successCount = results.filter((r) => r.success).length
    const failCount = results.length - successCount

    if (failCount === 0) {
      setSuccess(`All ${successCount} delegates invited successfully!`)
      clearBulkData()
    } else {
      setError(`${successCount} invited, ${failCount} failed. See details below.`)
    }
  }

  const handleRemoveRow = (index: number) => {
    setParsedData((prev) => prev.filter((_, i) => i !== index))
  }

  const clearBulkData = () => {
    setRawData([])
    setFileColumns([])
    setColumnMapping({ email: '', firstName: '', lastName: '' })
    setMappingConfirmed(false)
    setParsedData([])
    setBulkResults([])
    setFileName('')
    setError('')
    setSuccess('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getUnmappedColumns = (currentField: keyof ColumnMapping): string[] => {
    const usedColumns = Object.entries(columnMapping)
      .filter(([key, value]) => key !== currentField && value)
      .map(([_, value]) => value)

    return fileColumns.filter((col) => !usedColumns.includes(col))
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-100 rounded-lg">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Invite Delegates</h1>
              <p className="text-gray-500 text-sm">Send invitations to new delegates individually or in bulk</p>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('single')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'single'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Single Invite
              </button>
              <button
                onClick={() => setActiveTab('bulk')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'bulk'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Bulk Import
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'single' ? (
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Delegate Details</h2>
                  <p className="text-sm text-gray-500">Enter the delegate's information to send them an invitation.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      placeholder="delegate@example.com"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        required
                        placeholder="John"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                        value={formData.firstName}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        required
                        placeholder="Doe"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                        value={formData.lastName}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Sending...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Send Invitation
                        </>
                      )}
                    </button>
                    <Link
                      href="/dashboard"
                      className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Cancel
                    </Link>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Bulk Import</h2>
                  <p className="text-sm text-gray-500">Upload a CSV or Excel file to invite multiple delegates at once.</p>
                </div>

                {/* Step indicator */}
                {rawData.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${!mappingConfirmed ? 'bg-primary-500 text-white' : 'bg-green-500 text-white'}`}>
                        {mappingConfirmed ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : '1'}
                      </div>
                      <div className={`flex-1 h-1 mx-2 ${mappingConfirmed ? 'bg-green-500' : 'bg-gray-200'}`} />
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${mappingConfirmed ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className={`text-sm ${!mappingConfirmed ? 'text-primary-600 font-medium' : 'text-gray-500'}`}>Map Columns</span>
                      <span className={`text-sm ${mappingConfirmed ? 'text-primary-600 font-medium' : 'text-gray-500'}`}>Review & Send</span>
                    </div>
                  </div>
                )}

                {/* File Upload */}
                {rawData.length === 0 && (
                  <>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <h3 className="text-sm font-medium text-blue-900">File Requirements</h3>
                          <p className="text-sm text-blue-700 mt-1">
                            Your file should contain columns for email, first name, and last name.
                            You'll be able to map your columns in the next step.
                          </p>
                          <p className="text-xs text-blue-600 mt-2">Supported formats: .csv, .xlsx, .xls</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-400 transition-colors">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-gray-600 mb-2">Drag and drop your file here, or</p>
                      <label className="inline-block">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <span className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 cursor-pointer font-medium transition-colors">
                          Browse Files
                        </span>
                      </label>
                    </div>
                  </>
                )}

                {/* Column Mapping Step */}
                {rawData.length > 0 && !mappingConfirmed && (
                  <>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Map Your Columns</h3>
                          <p className="text-sm text-gray-500 mt-1">File: {fileName} ({rawData.length} rows)</p>
                        </div>
                        <button type="button" onClick={clearBulkData} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Change File
                        </button>
                      </div>

                      <p className="text-sm text-gray-600 mb-4">
                        Match each required field to a column from your file. We've tried to auto-detect the columns.
                      </p>

                      <div className="space-y-4">
                        {/* Email Mapping */}
                        <div className="grid grid-cols-2 gap-4 items-center">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Email Address <span className="text-red-500">*</span></label>
                            <p className="text-xs text-gray-500">Delegate's email</p>
                          </div>
                          <select
                            value={columnMapping.email}
                            onChange={(e) => handleMappingChange('email', e.target.value)}
                            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${columnMapping.email ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}
                          >
                            <option value="">-- Select Column --</option>
                            {getUnmappedColumns('email').map((col) => <option key={col} value={col}>{col}</option>)}
                            {columnMapping.email && <option value={columnMapping.email}>{columnMapping.email}</option>}
                          </select>
                        </div>

                        {/* First Name Mapping */}
                        <div className="grid grid-cols-2 gap-4 items-center">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">First Name <span className="text-red-500">*</span></label>
                            <p className="text-xs text-gray-500">Delegate's first name</p>
                          </div>
                          <select
                            value={columnMapping.firstName}
                            onChange={(e) => handleMappingChange('firstName', e.target.value)}
                            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${columnMapping.firstName ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}
                          >
                            <option value="">-- Select Column --</option>
                            {getUnmappedColumns('firstName').map((col) => <option key={col} value={col}>{col}</option>)}
                            {columnMapping.firstName && <option value={columnMapping.firstName}>{columnMapping.firstName}</option>}
                          </select>
                        </div>

                        {/* Last Name Mapping */}
                        <div className="grid grid-cols-2 gap-4 items-center">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Last Name <span className="text-red-500">*</span></label>
                            <p className="text-xs text-gray-500">Delegate's last name</p>
                          </div>
                          <select
                            value={columnMapping.lastName}
                            onChange={(e) => handleMappingChange('lastName', e.target.value)}
                            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${columnMapping.lastName ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}
                          >
                            <option value="">-- Select Column --</option>
                            {getUnmappedColumns('lastName').map((col) => <option key={col} value={col}>{col}</option>)}
                            {columnMapping.lastName && <option value={columnMapping.lastName}>{columnMapping.lastName}</option>}
                          </select>
                        </div>
                      </div>

                      {/* Sample Preview */}
                      {isMappingComplete() && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Sample Preview (first 3 rows)</h4>
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="px-3 py-2 text-left font-medium text-gray-600 rounded-l-lg">Email</th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-600">First Name</th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-600 rounded-r-lg">Last Name</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {rawData.slice(0, 3).map((row, index) => (
                                  <tr key={index}>
                                    <td className="px-3 py-2 text-gray-900">{row[columnMapping.email] || '-'}</td>
                                    <td className="px-3 py-2 text-gray-900">{row[columnMapping.firstName] || '-'}</td>
                                    <td className="px-3 py-2 text-gray-900">{row[columnMapping.lastName] || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={confirmMapping}
                        disabled={!isMappingComplete()}
                        className="px-6 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        Continue to Review
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <button type="button" onClick={clearBulkData} className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                        Cancel
                      </button>
                    </div>
                  </>
                )}

                {/* Review & Send Step */}
                {mappingConfirmed && (
                  <>
                    {parsedData.length > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">Review Delegates ({parsedData.length})</h3>
                          <button type="button" onClick={resetMapping} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to Column Mapping
                          </button>
                        </div>
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                          <div className="max-h-64 overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">First Name</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Name</th>
                                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {parsedData.map((row, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-900">{row.email}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{row.firstName}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{row.lastName}</td>
                                    <td className="px-4 py-3 text-sm text-right">
                                      <button type="button" onClick={() => handleRemoveRow(index)} className="text-red-500 hover:text-red-700">Remove</button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Progress Bar */}
                    {loading && bulkProgress.total > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Sending invitations...</span>
                          <span className="text-sm text-gray-500">{bulkProgress.current} / {bulkProgress.total}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-primary-500 h-2 rounded-full transition-all duration-300" style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }} />
                        </div>
                      </div>
                    )}

                    {/* Results Table */}
                    {bulkResults.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Results</h3>
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                          <div className="max-h-64 overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {bulkResults.map((result, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-900">{result.email}</td>
                                    <td className="px-4 py-3 text-sm">
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {result.success ? 'Success' : 'Failed'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{result.message}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={handleBulkInvite}
                        disabled={loading || parsedData.length === 0}
                        className="px-6 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {loading ? (
                          <>
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Sending ({bulkProgress.current}/{bulkProgress.total})...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            Send {parsedData.length} Invitation{parsedData.length !== 1 ? 's' : ''}
                          </>
                        )}
                      </button>
                      <button type="button" onClick={resetMapping} disabled={loading} className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50">
                        Back
                      </button>
                      <Link href="/dashboard" className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                        Cancel
                      </Link>
                    </div>
                  </>
                )}

                {rawData.length === 0 && (
                  <div className="flex gap-3 pt-4">
                    <Link href="/dashboard" className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                      Cancel
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">About Delegate Invitations</h3>
              <ul className="mt-2 text-sm text-gray-600 space-y-1">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Each delegate will receive an invitation email
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  They can complete registration using the link in the email
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
