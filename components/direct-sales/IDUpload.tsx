'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface IDUploadProps {
  leadId: string
  existingUrl?: string | null
  onUpload: (url: string) => void
}

export default function IDUpload({ leadId, existingUrl, onUpload }: IDUploadProps) {
  const [frontUrl, setFrontUrl] = useState<string | null>(
    existingUrl ? `${existingUrl}_front` : null
  )
  const [backUrl, setBackUrl] = useState<string | null>(
    existingUrl ? `${existingUrl}_back` : null
  )
  const [uploadingFront, setUploadingFront] = useState(false)
  const [uploadingBack, setUploadingBack] = useState(false)

  const frontRef = useRef<HTMLInputElement>(null)
  const backRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function uploadFile(
    file: File,
    side: 'front' | 'back',
    setUploading: (v: boolean) => void,
    setUrl: (url: string) => void
  ) {
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `ids/${leadId}/${side}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('id-documents')
        .upload(path, file, { upsert: true })

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`)
        return
      }

      const { data: urlData } = supabase.storage.from('id-documents').getPublicUrl(path)
      const publicUrl = urlData.publicUrl
      setUrl(publicUrl)
      onUpload(publicUrl)
      toast.success(`ID ${side} uploaded`)
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    side: 'front' | 'back',
    setUploading: (v: boolean) => void,
    setUrl: (url: string) => void
  ) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10MB)')
      return
    }
    uploadFile(file, side, setUploading, setUrl)
  }

  return (
    <div>
      <p className="text-xs text-[#9CA3AF] mb-3">Upload Customer National ID (front & back)</p>
      <div className="grid grid-cols-2 gap-3">
        {/* Front */}
        <div>
          <p className="text-xs text-[#6B7280] mb-1.5">Front</p>
          {frontUrl ? (
            <div className="relative">
              <img
                src={frontUrl}
                alt="ID Front"
                className="w-full h-32 object-cover rounded-lg border border-[#2a2a2a]"
              />
              <button
                onClick={() => frontRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg opacity-0 hover:opacity-100 transition-opacity text-white text-xs"
              >
                Replace
              </button>
            </div>
          ) : (
            <button
              onClick={() => frontRef.current?.click()}
              disabled={uploadingFront}
              className="w-full h-32 border-2 border-dashed border-[#2a2a2a] hover:border-[#14B8A6] rounded-lg flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {uploadingFront ? (
                <svg className="animate-spin h-5 w-5 text-[#14B8A6]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <>
                  <span className="text-2xl">🪪</span>
                  <span className="text-xs text-[#6B7280]">Upload front</span>
                </>
              )}
            </button>
          )}
          <input
            ref={frontRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) =>
              handleFileChange(e, 'front', setUploadingFront, setFrontUrl)
            }
          />
        </div>

        {/* Back */}
        <div>
          <p className="text-xs text-[#6B7280] mb-1.5">Back</p>
          {backUrl ? (
            <div className="relative">
              <img
                src={backUrl}
                alt="ID Back"
                className="w-full h-32 object-cover rounded-lg border border-[#2a2a2a]"
              />
              <button
                onClick={() => backRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg opacity-0 hover:opacity-100 transition-opacity text-white text-xs"
              >
                Replace
              </button>
            </div>
          ) : (
            <button
              onClick={() => backRef.current?.click()}
              disabled={uploadingBack}
              className="w-full h-32 border-2 border-dashed border-[#2a2a2a] hover:border-[#14B8A6] rounded-lg flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {uploadingBack ? (
                <svg className="animate-spin h-5 w-5 text-[#14B8A6]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <>
                  <span className="text-2xl">🪪</span>
                  <span className="text-xs text-[#6B7280]">Upload back</span>
                </>
              )}
            </button>
          )}
          <input
            ref={backRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) =>
              handleFileChange(e, 'back', setUploadingBack, setBackUrl)
            }
          />
        </div>
      </div>

      {frontUrl && backUrl && (
        <p className="text-xs text-[#22C55E] mt-2 flex items-center gap-1">
          <span>✅</span> Both sides uploaded
        </p>
      )}
    </div>
  )
}
