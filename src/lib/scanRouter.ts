export type ScanRouteType = 'confirmar' | 'login-qr' | 'transfer-legacy' | 'unknown'

export interface ScanRoute {
  type: ScanRouteType
  token: string
}

const PATTERNS = {
  confirmar: /\/confirmar\/([a-f0-9-]{36})/i,
  loginQr: /\/login-qr\/([a-f0-9-]{36})/i,
  transferOld: /\/home\?transfer=([A-Z0-9-]+)/i,
  rawUuid: /^([a-f0-9-]{36})$/i,
  transferCode: /^TRNF-[A-Z0-9]+$/i,
}

export function routeScannedData(data: string): ScanRoute {
  const trimmed = data.trim()

  // URL with /confirmar/:token
  const confirmarMatch = trimmed.match(PATTERNS.confirmar)
  if (confirmarMatch) {
    return { type: 'confirmar', token: confirmarMatch[1] }
  }

  // URL with /login-qr/:token
  const loginQrMatch = trimmed.match(PATTERNS.loginQr)
  if (loginQrMatch) {
    return { type: 'login-qr', token: loginQrMatch[1] }
  }

  // Legacy transfer URL: /home?transfer=TRNF-XXXX
  const transferOldMatch = trimmed.match(PATTERNS.transferOld)
  if (transferOldMatch) {
    return { type: 'transfer-legacy', token: transferOldMatch[1] }
  }

  // Legacy transfer code: TRNF-XXXX (raw, not in URL)
  if (PATTERNS.transferCode.test(trimmed)) {
    return { type: 'transfer-legacy', token: trimmed }
  }

  // Raw UUID — could be an operation token
  const rawUuidMatch = trimmed.match(PATTERNS.rawUuid)
  if (rawUuidMatch) {
    return { type: 'confirmar', token: rawUuidMatch[1] }
  }

  return { type: 'unknown', token: '' }
}
