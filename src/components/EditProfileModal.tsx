import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Field {
  key: string
  label: string
  value: string
  type?: string
  placeholder?: string
}

interface Props {
  userId: string
  tableName: string
  recordId: string
  fields: Field[]
  onClose: () => void
  onSaved: (updated: Record<string, string>) => void
}

export default function EditProfileModal({ userId, tableName, recordId, fields, onClose, onSaved }: Props) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map(f => [f.key, f.value]))
  )
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    // Update users table (name, phone, cpf)
    const userFields: Record<string, string> = {}
    const tableFields: Record<string, string> = {}
    for (const f of fields) {
      if (['name', 'phone', 'cpf', 'email'].includes(f.key)) {
        userFields[f.key] = values[f.key]
      } else {
        tableFields[f.key] = values[f.key]
      }
    }
    if (Object.keys(userFields).length > 0) {
      await supabase.from('users').update(userFields).eq('auth_id', userId)
    }
    if (Object.keys(tableFields).length > 0 && tableName !== 'users') {
      await supabase.from(tableName).update(tableFields).eq('id', recordId)
    }
    setSaving(false)
    onSaved(values)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-navy text-lg">Editar perfil</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="space-y-3">
          {fields.map(f => (
            <div key={f.key}>
              <label className="text-xs font-semibold text-gray-500 block mb-1">{f.label}</label>
              <input type={f.type || 'text'} placeholder={f.placeholder || f.label}
                value={values[f.key]}
                onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal focus:outline-none text-sm" />
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-500 text-sm font-semibold">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-lg bg-teal text-white text-sm font-semibold disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
