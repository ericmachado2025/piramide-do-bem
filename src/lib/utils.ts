export const GRADES_BY_TYPE: Record<string, string[]> = {
  infantil: ['Pre I', 'Pre II'],
  fundamental: ['1o ano', '2o ano', '3o ano', '4o ano', '5o ano', '6o ano', '7o ano', '8o ano', '9o ano'],
  medio: ['1o EM', '2o EM', '3o EM'],
  tecnico: ['1o Tecnico', '2o Tecnico', '3o Tecnico', '4o Tecnico'],
  eja: ['EJA Fundamental', 'EJA Medio'],
  superior: ['1o sem', '2o sem', '3o sem', '4o sem', '5o sem', '6o sem', '7o sem', '8o sem', '9o sem', '10o sem'],
}

export const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'N/A']

export const COUNTRY_CODES = [
  { value: '+55', label: '+55 Brasil' },
  { value: '+1', label: '+1 EUA/Canada' },
  { value: '+351', label: '+351 Portugal' },
  { value: '+54', label: '+54 Argentina' },
  { value: '+598', label: '+598 Uruguai' },
  { value: '+595', label: '+595 Paraguai' },
  { value: '+56', label: '+56 Chile' },
  { value: '+57', label: '+57 Colombia' },
  { value: '+58', label: '+58 Venezuela' },
  { value: '+34', label: '+34 Espanha' },
  { value: '+39', label: '+39 Italia' },
  { value: '+49', label: '+49 Alemanha' },
  { value: '+33', label: '+33 Franca' },
  { value: '+44', label: '+44 Reino Unido' },
  { value: '+81', label: '+81 Japao' },
]

export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN',
  'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
]

export const STATE_NAMES: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AM: 'Amazonas', AP: 'Amapá', BA: 'Bahia',
  CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás',
  MA: 'Maranhão', MG: 'Minas Gerais', MS: 'Mato Grosso do Sul', MT: 'Mato Grosso',
  PA: 'Pará', PB: 'Paraíba', PE: 'Pernambuco', PI: 'Piauí', PR: 'Paraná',
  RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RO: 'Rondônia', RR: 'Roraima',
  RS: 'Rio Grande do Sul', SC: 'Santa Catarina', SE: 'Sergipe', SP: 'São Paulo', TO: 'Tocantins',
}

export function formatCPF(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function formatCNPJ(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

export function translateAuthError(msg: string): string {
  if (msg.includes('rate limit')) return 'Muitas tentativas. Aguarde alguns minutos.'
  if (msg.includes('already registered') || msg.includes('User already')) return 'Email ja cadastrado. Faca login.'
  if (msg.includes('not confirmed') || msg.includes('Email not')) return 'Confirme seu email. Reenviamos o link.'
  if (msg.includes('Invalid login')) return ''
  return msg
}

export function calcAge(birthDate: string | null): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}
