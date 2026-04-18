import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useTotpTip(userId: string | undefined, hasTotp: boolean) {
  const [showTip, setShowTip] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!userId || hasTotp || checked) return

    const sessionKey = `totp_tip_shown_${userId}`
    if (sessionStorage.getItem(sessionKey)) {
      setChecked(true)
      return
    }

    supabase
      .from('totp_tip_dismissals')
      .select('next_show_at')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data || new Date(data.next_show_at) <= new Date()) {
          setShowTip(true)
          sessionStorage.setItem(sessionKey, '1')
        }
        setChecked(true)
      })
  }, [userId, hasTotp, checked])

  const dismiss = async () => {
    setShowTip(false)
    if (!userId) return
    await supabase.from('totp_tip_dismissals').upsert(
      {
        user_id: userId,
        dismissed_at: new Date().toISOString(),
        next_show_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: 'user_id' }
    )
  }

  return { showTip, dismissTip: dismiss }
}
