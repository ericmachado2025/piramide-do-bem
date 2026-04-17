interface ConfirmProfileChangeProps {
  payload: {
    field?: string
    old_value?: string
    new_value?: string
  }
}

export default function ConfirmProfileChange({ payload }: ConfirmProfileChangeProps) {
  return (
    <div className="text-center space-y-4">
      <div className="bg-yellow-50 rounded-xl p-4">
        <p className="text-lg font-medium text-yellow-800">Alteracao de perfil</p>
        <p className="text-sm text-gray-600 mt-1">Campo: {payload.field || 'dado'}</p>
      </div>
      <div className="space-y-2">
        <div className="bg-red-50 rounded-lg p-2">
          <p className="text-xs text-gray-500">De</p>
          <p className="text-sm font-medium text-red-700">{payload.old_value || '-'}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-2">
          <p className="text-xs text-gray-500">Para</p>
          <p className="text-sm font-medium text-green-700">{payload.new_value || '-'}</p>
        </div>
      </div>
    </div>
  )
}
