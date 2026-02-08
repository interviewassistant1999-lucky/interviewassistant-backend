'use client'

import { useState, useRef, useCallback } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import { useAuth } from '@/hooks/useAuth'

export function ResumeUpload() {
  const { resumeParsedText, setResumeFile, setResumeParsedText, setContext } = useSessionStore()
  const { fetchWithAuth } = useAuth()
  const [mode, setMode] = useState<'upload' | 'paste'>(resumeParsedText ? 'paste' : 'upload')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = useCallback(async (file: File) => {
    setUploadError(null)

    // Validate file type
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !['pdf', 'docx'].includes(ext)) {
      setUploadError('Please upload a PDF or DOCX file.')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be under 5MB.')
      return
    }

    setUploading(true)
    setFileName(file.name)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetchWithAuth('/api/interview-prep/parse-resume', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || 'Failed to parse resume')
      }

      const data = await response.json()
      setResumeFile(file)
      setResumeParsedText(data.text)
      setContext({ resume: data.text })
      setMode('paste') // Switch to show parsed text
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload resume')
    } finally {
      setUploading(false)
    }
  }, [fetchWithAuth, setResumeFile, setResumeParsedText, setContext])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }, [handleFileUpload])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
  }, [handleFileUpload])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-text-primary">Resume</label>
        <div className="flex gap-1 bg-bg-tertiary rounded-lg p-0.5">
          <button
            onClick={() => setMode('upload')}
            className={`px-3 py-1 text-xs rounded-md transition-all ${
              mode === 'upload' ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Upload
          </button>
          <button
            onClick={() => setMode('paste')}
            className={`px-3 py-1 text-xs rounded-md transition-all ${
              mode === 'paste' ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Paste
          </button>
        </div>
      </div>

      {mode === 'upload' ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
            ${uploading ? 'border-accent-blue/50 bg-accent-blue/5' : 'border-border hover:border-accent-blue/50 bg-bg-tertiary'}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            onChange={handleInputChange}
            className="hidden"
          />
          {uploading ? (
            <div className="text-accent-blue">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2" />
              <p className="text-sm">Parsing {fileName}...</p>
            </div>
          ) : fileName && resumeParsedText ? (
            <div className="text-accent-green">
              <p className="text-sm font-medium">{fileName}</p>
              <p className="text-xs text-text-secondary mt-1">
                {resumeParsedText.length} characters extracted. Click to upload a different file.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-text-secondary text-sm mb-1">
                Drop your resume here or click to browse
              </p>
              <p className="text-text-secondary text-xs">PDF or DOCX, max 5MB</p>
            </div>
          )}
        </div>
      ) : (
        <textarea
          value={resumeParsedText}
          onChange={(e) => {
            setResumeParsedText(e.target.value)
            setContext({ resume: e.target.value })
          }}
          placeholder="Paste your resume text here..."
          rows={6}
          className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent-blue resize-y text-sm"
        />
      )}

      {uploadError && (
        <p className="text-accent-red text-sm">{uploadError}</p>
      )}
    </div>
  )
}
