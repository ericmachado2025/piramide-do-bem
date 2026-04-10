import { Link } from 'react-router-dom'

const particles = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  size: Math.random() * 6 + 2,
  left: Math.random() * 100,
  top: Math.random() * 100,
  delay: Math.random() * 4,
  duration: Math.random() * 3 + 3,
}))

export default function Landing() {
  return (
    <div className="relative min-h-screen gradient-bg overflow-hidden flex flex-col items-center justify-center px-4">
      {/* Floating particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle absolute rounded-full bg-white/20 pointer-events-none"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            top: `${p.top}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-xl mx-auto">
        {/* Pyramid icon */}
        <div className="float-anim mb-6">
          <svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            className="drop-shadow-2xl"
          >
            <defs>
              <linearGradient id="pyramidGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#02C39A" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <polygon
              points="60,10 110,100 10,100"
              fill="url(#pyramidGrad)"
              filter="url(#glow)"
              stroke="white"
              strokeWidth="2"
              opacity="0.95"
            />
            <polygon
              points="60,10 60,100 10,100"
              fill="white"
              opacity="0.15"
            />
            <circle cx="60" cy="65" r="8" fill="white" opacity="0.9" />
            <circle cx="60" cy="65" r="4" fill="#028090" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-4 tracking-tight">
          Pirâmide do Bem
          <span className="block text-2xl md:text-3xl font-bold text-white/70 mt-1">
            Escolar
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-white/80 text-lg md:text-xl mb-10 max-w-md leading-relaxed">
          A escola não é só o lugar onde você aprende — é onde você pertence. E pertencer muda tudo.
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 bg-white text-teal font-bold text-lg py-4 px-8 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200"
          >
            Entrar
          </Link>
        </div>

        {/* Impact link */}
        <Link
          to="/estatisticas"
          className="mt-8 text-white/60 hover:text-white/90 underline underline-offset-4 text-sm transition-colors"
        >
          Ver o que a Pirâmide já construiu! &rarr;
        </Link>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-white/40 text-xs md:text-sm">
          Desafio LED 2026 — Globo + Fundação Roberto Marinho
        </p>
      </div>
    </div>
  )
}
