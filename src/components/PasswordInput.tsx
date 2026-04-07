import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (password.length < 8) errors.push('Minimo 8 caracteres')
  if (!/[A-Z]/.test(password)) errors.push('1 letra maiuscula')
  if (!/[a-z]/.test(password)) errors.push('1 letra minuscula')
  if (!/[0-9]/.test(password)) errors.push('1 numero')
  if (!/[!@#$%^&*()_+\-=\[\]{}|;':",.<>?/]/.test(password)) errors.push('1 caractere especial')
  return { valid: errors.length === 0, errors }
}

function getPasswordStrength(password: string): number {
  let strength = 0
  if (password.length >= 8) strength++
  if (/[A-Z]/.test(password)) strength++
  if (/[a-z]/.test(password)) strength++
  if (/[0-9]/.test(password)) strength++
  if (/[!@#$%^&*()_+\-=\[\]{}|;':",.<>?/]/.test(password)) strength++
  return strength
}

export interface PasswordInputProps {
  password: string
  confirmPassword: string
  onPasswordChange: (v: string) => void
  onConfirmChange: (v: string) => void
  onEnterAdvance?: () => void
}

export { validatePassword, getPasswordStrength }

export default function PasswordInput({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmChange,
  onEnterAdvance,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const validation = validatePassword(password)
  const strength = getPasswordStrength(password)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onEnterAdvance) {
      onEnterAdvance()
    }
  }

  return (
    <div className="space-y-3">
      {/* Password field */}
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          placeholder="Sua senha"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:outline-none text-lg transition-colors pr-12"
          onFocus={(e) => (e.target.style.borderColor = '#028090')}
          onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>

      {/* Confirm password field */}
      <div className="relative">
        <input
          type={showConfirm ? 'text' : 'password'}
          placeholder="Confirme a senha"
          value={confirmPassword}
          onChange={(e) => onConfirmChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className={`w-full px-4 py-3.5 rounded-xl border-2 focus:outline-none text-lg transition-colors pr-12 ${
            confirmPassword && confirmPassword !== password
              ? 'border-red-500 focus:border-red-500'
              : 'border-gray-200'
          }`}
          onFocus={(e) => {
            if (!(confirmPassword && confirmPassword !== password)) {
              e.target.style.borderColor = '#028090'
            }
          }}
          onBlur={(e) => {
            if (!(confirmPassword && confirmPassword !== password)) {
              e.target.style.borderColor = '#e5e7eb'
            }
          }}
        />
        <button
          type="button"
          onClick={() => setShowConfirm(!showConfirm)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>

      {/* Mismatch error */}
      {confirmPassword && confirmPassword !== password && (
        <p className="text-red-500 text-sm">As senhas nao coincidem</p>
      )}

      {/* Strength meter - 5 bars */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              strength >= i
                ? i <= 2
                  ? 'bg-red-500'
                  : i <= 3
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Requirement errors */}
      {password && !validation.valid && (
        <div className="text-xs space-y-1">
          {validation.errors.map((err) => (
            <p key={err} className="text-red-500 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-red-500 inline-block" /> {err}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
