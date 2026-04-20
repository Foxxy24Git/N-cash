'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { upsertCompany } from '../_actions/companyActions'

interface CompanyProfile {
  name: string
  address: string
  phone: string | null
  logoUrl: string | null
}

export default function CompanyTab({ profile }: { profile: CompanyProfile | null }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(profile?.logoUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal upload')
      setLogoUrl(data.url)
      toast.success('Logo berhasil diupload')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal upload logo')
    } finally {
      setUploading(false)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await upsertCompany({
        name: fd.get('name') as string,
        address: fd.get('address') as string,
        phone: fd.get('phone') as string,
        logoUrl,
      })
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Informasi perusahaan berhasil disimpan')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium text-gray-700">
          Nama Perusahaan <span className="text-red-500">*</span>
        </label>
        <Input id="name" name="name" defaultValue={profile?.name ?? ''} required />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="address" className="text-sm font-medium text-gray-700">
          Alamat <span className="text-red-500">*</span>
        </label>
        <textarea
          id="address"
          name="address"
          rows={3}
          defaultValue={profile?.address ?? ''}
          required
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="phone" className="text-sm font-medium text-gray-700">
          No. Telepon
        </label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={profile?.phone ?? ''}
          placeholder="Opsional"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">Logo Perusahaan</label>
        {logoUrl && (
          <div className="mb-2 p-2 border border-gray-200 rounded-lg inline-block">
            <Image
              src={logoUrl}
              alt="Logo perusahaan"
              width={120}
              height={60}
              className="object-contain"
            />
          </div>
        )}
        <Input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleLogoChange}
          disabled={uploading}
          className="cursor-pointer"
        />
        <p className="text-xs text-gray-400">
          {uploading ? 'Mengupload...' : 'JPEG, PNG, atau WebP. Maks 2MB.'}
        </p>
      </div>

      <Button type="submit" disabled={isPending || uploading}>
        {isPending ? 'Menyimpan...' : 'Simpan'}
      </Button>
    </form>
  )
}
