export default function ConfirmDeleteAccount() {
  return (
    <div className="text-center space-y-4">
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
        <p className="text-4xl mb-2">&#9888;&#65039;</p>
        <p className="text-lg font-bold text-red-700">Excluir conta permanentemente</p>
      </div>
      <div className="text-left space-y-2 text-sm text-gray-600">
        <p>Ao confirmar, voce perdera:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Todos os seus pontos e creditos</li>
          <li>Historico de acoes e conquistas</li>
          <li>Conexoes de amizade</li>
          <li>Dados do perfil</li>
        </ul>
      </div>
      <p className="text-xs text-red-500 font-medium">
        Esta acao nao pode ser desfeita.
      </p>
    </div>
  )
}
