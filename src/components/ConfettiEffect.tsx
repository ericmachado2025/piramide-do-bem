import { useEffect, useState } from 'react'

const EMOJIS = ['🎉', '⭐', '🏆', '✨', '🎊', '💫', '🌟', '🎯']

interface Particle {
  id: number
  emoji: string
  left: number
  delay: number
  duration: number
  size: number
}

export default function ConfettiEffect({ show }: { show: boolean }) {
  const [visible, setVisible] = useState(false)
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    if (show) {
      setVisible(true)
      const newParticles: Particle[] = Array.from({ length: 24 }, (_, i) => ({
        id: i,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 1.5 + Math.random() * 1.5,
        size: 1.2 + Math.random() * 1.2,
      }))
      setParticles(newParticles)
      const timer = setTimeout(() => setVisible(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [show])

  if (!visible) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute"
          style={{
            left: `${p.left}%`,
            top: '-40px',
            fontSize: `${p.size}rem`,
            animationName: 'confettiFall',
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            animationTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            animationFillMode: 'forwards',
          }}
        >
          {p.emoji}
        </span>
      ))}

      <style>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg) scale(0);
            opacity: 1;
          }
          20% {
            transform: translateY(15vh) rotate(120deg) scale(1.2);
            opacity: 1;
          }
          100% {
            transform: translateY(105vh) rotate(720deg) scale(0.6);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
