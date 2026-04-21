'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Bank {
  id: string
  name: string
}

interface Props {
  invoiceId: string
  invoiceDate: string
  open: boolean
  onClose: () => void
}

const METHODS = [
  { value: 'CASH',          label: 'Cash' },
  { value: 'CASH_COD',      label: 'Cash COD' },
  { value: 'QRIS',          label: 'QRIS' },
  { value: 'BANK_TRANSFER', label: 'Transfer Bank' },
] as const

type MethodValue = typeof METHODS[number]['value']

function todayJakarta(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
}

function minDate(invoiceDate: string): string {
  return new Date(invoiceDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
}

export default function LunasiDialog({ invoiceId, invoiceDate, open, onClose }: Props) {
  const router = useRouter()
  const [paidAt, setPaidAt]         = useState(todayJakarta())
  const [method, setMethod]         = useState<MethodValue>('CASH')
  const [banks, setBanks]           = useState<Bank[]>([])
  const [bankId, setBankId]         = useState('')
  const [notes, setNotes]           = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setPaidAt(todayJakarta())
    setMethod('CASH')
    setBankId('')
    setNotes('')
  }, [open])

  useEffect(() => {
    if (method !== 'BANK_TRANSFER') return
    fetch('/api/banks')
      .then((r) => r.json())
      .then((data: Bank[]) => setBanks(data))
      .catch(() => setBanks([]))
  }, [method])

  const minDateStr = minDate(invoiceDate)

  function validate(): string | null {
    if (paidAt < minDateStr) return 'Tanggal pelunasan tidak boleh sebelum tanggal transaksi'
    if (method === 'BANK_TRANSFER' && !bankId) return 'Pilih bank untuk metode Transfer Bank'
    return null
  }

  async function handleSubmit() {
    const err = validate()
    if (err) { toast.error(err); return }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paidMethod: method,
          paidBankId: method === 'BANK_TRANSFER' ? bankId : undefined,
          paidAt,
          notes: notes.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error ?? 'Gagal melunasi BON')
        return
      }
      toast.success('✅ BON berhasil dilunasi')
      onClose()
      router.refresh()
    } catch {
      toast.error('Terjadi kesalahan. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Lunasi BON</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Tanggal Pelunasan */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Tanggal Pelunasan</label>
            <input
              type="date"
              value={paidAt}
              min={minDateStr}
              onChange={(e) => setPaidAt(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Metode Pembayaran */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Metode Pembayaran</label>
            <div className="grid grid-cols-2 gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => { setMethod(m.value); setBankId('') }}
                  className={[
                    'px-3 py-2 text-sm rounded-lg border font-medium transition-colors',
                    method === m.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
                  ].join(' ')}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pilih Bank (conditional) */}
          {method === 'BANK_TRANSFER' && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Pilih Bank</label>
              <select
                value={bankId}
                onChange={(e) => setBankId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Pilih Bank --</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Catatan */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Catatan (opsional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Catatan tambahan..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Memproses...' : 'Konfirmasi Pelunasan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
