interface ConfirmTransferProps {
  payload: {
    amount?: number
    sender_name?: string
    sender_email?: string
    counterparty_name?: string
    counterparty_email?: string
    direction?: string
  }
}

export default function ConfirmTransfer({ payload }: ConfirmTransferProps) {
  const amount = payload.amount || 0
  const name = payload.sender_name || payload.counterparty_name || 'Alguem'
  const email = payload.sender_email || payload.counterparty_email || ''

  return (
    <div className="text-center space-y-4">
      <div className="bg-teal/10 rounded-xl p-4">
        <p className="text-3xl font-bold text-teal">{amount}</p>
        <p className="text-sm text-gray-500">creditos</p>
      </div>
      <div>
        <p className="text-gray-700">
          Receber transferencia de
        </p>
        <p className="font-bold text-gray-900 text-lg">{name}</p>
        {email && <p className="text-gray-500 text-sm">{email}</p>}
      </div>
      <p className="text-xs text-gray-400">
        Ao aprovar, os creditos serao adicionados ao seu saldo.
      </p>
    </div>
  )
}
