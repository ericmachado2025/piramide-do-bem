interface ConfirmRewardRedeemProps {
  payload: {
    reward_name?: string
    amount?: number
    sponsor_name?: string
  }
}

export default function ConfirmRewardRedeem({ payload }: ConfirmRewardRedeemProps) {
  return (
    <div className="text-center space-y-4">
      <div className="bg-purple-50 rounded-xl p-4">
        <p className="text-2xl font-bold text-purple-700">{payload.reward_name || 'Recompensa'}</p>
        {payload.sponsor_name && (
          <p className="text-sm text-gray-500">por {payload.sponsor_name}</p>
        )}
      </div>
      <div className="bg-gray-50 rounded-xl p-3">
        <p className="text-sm text-gray-600">Custo</p>
        <p className="text-xl font-bold text-gray-800">{payload.amount || 0} creditos</p>
      </div>
      <p className="text-xs text-gray-400">
        Ao aprovar, os creditos serao debitados do seu saldo.
      </p>
    </div>
  )
}
