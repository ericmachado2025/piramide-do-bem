interface ConfirmLoginWebProps {
  payload: {
    session_hint?: string
    device_info?: string
  }
}

export default function ConfirmLoginWeb({ payload }: ConfirmLoginWebProps) {
  return (
    <div className="text-center space-y-4">
      <div className="bg-blue-50 rounded-xl p-4">
        <p className="text-4xl mb-2">&#128187;</p>
        <p className="text-lg font-medium text-blue-800">
          {payload.session_hint || 'Navegador desconhecido'}
        </p>
      </div>
      <div>
        <p className="text-gray-700">
          Confirmar login no computador com sua conta?
        </p>
        <p className="text-xs text-red-500 mt-2 font-medium">
          So aprove se foi voce que iniciou o login.
        </p>
      </div>
    </div>
  )
}
