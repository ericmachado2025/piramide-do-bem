interface ConfirmPhoneVerifyProps {
  payload: {
    phone?: string
  }
}

export default function ConfirmPhoneVerify({ payload }: ConfirmPhoneVerifyProps) {
  return (
    <div className="text-center space-y-4">
      <div className="bg-green-50 rounded-xl p-4">
        <p className="text-4xl mb-2">&#128241;</p>
        <p className="text-lg font-medium text-green-700">Verificar WhatsApp</p>
      </div>
      <div>
        <p className="text-gray-700">Confirmar que este e seu numero:</p>
        <p className="font-bold text-gray-900 text-xl mt-2">{payload.phone || '-'}</p>
      </div>
    </div>
  )
}
