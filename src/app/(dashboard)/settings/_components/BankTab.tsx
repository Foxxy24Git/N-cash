import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import BankDialog from './BankDialog'
import DeleteBankButton from './DeleteBankButton'

interface Bank {
  id: string
  name: string
  accountNumber: string | null
  accountHolder: string | null
}

export default function BankTab({ banks }: { banks: Bank[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-gray-900">Daftar Bank Transfer</h2>
        <BankDialog
          trigger={
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Tambah Bank
            </Button>
          }
        />
      </div>

      {banks.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Belum ada bank terdaftar. Tambah bank untuk digunakan pada transaksi Transfer Bank.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Bank</TableHead>
              <TableHead>No. Rekening</TableHead>
              <TableHead>Atas Nama</TableHead>
              <TableHead className="w-28 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banks.map((bank) => (
              <TableRow key={bank.id}>
                <TableCell className="font-medium">{bank.name}</TableCell>
                <TableCell className="text-gray-600">{bank.accountNumber ?? '—'}</TableCell>
                <TableCell className="text-gray-600">{bank.accountHolder ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <BankDialog
                      bank={bank}
                      trigger={
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      }
                    />
                    <DeleteBankButton id={bank.id} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
