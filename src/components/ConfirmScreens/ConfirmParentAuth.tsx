interface ConfirmParentAuthProps {
  payload: {
    child_name?: string
    child_email?: string
  }
}

export default function ConfirmParentAuth({ payload }: ConfirmParentAuthProps) {
  return (
    <div className="text-center space-y-4">
      <div className="bg-teal/10 rounded-xl p-4">
        <p className="text-4xl mb-2">&#128106;</p>
        <p className="text-lg font-medium text-teal">Autorizacao de Responsavel</p>
      </div>
      <div>
        <p className="text-gray-700">Autorizar uso da plataforma por</p>
        <p className="font-bold text-gray-900 text-lg">{payload.child_name || 'Crianca'}</p>
        {payload.child_email && (
          <p className="text-gray-500 text-sm">{payload.child_email}</p>
        )}
      </div>
    </div>
  )
}
