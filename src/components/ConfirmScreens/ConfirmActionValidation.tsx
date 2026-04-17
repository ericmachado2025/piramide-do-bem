interface ConfirmActionValidationProps {
  payload: {
    author_name?: string
    action_description?: string
    points?: number
  }
}

export default function ConfirmActionValidation({ payload }: ConfirmActionValidationProps) {
  return (
    <div className="text-center space-y-4">
      <div className="bg-blue-50 rounded-xl p-4">
        <p className="text-lg font-medium text-blue-800">
          {payload.action_description || 'Acao registrada'}
        </p>
      </div>
      <div>
        <p className="text-gray-700">Registrada por</p>
        <p className="font-bold text-gray-900">{payload.author_name || 'Aluno'}</p>
      </div>
      {payload.points && (
        <p className="text-sm text-gray-500">+{payload.points} pontos apos validacao</p>
      )}
    </div>
  )
}
