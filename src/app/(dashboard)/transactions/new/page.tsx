import NewTransactionForm from './_components/NewTransactionForm'

export const metadata = { title: 'Tambah Transaksi — N-Cash' }

export default function NewTransactionPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tambah Transaksi</h1>
        <p className="text-sm text-gray-500 mt-1">Input transaksi baru per nota/faktur</p>
      </div>
      <NewTransactionForm />
    </div>
  )
}
