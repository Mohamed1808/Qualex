'use client'

import { useState, useRef } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { createLead } from '@/actions/leads'
import type { LeadChannel } from '@/types/database'

interface ImportRow {
  name: string
  phone: string
  channel: LeadChannel
  requested_car_brand?: string
  requested_car_year?: number
  source_campaign?: string
}

interface ImportResult {
  row: number
  name: string
  status: 'success' | 'duplicate' | 'error'
  message?: string
}

const VALID_CHANNELS: LeadChannel[] = ['whatsapp', 'meta', 'website', 'app', 'call_center']

function normalizeChannel(raw: string): LeadChannel {
  const map: Record<string, LeadChannel> = {
    whatsapp: 'whatsapp',
    meta: 'meta',
    'meta ads': 'meta',
    facebook: 'meta',
    website: 'website',
    web: 'website',
    app: 'app',
    'mobile app': 'app',
    call_center: 'call_center',
    'call center': 'call_center',
    callcenter: 'call_center',
    phone: 'call_center',
  }
  return map[raw.toLowerCase().trim()] ?? 'call_center'
}

function parseRows(raw: Record<string, string>[]): ImportRow[] {
  return raw
    .filter((r) => r.name || r.Name || r.NAME)
    .map((r) => {
      const get = (...keys: string[]) =>
        keys.map((k) => r[k] ?? r[k.toLowerCase()] ?? r[k.toUpperCase()] ?? '').find(Boolean) ?? ''

      const yearStr = get('requested_car_year', 'car_year', 'year', 'Car Year')
      const year = yearStr ? parseInt(yearStr, 10) : undefined

      return {
        name: get('name', 'Name', 'full_name', 'Full Name', 'customer_name', 'Customer Name'),
        phone: get('phone', 'Phone', 'mobile', 'Mobile', 'phone_number', 'Phone Number'),
        channel: normalizeChannel(get('channel', 'Channel', 'source', 'Source') || 'call_center'),
        requested_car_brand: get('requested_car_brand', 'car_brand', 'Car Brand', 'brand', 'Brand') || undefined,
        requested_car_year: year && !isNaN(year) ? year : undefined,
        source_campaign: get('source_campaign', 'campaign', 'Campaign', 'utm_campaign') || undefined,
      }
    })
    .filter((r) => r.name && r.phone)
}

