'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ImportError {
  row: number
  name: string
  reason: string
}

interface ImportResult {
  imported: number
  updated: number
  skipped: number
  errors: ImportError[]
}

type Phase = 'idle' | 'loading' | 'done'

export function ImportDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [mode, setMode] = useState<'add_new' | 'upsert'>('add_new')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function resetState() {
    setPhase('idle')
    setMode('add_new')
    setFile(null)
    setFileError(null)
    setResult(null)
    setApiError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetState()
    setOpen(next)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFileError(null)
    if (!f) { setFile(null); return }
    if (f.size > 5 * 1024 * 1024) {
      setFileError('Ukuran file maksimal 5MB')
      setFile(null)
      e.target.value = ''
      return
    }
    setFile(f)
  }

  async function handleDownloadTemplate() {
    const res = await fetch('/api/stock/template')
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Template-Import-Stok-NCash.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport() {
    if (!file) return
    setPhase('loading')
    setApiError(null)

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('mode', mode)

      const res = await fetch('/api/stock/import', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setApiError(data.error ?? 'Terjadi kesalahan, coba lagi')
        setPhase('idle')
        return
      }

      setResult(data)
      setPhase('done')
    } catch {
      setApiError('Terjadi kesalahan jaringan, coba lagi')
      setPhase('idle')
    }
  }

  function handleClose() {
    setOpen(false)
    resetState()
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
          📥 Import Excel
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Stok dari Excel</DialogTitle>
        </DialogHeader>

        {phase === 'idle' && (
          <div className="space-y-5 mt-2">
            {/* Download template */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 flex items-center justify-between gap-3">
              <p className="text-sm text-blue-800">
                Belum punya template? Download dulu.
              </p>
              <button
                onClick={handleDownloadTemplate}
                className="shrink-0 text-sm font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900"
              >
                📤 Download Template
              </button>
            </div>

            {/* File input */}
            <div className="space-y-1">
              <label className="text-sm font-medium">
                File Excel <span className="text-red-500">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-gray-200 file:text-sm file:font-medium file:bg-white file:text-gray-700 hover:file:bg-gray-50 cursor-pointer"
              />
              {fileError && (
                <p className="text-xs text-red-600">{fileError}</p>
              )}
              {file && (
                <p className="text-xs text-gray-500">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>
              )}
            </div>

            {/* Mode */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Mode Import</label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="import-mode"
                    value="add_new"
                    checked={mode === 'add_new'}
                    onChange={() => setMode('add_new')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium">Tambah Baru</span>
                    <p className="text-xs text-gray-500">Lewati barang yang namanya sudah ada. Aman untuk penambahan data baru.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="import-mode"
                    value="upsert"
                    checked={mode === 'upsert'}
                    onChange={() => setMode('upsert')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium">Update & Tambah</span>
                    <p className="text-xs text-gray-500">Perbarui barang yang sudah ada, tambahkan yang baru.</p>
                  </div>
                </label>
              </div>
            </div>

            {apiError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                {apiError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Batal
              </Button>
              <Button onClick={handleImport} disabled={!file}>
                Mulai Import
              </Button>
            </div>
          </div>
        )}

        {phase === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-600">Memproses...</p>
          </div>
        )}

        {phase === 'done' && result && (
          <div className="space-y-5 mt-2">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-3 text-center">
                <p className="text-2xl font-bold text-green-700">{result.imported}</p>
                <p className="text-xs text-green-600 mt-0.5">Diimpor</p>
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{result.updated}</p>
                <p className="text-xs text-blue-600 mt-0.5">Diperbarui</p>
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-3 text-center">
                <p className="text-2xl font-bold text-gray-700">{result.skipped}</p>
                <p className="text-xs text-gray-600 mt-0.5">Dilewati</p>
              </div>
            </div>

            {/* Error table */}
            {result.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-700">
                  {result.errors.length} baris gagal diimpor:
                </p>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-red-200">
                  <table className="w-full text-xs">
                    <thead className="bg-red-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-red-700 w-16">Baris</th>
                        <th className="text-left px-3 py-2 font-medium text-red-700">Nama</th>
                        <th className="text-left px-3 py-2 font-medium text-red-700">Alasan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100">
                      {result.errors.map((err, i) => (
                        <tr key={i} className="bg-white">
                          <td className="px-3 py-2 text-gray-500">{err.row}</td>
                          <td className="px-3 py-2 text-gray-800">{err.name || '—'}</td>
                          <td className="px-3 py-2 text-red-600">{err.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleClose}>Tutup</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