export default function LeadImport() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<ImportResult[]>([])
  const [isDragging, setIsDragging] = useState(false)

  function handleFile(file: File) {
    setResults([])
    setFileName(file.name)

    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
          const parsed = parseRows(res.data as Record<string, string>[])
          setRows(parsed)
          toast.info(`${parsed.length} leads detected in file`)
        },
        error: () => toast.error('Failed to parse CSV file'),
      })
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: 'binary' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
          const parsed = parseRows(data)
          setRows(parsed)
          toast.info(`${parsed.length} leads detected in file`)
        } catch {
          toast.error('Failed to parse Excel file')
        }
      }
      reader.readAsBinaryString(file)
    } else {
      toast.error('Please upload a CSV or Excel (.xlsx) file')
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  async function startImport() {
    if (rows.length === 0) return
    setImporting(true)
    setResults([])
    const newResults: ImportResult[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        const result = await createLead({
          name: row.name,
          phone: row.phone,
          channel: row.channel,
          requested_car_brand: row.requested_car_brand,
          requested_car_year: row.requested_car_year,
          source_campaign: row.source_campaign,
        })

        if (result.error) {
          newResults.push({ row: i + 1, name: row.name, status: 'error', message: result.error })
        } else if (result.data && (result.data as { is_duplicate?: boolean }).is_duplicate) {
          newResults.push({ row: i + 1, name: row.name, status: 'duplicate' })
        } else {
          newResults.push({ row: i + 1, name: row.name, status: 'success' })
        }
      } catch {
        newResults.push({ row: i + 1, name: row.name, status: 'error', message: 'Unexpected error' })
      }

      // Update results progressively
      setResults([...newResults])
    }

    const success = newResults.filter((r) => r.status === 'success').length
    const duplicates = newResults.filter((r) => r.status === 'duplicate').length
    const errors = newResults.filter((r) => r.status === 'error').length

    toast.success(`Import complete: ${success} created, ${duplicates} duplicates, ${errors} errors`)
    setImporting(false)
    setRows([])
    setFileName('')
    if (fileRef.current) fileRef.current.value = ''
    router.refresh()
  }

  function reset() {
    setRows([])
    setFileName('')
    setResults([])
    if (fileRef.current) fileRef.current.value = ''
  }

  const successCount = results.filter((r) => r.status === 'success').length
  const dupCount = results.filter((r) => r.status === 'duplicate').length
  const errorCount = results.filter((r) => r.status === 'error').length

  return (
    <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Import Leads from File</h2>
          <p className="text-xs text-[#6B7280] mt-0.5">CSV or Excel (.xlsx) — columns: name, phone, channel, car_brand, car_year, campaign</p>
        </div>
        {/* Download template */}
        <button
          onClick={() => {
            const csv = 'name,phone,channel,requested_car_brand,requested_car_year,source_campaign\nAhmed Mohamed,01012345678,whatsapp,Toyota,2024,Summer2025\n'
            const blob = new Blob([csv], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'qualex_leads_template.csv'
            a.click()
            URL.revokeObjectURL(url)
          }}
          className="text-xs text-[#3B82F6] hover:text-[#60A5FA] transition-colors flex items-center gap-1"
        >
          ⬇ Download Template
        </button>
      </div>

      {/* Drop zone */}
      {rows.length === 0 && results.length === 0 && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-[#3B82F6] bg-[#3B82F6]/5'
              : 'border-[#2a2a2a] hover:border-[#3B82F6]/50 hover:bg-[#1c1c22]'
          }`}
        >
          <div className="text-3xl mb-2">📂</div>
          <p className="text-sm text-white font-medium">Drop your file here or click to browse</p>
          <p className="text-xs text-[#6B7280] mt-1">CSV or Excel (.xlsx / .xls)</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={onFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* Preview table */}
      {rows.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[#9CA3AF]">
              <span className="text-white font-medium">{rows.length} leads</span> ready to import from <span className="text-[#3B82F6]">{fileName}</span>
            </p>
            <button onClick={reset} className="text-xs text-[#6B7280] hover:text-white transition-colors">✕ Clear</button>
          </div>

          <div className="bg-[#1c1c22] rounded-lg overflow-hidden mb-4 max-h-48 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#1c1c22]">
                <tr className="border-b border-[#2a2a2a]">
                  {['#', 'Name', 'Phone', 'Channel', 'Car Brand', 'Year'].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-[#6B7280] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-[#2a2a2a] last:border-0">
                    <td className="px-3 py-2 text-[#4B5563]">{i + 1}</td>
                    <td className="px-3 py-2 text-white">{r.name}</td>
                    <td className="px-3 py-2 text-[#9CA3AF] font-mono">{r.phone}</td>
                    <td className="px-3 py-2">
                      <span className="bg-[#2a2a2a] text-[#9CA3AF] px-1.5 py-0.5 rounded text-[10px]">{r.channel}</span>
                    </td>
                    <td className="px-3 py-2 text-[#9CA3AF]">{r.requested_car_brand ?? '—'}</td>
                    <td className="px-3 py-2 text-[#9CA3AF]">{r.requested_car_year ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={startImport}
            disabled={importing}
            className="w-full bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 text-white font-semibold text-sm rounded-lg py-3 transition-colors"
          >
            {importing ? `Importing… (${results.length}/${rows.length})` : `⬆ Import ${rows.length} Leads`}
          </button>
        </div>
      )}

      {/* Progress bar while importing */}
      {importing && rows.length > 0 && (
        <div className="mt-3">
          <div className="w-full bg-[#2a2a2a] rounded-full h-1.5">
            <div
              className="bg-[#3B82F6] h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(results.length / (rows.length + results.length)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Results summary */}
      {results.length > 0 && !importing && (
        <div>
          <div className="flex items-center gap-4 mb-3 p-3 bg-[#1c1c22] rounded-lg">
            <span className="text-xs text-[#22C55E] font-medium">✓ {successCount} created</span>
            <span className="text-xs text-[#F59E0B] font-medium">⚠ {dupCount} duplicates</span>
            {errorCount > 0 && <span className="text-xs text-[#F26161] font-medium">✕ {errorCount} errors</span>}
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {results.filter((r) => r.status !== 'success').map((r, i) => (
              <div key={i} className={`text-xs px-3 py-1.5 rounded flex items-center gap-2 ${
                r.status === 'duplicate' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' : 'bg-[#F26161]/10 text-[#F26161]'
              }`}>
                <span>Row {r.row} — {r.name}:</span>
                <span>{r.status === 'duplicate' ? 'Already exists (duplicate)' : r.message}</span>
              </div>
            ))}
          </div>
          <button
            onClick={reset}
            className="mt-3 w-full border border-[#2a2a2a] text-[#9CA3AF] hover:text-white text-sm rounded-lg py-2 transition-colors"
          >
            Import Another File
          </button>
        </div>
      )}
    </div>
  )
}
