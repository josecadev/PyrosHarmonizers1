'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function LandingPage() {
  const router = useRouter()
  const [simulatorMode, setSimulatorMode] = useState<'crudo' | 'armonizado'>('armonizado')
  const [timeWindow, setTimeWindow] = useState<number>(48)
  const [loginNotification, setLoginNotification] = useState<string | null>(null)

  const handleQuickAccess = (roleName: string, roleKey: string) => {
    setLoginNotification(`Acceso concedido como ${roleName}. Redirigiendo a Portal de Evaluación...`)
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pyros_authenticated', 'true')
        sessionStorage.setItem('pyros_role', roleKey)
        sessionStorage.setItem('pyros_role_name', roleName)
      }
      router.push('/login')
    }, 600)
  }

  return (
    <div className="min-h-screen bg-[#0a0e17] text-[#dfe2f0] antialiased selection:bg-[#00e5ff] selection:text-[#00363d] font-sans">
      {/* ─── FIXED TOP NAVIGATION HEADER ─── */}
      <header className="fixed top-0 w-full z-50 bg-[#0f131d]/85 backdrop-blur-2xl border-b border-white/5 shadow-[0_1px_16px_rgba(0,0,0,0.5)]">
        <div className="h-20 w-full px-4 sm:px-8 max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Reto #8 */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#ff571a] via-[#ff8d4d] to-[#00daf3] flex items-center justify-center shadow-lg shadow-orange-500/20">
              <span className="material-symbols-outlined text-slate-950 font-bold text-2xl">local_fire_department</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-[#c3f5ff] flex items-center gap-2">
                Pyros<span className="text-[#ff571a]">Harmonizer</span>
              </span>
              <span className="font-mono text-[11px] text-[#bac9cc] flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-[#22ef7e] animate-pulse"></span>
                NASA SPACE APPS 2026 • RETO #8
              </span>
            </div>
            <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded bg-[#262a34]/70 border border-white/5 text-[#ffdbd0] font-mono text-[10px] uppercase tracking-wider ml-2">
              <span className="material-symbols-outlined text-[13px] text-[#ff571a]">satellite_alt</span>
              MULTI-SENSOR FIRE DATA
            </div>
          </div>

          {/* Nav Section Links */}
          <nav className="hidden xl:flex items-center gap-1 text-sm font-medium">
            <a href="#la-crisis" className="px-3 py-1.5 rounded-lg text-[#bac9cc] hover:text-[#c3f5ff] hover:bg-[#1c1f29] transition-all">
              La Crisis
            </a>
            <a href="#paradoja-satelital" className="px-3 py-1.5 rounded-lg text-[#bac9cc] hover:text-[#c3f5ff] hover:bg-[#1c1f29] transition-all">
              Paradoja MODIS vs VIIRS
            </a>
            <a href="#nuestra-armonizacion" className="px-3 py-1.5 rounded-lg text-[#bac9cc] hover:text-[#c3f5ff] hover:bg-[#1c1f29] transition-all">
              Nuestra Armonización
            </a>
            <a href="#simulador-seccion" className="px-3 py-1.5 rounded-lg text-[#bac9cc] hover:text-[#c3f5ff] hover:bg-[#1c1f29] transition-all">
              Comparador Interactivo
            </a>
            <a href="#impacto-en-bosques" className="px-3 py-1.5 rounded-lg text-[#bac9cc] hover:text-[#c3f5ff] hover:bg-[#1c1f29] transition-all">
              Impacto en Bosques
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="http://localhost:5000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1 font-mono text-xs text-[#bac9cc] hover:text-[#00daf3] transition-colors py-1.5 px-3 rounded bg-[#1c1f29]/70 border border-white/5 hover:border-[#00daf3]/30"
            >
              <span className="material-symbols-outlined text-[15px]">terminal</span>
              Swagger API
            </a>
            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff571a] to-[#ff8d4d] text-[#1c1f29] font-bold text-sm shadow-[0_0_18px_rgba(255,87,26,0.4)] hover:shadow-[0_0_26px_rgba(255,87,26,0.65)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
              <span>Entrar a la Demo (Jurado)</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className="w-full pt-20">
        {/* ─── 1. HERO SECTION ─── */}
        <section className="relative w-full overflow-hidden pt-12 pb-20 border-b border-white/5">
          {/* Orbital Atmospheric Glows */}
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[650px] bg-gradient-to-b from-[#00e5ff]/10 via-[#ff571a]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-24 right-10 w-96 h-96 bg-[#ff571a]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="px-4 sm:px-8 mx-auto max-w-7xl relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              {/* Hero Text Column */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                {/* Orbital Satellite Badge */}
                <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-[#1c1f29]/90 border border-white/10 shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00e5ff] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00daf3]"></span>
                  </span>
                  <span className="font-mono text-[10px] tracking-widest text-[#00daf3] font-bold uppercase">
                    🛰️ TELEDETECCIÓN SATELITAL • CIENCIA DE DATOS ESPACIALES
                  </span>
                  <span className="font-mono text-[10px] text-[#22ef7e] ml-2 px-1.5 py-0.5 rounded bg-[#0a0e17] border border-[#22ef7e]/20">
                    ORBIT 705 KM
                  </span>
                </div>

                {/* Main Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.12]">
                  Unificando la{' '}
                  <span className="bg-gradient-to-r from-[#00daf3] via-[#9cf0ff] to-[#22ef7e] bg-clip-text text-transparent">
                    verdad del fuego
                  </span>{' '}
                  desde el{' '}
                  <span className="bg-gradient-to-r from-[#ffb59e] via-[#ff571a] to-[#ef4444] bg-clip-text text-transparent">
                    espacio
                  </span>
                  .
                </h1>

                {/* Subtitle */}
                <p className="text-base sm:text-lg text-[#bac9cc] max-w-2xl leading-relaxed">
                  En Bolivia y la Amazonía, las autoridades reciben datos contradictorios de satélites que distorsionan la respuesta ante incendios forestales.{' '}
                  <strong className="text-[#00daf3] font-semibold">PyrosHarmonizer</strong> reconcilia 20 años de observaciones MODIS y VIIRS en una sola fuente de verdad geoespacial para salvar ecosistemas críticos.
                </p>

                {/* CTAs */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <a
                    href="#simulador-seccion"
                    className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#ff571a] to-[#ff8d4d] text-[#1c1f29] font-bold text-base shadow-[0_0_24px_rgba(255,87,26,0.45)] hover:shadow-[0_0_36px_rgba(255,87,26,0.7)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <span className="material-symbols-outlined text-[22px]">radar</span>
                    Explorar Dashboard Interactivo
                  </a>
                  <a
                    href="#paradoja-satelital"
                    className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#1c1f29]/80 hover:bg-[#262a34] text-[#00daf3] font-medium text-base border border-white/10 transition-all"
                  >
                    <span>Ver la Paradoja Satelital</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                  </a>
                </div>

                {/* 3 Telemetry Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
                  <div className="p-4 rounded-xl bg-[#181b25]/80 border border-white/5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-[#849396] tracking-wider uppercase">HISTORIAL ANALIZADO</span>
                      <span className="w-2 h-2 rounded-full bg-[#22ef7e]"></span>
                    </div>
                    <div className="font-mono text-2xl text-[#00daf3] font-bold tracking-tight mt-2">+450,000</div>
                    <div className="text-xs text-[#bac9cc] mt-1">Focos en Bolivia (2020-2026)</div>
                    <div className="mt-2 text-[10px] font-mono text-[#849396] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-[#22ef7e]">check_circle</span>
                      FIRMS C6.1 / VNP14IMG
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#181b25]/80 border border-white/5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-[#ffb59e] tracking-wider uppercase">SESGO DE ESCALA</span>
                      <span className="material-symbols-outlined text-[16px] text-[#ff571a]">tune</span>
                    </div>
                    <div className="font-mono text-2xl text-[#ff571a] font-bold tracking-tight mt-2">10x</div>
                    <div className="text-xs text-[#bac9cc] mt-1">Disparidad aparente corregida</div>
                    <div className="mt-2 text-[10px] font-mono text-[#ffb59e] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">hexagon</span>
                      H3 Res 7/8 + Normalización
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#181b25]/80 border border-white/5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-[#22ef7e] tracking-wider uppercase">TIEMPO RESPUESTA</span>
                      <span className="material-symbols-outlined text-[16px] text-[#22ef7e]">speed</span>
                    </div>
                    <div className="font-mono text-2xl text-[#62ff96] font-bold tracking-tight mt-2">&lt; 1.5 seg</div>
                    <div className="text-xs text-[#bac9cc] mt-1">Generación de síntesis ejecutiva</div>
                    <div className="mt-2 text-[10px] font-mono text-[#849396] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-[#00daf3]">bolt</span>
                      Brigadas COE • ABT • SERNAP
                    </div>
                  </div>
                </div>
              </div>

              {/* Hero Tactical HUD: Orbital Space Simulation */}
              <div className="lg:col-span-5 relative flex flex-col items-center">
                <div className="relative w-full aspect-square max-w-[480px] rounded-2xl bg-[#070b13] p-4 border border-cyan-500/20 shadow-2xl overflow-hidden flex flex-col justify-between">
                  {/* Tactical HUD Header inside satellite view */}
                  <div className="flex items-center justify-between z-20 pb-2 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#00daf3] text-[18px]">satellite_alt</span>
                      <span className="font-mono text-xs text-[#00daf3] font-bold">ORBITAL FEED: BOLIVIA LEO</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#1c1f29] text-[#62ff96] border border-[#22ef7e]/30 animate-pulse">
                        LIVE TRACKING
                      </span>
                      <span className="font-mono text-[10px] text-[#849396]">16.29°S 63.58°W</span>
                    </div>
                  </div>

                  {/* Simulated Tactical SVG Orbital Map Canvas */}
                  <div className="relative w-full h-full my-auto rounded-lg overflow-hidden bg-[#050810] flex items-center justify-center">
                    {/* Radial Grid Lines */}
                    <svg className="absolute inset-0 w-full h-full opacity-30" fill="none" viewBox="0 0 400 400">
                      <circle cx="200" cy="200" r="60" stroke="#00daf3" strokeDasharray="2 4" strokeWidth="1" />
                      <circle cx="200" cy="200" r="120" stroke="#00daf3" strokeDasharray="4 6" strokeWidth="1" />
                      <circle cx="200" cy="200" r="170" stroke="#3b494c" strokeWidth="1" />
                      <line stroke="#3b494c" strokeDasharray="2 2" strokeWidth="0.7" x1="200" x2="200" y1="0" y2="400" />
                      <line stroke="#3b494c" strokeDasharray="2 2" strokeWidth="0.7" x1="0" x2="400" y1="200" y2="200" />
                    </svg>

                    {/* Vector Map Contour of Eastern Bolivia (Chiquitania & Amazonia) */}
                    <svg className="w-full h-full p-4 text-[#3b494c]" fill="none" viewBox="0 0 400 400">
                      <path
                        d="M120 70 C 160 60, 220 70, 260 100 C 310 140, 330 200, 310 260 C 290 310, 230 340, 180 320 C 130 300, 90 250, 90 190 C 90 130, 90 90, 120 70 Z"
                        fill="#101524"
                        stroke="#3b494c"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M150 110 C 210 100, 260 130, 280 180 C 270 240, 210 280, 160 250 C 130 230, 120 170, 150 110 Z"
                        fill="#0c1920"
                        stroke="#00626e"
                        strokeDasharray="2 4"
                        strokeWidth="1"
                      />

                      {/* Terra/Aqua (MODIS 1km Orbit) */}
                      <path className="opacity-70" d="M40 340 L 320 40" stroke="#00daf3" strokeDasharray="6 4" strokeWidth="1.5" />
                      <circle className="animate-ping" cx="180" cy="180" fill="#00e5ff" r="5" />
                      <circle cx="180" cy="180" fill="#00e5ff" r="4" />

                      {/* Suomi-NPP (VIIRS 375m Orbit) */}
                      <path className="opacity-80" d="M110 370 L 370 110" stroke="#ff571a" strokeDasharray="3 3" strokeWidth="1.5" />
                      <circle className="animate-pulse" cx="240" cy="240" fill="#ff571a" r="5" />
                      <circle cx="240" cy="240" fill="#ffdbd0" r="4" />

                      {/* Fire Thermal Radiative clusters in Chiquitania */}
                      <g className="animate-pulse">
                        <circle cx="210" cy="190" fill="#ff571a" opacity="0.4" r="7" />
                        <circle cx="210" cy="190" fill="#ffb59e" r="3" />
                        <circle cx="225" cy="205" fill="#ff571a" opacity="0.5" r="9" />
                        <circle cx="225" cy="205" fill="#ffb59e" r="4" />
                        <circle cx="238" cy="198" fill="#ff571a" opacity="0.4" r="6" />
                        <circle cx="238" cy="198" fill="#ffb59e" r="2.5" />
                        <circle cx="218" cy="220" fill="#93000a" opacity="0.6" r="10" />
                        <circle cx="218" cy="220" fill="#ff571a" r="4" />
                      </g>

                      {/* Protected Reserves */}
                      <polygon fill="none" opacity="0.8" points="170,120 220,110 240,150 190,160" stroke="#22ef7e" strokeDasharray="2 3" strokeWidth="1.5" />
                      <text fill="#62ff96" fontFamily="JetBrains Mono" fontSize="8" x="180" y="140">NOEL KEMPFF</text>
                      <text fill="#ffb59e" fontFamily="JetBrains Mono" fontSize="8" x="215" y="235">CHIQUITANIA</text>
                    </svg>

                    {/* HUD Badges */}
                    <div className="absolute bottom-3 left-3 bg-[#181b25]/90 backdrop-blur-md px-2.5 py-1.5 rounded border border-white/5 text-left">
                      <div className="font-mono text-[9px] text-[#849396] uppercase">SENSORES ACTIVOS</div>
                      <div className="font-mono text-[10px] text-[#dfe2f0] font-semibold flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-[#00e5ff]"></span> MODIS (Aqua/Terra)
                      </div>
                      <div className="font-mono text-[10px] text-[#dfe2f0] font-semibold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#ff571a]"></span> VIIRS (NOAA-20/SNPP)
                      </div>
                    </div>

                    <div className="absolute top-3 right-3 bg-[#181b25]/90 backdrop-blur-md px-2.5 py-1.5 rounded border border-white/5 text-right">
                      <div className="font-mono text-[9px] text-[#ff571a] uppercase font-bold">FRP MÁXIMO</div>
                      <div className="font-mono text-sm text-[#ffdbd0] font-bold">1,480 MW</div>
                      <div className="font-mono text-[9px] text-[#62ff96]">CONFIANZA 98.4%</div>
                    </div>
                  </div>

                  {/* Footer of Visual Satellite Card */}
                  <div className="pt-2 flex items-center justify-between text-[#bac9cc] font-mono text-[11px] border-t border-white/5">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-[#00daf3]">sync</span> Sincronizado con FIRMS API
                    </span>
                    <span className="text-[#22ef7e]">LATENCIA: 420ms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 2. SECCIÓN 1: LA CRISIS EN TIERRA (EL CONTEXTO REAL) ─── */}
        <section id="la-crisis" className="w-full bg-[#070b13]/80 py-20 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col gap-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex flex-col gap-2 max-w-2xl">
                <span className="font-mono text-xs text-[#ff571a] uppercase tracking-widest flex items-center gap-1.5 font-bold">
                  <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
                  IMPACTO TERRITORIAL • BOLIVIA
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#dfe2f0] tracking-tight">
                  La Chiquitania y la Amazonía no tienen tiempo para datos erróneos
                </h2>
                <p className="text-sm sm:text-base text-[#bac9cc]">
                  Cuando estalla un incendio, los guardaparques y brigadistas reciben alertas desfasadas. Si un satélite reporta 1 foco y otro reporta 15 focos sobre el mismo valle, los aviones cisterna y las cuadrillas terrestres se desplazan a ciegas.
                </p>
              </div>
              <div>
                <span className="px-3 py-1.5 rounded-lg bg-[#1c1f29] border border-cyan-500/20 text-[#00daf3] font-mono text-xs font-semibold">
                  REGIONES EN MONITOREO CRÍTICO: 3 BIOMAS
                </span>
              </div>
            </div>

            {/* 3 Hotspot Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Chiquitania */}
              <div className="rounded-2xl bg-[#131722] p-6 border border-white/5 hover:border-orange-500/30 transition-all flex flex-col justify-between group">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-[#ff571a]/20 text-[#ffdbd0] font-mono text-[10px] font-bold">
                      BIOMA BOSQUE SECO
                    </span>
                    <span className="font-mono text-xs text-[#ef4444] font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-ping"></span>
                      RIESGO EXTREMO
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-[#dfe2f0]">Chiquitania (Santa Cruz)</h3>
                  <p className="text-xs sm:text-sm text-[#bac9cc] leading-relaxed">
                    Bosque seco chiquitano único en el planeta. La interfaz agroforestal genera dispersiones de humo que ciegan a los sensores ópticos tradicionales y descalibran la severidad.
                  </p>
                  <div className="p-3 rounded-xl bg-[#0a0e17] border border-white/5 flex items-center justify-between my-1">
                    <div>
                      <div className="font-mono text-[10px] text-[#849396]">ÁREA EXPUESTA</div>
                      <div className="font-mono text-sm text-[#ffdbd0] font-bold">+180,000 ha</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[10px] text-[#849396]">DISCREPANCIA SENSOR</div>
                      <div className="font-mono text-sm text-[#00daf3] font-bold">8.4x píxeles</div>
                    </div>
                  </div>
                </div>
                <div className="pt-4 flex items-center justify-between font-mono text-xs border-t border-white/5 mt-4">
                  <span className="text-[#849396] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">landscape</span> San Ignacio / Roboré
                  </span>
                  <a href="#simulador-seccion" className="text-[#00daf3] hover:underline flex items-center gap-0.5 font-semibold">
                    Ver telemetría →
                  </a>
                </div>
              </div>

              {/* Card 2: Noel Kempff */}
              <div className="rounded-2xl bg-[#131722] p-6 border border-white/5 hover:border-emerald-500/30 transition-all flex flex-col justify-between group">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-[#22ef7e]/20 text-[#62ff96] font-mono text-[10px] font-bold">
                      PATRIMONIO UNESCO
                    </span>
                    <span className="font-mono text-xs text-[#ffb59e] font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#ff571a]"></span>
                      ACCESO CRÍTICO
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-[#dfe2f0]">P.N. Noel Kempff Mercado</h3>
                  <p className="text-xs sm:text-sm text-[#bac9cc] leading-relaxed">
                    Selva amazónica de dosel alto virgen. Sin carreteras accesibles; cada incursión de bomberos requiere helicópteros militares guiados exclusivamente por coordenadas satelitales fidedignas.
                  </p>
                  <div className="p-3 rounded-xl bg-[#0a0e17] border border-white/5 flex items-center justify-between my-1">
                    <div>
                      <div className="font-mono text-[10px] text-[#849396]">BIODIVERSIDAD</div>
                      <div className="font-mono text-sm text-[#62ff96] font-bold">Dosel &gt;35m</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[10px] text-[#849396]">LATENCIA BRIGADA</div>
                      <div className="font-mono text-sm text-[#00daf3] font-bold">14 hrs llegada</div>
                    </div>
                  </div>
                </div>
                <div className="pt-4 flex items-center justify-between font-mono text-xs border-t border-white/5 mt-4">
                  <span className="text-[#849396] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">park</span> Meseta de Caparú
                  </span>
                  <a href="#simulador-seccion" className="text-[#00daf3] hover:underline flex items-center gap-0.5 font-semibold">
                    Ver telemetría →
                  </a>
                </div>
              </div>

              {/* Card 3: San Matías */}
              <div className="rounded-2xl bg-[#131722] p-6 border border-white/5 hover:border-cyan-500/30 transition-all flex flex-col justify-between group">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-[#00e5ff]/20 text-[#9cf0ff] font-mono text-[10px] font-bold">
                      HUMEDAL RAMSAR
                    </span>
                    <span className="font-mono text-xs text-[#ff571a] font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#ff571a]"></span>
                      AVANCE RÁPIDO
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-[#dfe2f0]">ANMI San Matías</h3>
                  <p className="text-xs sm:text-sm text-[#bac9cc] leading-relaxed">
                    Pantanal boliviano y humedales de altísima fragilidad. Vientos frontales de 45 km/h desplazan el fuego 12 km al día, causando que MODIS y VIIRS entreguen huellas temporales desincronizadas.
                  </p>
                  <div className="p-3 rounded-xl bg-[#0a0e17] border border-white/5 flex items-center justify-between my-1">
                    <div>
                      <div className="font-mono text-[10px] text-[#849396]">VELOCIDAD VIENTO</div>
                      <div className="font-mono text-sm text-[#ff571a] font-bold">42 km/h NE</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[10px] text-[#849396]">AMENAZA FAUNA</div>
                      <div className="font-mono text-sm text-[#ef4444] font-bold">Crítica</div>
                    </div>
                  </div>
                </div>
                <div className="pt-4 flex items-center justify-between font-mono text-xs border-t border-white/5 mt-4">
                  <span className="text-[#849396] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">water</span> Pantanal Boliviano
                  </span>
                  <a href="#simulador-seccion" className="text-[#00daf3] hover:underline flex items-center gap-0.5 font-semibold">
                    Ver telemetría →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 3. SECCIÓN 2: LA PARADOJA DE LOS SATÉLITES ─── */}
        <section id="paradoja-satelital" className="w-full py-20 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col gap-10">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto flex flex-col gap-3">
              <div className="inline-flex items-center gap-2 justify-center px-3 py-1 rounded-full bg-[#1c1f29] border border-cyan-500/30 mx-auto">
                <span className="material-symbols-outlined text-[15px] text-[#00daf3]">warning</span>
                <span className="font-mono text-[10px] text-[#00daf3] tracking-wider uppercase font-bold">
                  EL RETO CENTRAL DE LA NASA #8
                </span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-[#dfe2f0] tracking-tight">
                ¿Por qué los ojos de la NASA se contradicen?
              </h2>
              <div className="p-4 rounded-xl bg-[#181b25] border border-white/5 shadow-sm mt-1">
                <p className="text-base sm:text-lg text-[#ffb59e] font-semibold italic">
                  “No es que haya 10 veces más incendios; es que la lente de VIIRS tiene más aumento. Sumar píxeles crudos es un error científico que PyrosHarmonizer corrige.”
                </p>
              </div>
            </div>

            {/* Side-by-Side Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* MODIS Sensor */}
              <div className="p-6 sm:p-8 rounded-2xl bg-[#131722] border border-white/5 flex flex-col justify-between">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs text-[#00daf3] uppercase font-bold">SENSOR HISTÓRICO (2000 - PRESENTE)</span>
                      <h3 className="text-2xl font-bold text-[#dfe2f0]">MODIS (Terra &amp; Aqua)</h3>
                    </div>
                    <span className="px-3 py-1 rounded bg-[#1c1f29] text-[#00daf3] font-mono text-xs font-bold border border-cyan-500/20">
                      1,000m / Píxel
                    </span>
                  </div>
                  <p className="text-sm text-[#bac9cc] leading-relaxed">
                    En una cuadrícula de 100 hectáreas, MODIS registra <strong className="text-white">1 solo píxel gigante</strong>. Al no poder discernir frentes fragmentados, genera la falsa impresión de fuegos estáticos y subestima el perímetro real en quemas controladas convertidas en incendios.
                  </p>

                  {/* Visual 1km */}
                  <div className="w-full aspect-video rounded-xl bg-[#0a0e17] border border-white/5 p-4 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="w-44 h-44 rounded bg-cyan-500/10 border-2 border-dashed border-cyan-500/40 flex flex-col items-center justify-center p-3 relative">
                      <span className="font-mono text-xs text-[#00daf3] font-bold">1 PÍXEL = 1 km²</span>
                      <span className="text-[11px] text-[#bac9cc] text-center mt-1">(100 hectáreas indivisibles)</span>
                      <div className="w-8 h-8 rounded-full bg-[#ff571a]/30 flex items-center justify-center mt-2 animate-pulse">
                        <span className="w-3.5 h-3.5 rounded-full bg-[#ff571a]"></span>
                      </div>
                      <span className="text-[9px] font-mono text-[#849396] absolute bottom-1">Foco térmico sub-píxel</span>
                    </div>
                    <div className="absolute bottom-2 left-3 font-mono text-[10px] text-[#849396]">
                      Huella MODIS: Subestima fuegos fragmentados
                    </div>
                  </div>

                  {/* Pros & Cons */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-lg bg-[#181b25] border border-white/5">
                      <div className="font-mono text-[10px] text-[#22ef7e] uppercase font-bold">VENTAJA</div>
                      <div className="text-xs text-[#dfe2f0] mt-0.5">20+ años continuos de serie temporal climática histórica.</div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#181b25] border border-white/5">
                      <div className="font-mono text-[10px] text-[#ff571a] uppercase font-bold">PROBLEMA</div>
                      <div className="text-xs text-[#dfe2f0] mt-0.5">Pérdida de focos menores a 50m y efecto borroso en bordes.</div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-3 flex items-center justify-between text-[#849396] font-mono text-xs border-t border-white/5">
                  <span>Satélites: EOS AM-1 • PM-1</span>
                  <span className="text-[#00daf3]">MOD14 / MYD14 C6.1</span>
                </div>
              </div>

              {/* VIIRS Sensor */}
              <div className="p-6 sm:p-8 rounded-2xl bg-[#131722] border border-white/5 flex flex-col justify-between">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs text-[#ff571a] uppercase font-bold">SENSOR MODERNO (2012 - PRESENTE)</span>
                      <h3 className="text-2xl font-bold text-[#dfe2f0]">VIIRS (Suomi-NPP &amp; NOAA-20)</h3>
                    </div>
                    <span className="px-3 py-1 rounded bg-[#ff571a]/20 text-[#ffdbd0] font-mono text-xs font-bold border border-orange-500/20">
                      375m / Píxel
                    </span>
                  </div>
                  <p className="text-sm text-[#bac9cc] leading-relaxed">
                    En esa misma cuadrícula de 100 ha, VIIRS detecta <strong className="text-white">hasta 7 a 10 píxeles individuales</strong>. Al cambiar de satélite en 2012 sin normalización matemática, las estadísticas oficiales mostraron un “estallido artificial” multiplicando alarmas falsas para bomberos.
                  </p>

                  {/* Visual 3x3 */}
                  <div className="w-full aspect-video rounded-xl bg-[#0a0e17] border border-white/5 p-4 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="w-44 h-44 grid grid-cols-3 grid-rows-3 gap-1.5 p-1.5 bg-[#181b25] rounded border border-orange-500/30">
                      <div className="bg-[#ff571a]/30 rounded flex items-center justify-center"><span className="w-2 h-2 rounded-full bg-[#ff571a]"></span></div>
                      <div className="bg-[#ff571a]/10 rounded"></div>
                      <div className="bg-[#ff571a]/40 rounded flex items-center justify-center"><span className="w-2.5 h-2.5 rounded-full bg-[#ffb59e]"></span></div>
                      <div className="bg-[#ff571a]/20 rounded"></div>
                      <div className="bg-[#ff571a]/80 rounded flex items-center justify-center shadow-[0_0_8px_#ff571a]"><span className="w-3 h-3 rounded-full bg-white"></span></div>
                      <div className="bg-[#ff571a]/30 rounded flex items-center justify-center"><span className="w-2 h-2 rounded-full bg-[#ff571a]"></span></div>
                      <div className="bg-[#ff571a]/10 rounded"></div>
                      <div className="bg-[#ff571a]/50 rounded flex items-center justify-center"><span className="w-2.5 h-2.5 rounded-full bg-[#ffdbd0]"></span></div>
                      <div className="bg-[#ff571a]/20 rounded"></div>
                    </div>
                    <div className="absolute bottom-2 right-3 font-mono text-[10px] text-[#ff571a]">
                      Matriz VIIRS: 9 sub-píxeles = 1 solo incendio real
                    </div>
                  </div>

                  {/* Pros & Cons */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-lg bg-[#181b25] border border-white/5">
                      <div className="font-mono text-[10px] text-[#22ef7e] uppercase font-bold">VENTAJA</div>
                      <div className="text-xs text-[#dfe2f0] mt-0.5">Resolución térmica superior en canales I-Bands (375m).</div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#181b25] border border-white/5">
                      <div className="font-mono text-[10px] text-[#ff571a] uppercase font-bold">PROBLEMA</div>
                      <div className="text-xs text-[#dfe2f0] mt-0.5">Multiplica los conteos brutos saturando el sistema logístico.</div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-3 flex items-center justify-between text-[#849396] font-mono text-xs border-t border-white/5">
                  <span>Constelación: JPSS • Suomi</span>
                  <span className="text-[#ff571a]">VNP14IMGTDL</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 4. SECCIÓN 3: LA SOLUCIÓN PYROSHARMONIZER (ARQUITECTURA CIENTÍFICA) ─── */}
        <section id="nuestra-armonizacion" className="w-full bg-[#070b13]/80 py-20 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col gap-10">
            <div className="text-center max-w-3xl mx-auto flex flex-col gap-3">
              <span className="font-mono text-xs text-[#22ef7e] uppercase tracking-widest font-bold">
                INGENIERÍA GEOESPACIAL DE ALTO NIVEL
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#dfe2f0] tracking-tight">
                Cómo transformamos píxeles crudos en frentes de fuego reales
              </h2>
              <p className="text-sm sm:text-base text-[#bac9cc]">
                Nuestro pipeline científico en cuatro fases neutraliza el sesgo de resolución geométrica y temporal, devolviendo certeza táctica a las autoridades.
              </p>
            </div>

            {/* 4-Step Pipeline */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Step 1 */}
              <div className="p-6 rounded-2xl bg-[#131722] border border-white/5 hover:border-cyan-500/30 transition-all flex flex-col justify-between group">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-lg bg-[#00e5ff] text-[#00363d] flex items-center justify-center font-mono font-bold text-sm">
                      01
                    </span>
                    <span className="material-symbols-outlined text-[#00daf3] text-2xl">cloud_download</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#dfe2f0]">Ingesta Directa NASA FIRMS</h3>
                  <p className="text-xs text-[#bac9cc] leading-relaxed">
                    Streaming contínuo de detecciones térmicas de MODIS C6.1 y VIIRS 375m mediante API de ultra-baja latencia con filtros de máscara de nubes y calidad espectral.
                  </p>
                </div>
                <div className="mt-4 pt-2 text-[11px] font-mono text-[#00daf3] flex items-center gap-1.5 border-t border-white/5">
                  <span className="w-2 h-2 rounded-full bg-[#00daf3] animate-pulse"></span> Streaming NRT &lt; 3 horas
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-6 rounded-2xl bg-[#131722] border border-white/5 hover:border-cyan-500/30 transition-all flex flex-col justify-between group">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-lg bg-[#00daf3] text-[#00363d] flex items-center justify-center font-mono font-bold text-sm">
                      02
                    </span>
                    <span className="material-symbols-outlined text-[#9cf0ff] text-2xl">hexagon</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#dfe2f0]">Teselación Hexagonal H3</h3>
                  <p className="text-xs text-[#bac9cc] leading-relaxed">
                    Indexación a través del sistema hexagonal Uber H3 (Niveles 7 y 8). Elimina las distorsiones de borde de barrido (scan-angle distortion) presentes en los satélites polares.
                  </p>
                </div>
                <div className="mt-4 pt-2 text-[11px] font-mono text-[#9cf0ff] flex items-center gap-1.5 border-t border-white/5">
                  <span className="material-symbols-outlined text-[13px]">grid_4x4</span> Celdas uniformes 0.73 km²
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-6 rounded-2xl bg-[#131722] border border-white/5 hover:border-orange-500/30 transition-all flex flex-col justify-between group">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-lg bg-[#ff571a] text-[#1c1f29] flex items-center justify-center font-mono font-bold text-sm">
                      03
                    </span>
                    <span className="material-symbols-outlined text-[#ff571a] text-2xl">hub</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#dfe2f0]">Clustering ST-DBSCAN</h3>
                  <p className="text-xs text-[#bac9cc] leading-relaxed">
                    Algoritmo espacio-temporal no paramétrico que asocia detecciones simultáneas en ventanas continuas de 48h y 3.5 km, sintetizando polígonos de frentes de fuego activos.
                  </p>
                </div>
                <div className="mt-4 pt-2 text-[11px] font-mono text-[#ffb59e] flex items-center gap-1.5 border-t border-white/5">
                  <span className="material-symbols-outlined text-[13px]">auto_fix_high</span> Fusión espacio-temporal
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-6 rounded-2xl bg-[#131722] border border-white/5 hover:border-orange-500/30 transition-all flex flex-col justify-between group">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-lg bg-[#ff8d4d] text-[#1c1f29] flex items-center justify-center font-mono font-bold text-sm">
                      04
                    </span>
                    <span className="material-symbols-outlined text-[#ff8d4d] text-2xl">whatshot</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#dfe2f0]">Cálculo del Índice HFII</h3>
                  <p className="text-xs text-[#bac9cc] leading-relaxed">
                    Normalización de Potencia Radiativa del Fuego (FRP en Megawatts) y ponderación bayesiana para determinar severidad real de llama y hectáreas efectivamente quemadas.
                  </p>
                </div>
                <div className="mt-4 pt-2 text-[11px] font-mono text-[#ffb59e] flex items-center gap-1.5 border-t border-white/5">
                  <span className="material-symbols-outlined text-[13px]">verified</span> Harmonized Fire Index
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 5. SECCIÓN 4: COMPARADOR INTERACTIVO ANTES VS DESPUÉS ─── */}
        <section id="simulador-seccion" className="w-full py-20 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col gap-8">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex flex-col gap-2 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded bg-[#1c1f29] text-[#00daf3] font-mono text-xs uppercase border border-cyan-500/20">
                  <span className="material-symbols-outlined text-[14px]">tune</span> LABORATORIO EXPERIMENTAL
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#dfe2f0] tracking-tight">
                  Simulador de Armonización: Verdad Satelital en Tiempo Real
                </h2>
                <p className="text-sm sm:text-base text-[#bac9cc]">
                  Comprueba el impacto real de nuestro algoritmo en el sector de San Ignacio de Velasco (Chiquitania). Alterna entre la vista desfasada cruda y la síntesis unificada.
                </p>
              </div>

              {/* Mode Switcher Buttons */}
              <div className="p-1.5 rounded-xl bg-[#131722] border border-white/10 flex items-center gap-1 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => setSimulatorMode('crudo')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                    simulatorMode === 'crudo'
                      ? 'bg-[#ef4444]/20 border border-red-500/40 text-red-300 shadow-md'
                      : 'text-[#bac9cc] hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>
                  Vista Cruda (Desfasada)
                </button>
                <button
                  type="button"
                  onClick={() => setSimulatorMode('armonizado')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                    simulatorMode === 'armonizado'
                      ? 'bg-cyan-500/20 border border-cyan-400/50 text-[#00daf3] shadow-md shadow-cyan-500/20'
                      : 'text-[#bac9cc] hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#22ef7e] animate-pulse"></span>
                  Vista Armonizada Pyros
                </button>
              </div>
            </div>

            {/* Simulator Viewport Shell */}
            <div className="rounded-2xl bg-[#070b13] p-4 sm:p-6 border border-white/10 shadow-2xl flex flex-col gap-4">
              {/* Tactical Sub-bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-[#00daf3] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                    SECTOR SAN IGNACIO DE VELASCO • BOLIVIA
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#1c1f29] text-[#849396] border border-white/5">
                    RES H3: NIVEL 8
                  </span>
                </div>

                {/* Time Window Buttons */}
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  {[24, 48, 168].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setTimeWindow(h)}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        timeWindow === h
                          ? 'bg-cyan-500/20 text-[#00daf3] border border-cyan-500/40 font-bold'
                          : 'bg-[#181b25] text-[#bac9cc] hover:text-white border border-transparent'
                      }`}
                    >
                      {h === 168 ? '7 Días' : `${h} Horas`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic SVG Map Container */}
              <div className="relative w-full h-[400px] sm:h-[440px] rounded-xl bg-[#050810] overflow-hidden flex items-center justify-center p-4 border border-white/5">
                {/* Background Grid & Topography */}
                <svg className="absolute inset-0 w-full h-full opacity-20" fill="none" viewBox="0 0 800 450">
                  <pattern height="40" id="landing-grid" patternUnits="userSpaceOnUse" width="40">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#3b494c" strokeWidth="0.5" />
                  </pattern>
                  <rect fill="url(#landing-grid)" height="100%" width="100%" />
                  <circle cx="400" cy="225" r="160" stroke="#00daf3" strokeDasharray="3 3" strokeWidth="0.7" />
                  <path d="M 150 80 L 320 60 L 390 190 L 260 280 Z" fill="#00e475" fillOpacity="0.06" stroke="#22ef7e" strokeDasharray="4 4" strokeWidth="1.2" />
                  <text fill="#62ff96" fontFamily="JetBrains Mono" fontSize="10" x="170" y="100">ÁREA PROTEGIDA MUNICIPAL</text>
                </svg>

                {/* RAW MODE LAYER */}
                {simulatorMode === 'crudo' && (
                  <div className="absolute inset-0 w-full h-full p-6 flex flex-col justify-center animate-fadeIn">
                    <svg className="w-full h-full" fill="none" viewBox="0 0 700 350">
                      {/* Large MODIS 1km bounding boxes */}
                      <rect fill="#ff571a" fillOpacity="0.12" height="120" stroke="#ff571a" strokeDasharray="4 2" strokeWidth="1.5" width="120" x="240" y="100" />
                      <rect fill="#ff571a" fillOpacity="0.12" height="120" stroke="#ff571a" strokeDasharray="4 2" strokeWidth="1.5" width="120" x="340" y="120" />
                      <rect fill="#ff571a" fillOpacity="0.12" height="120" stroke="#ff571a" strokeDasharray="4 2" strokeWidth="1.5" width="120" x="280" y="180" />

                      {/* Chaotic VIIRS Detections */}
                      <circle className="animate-pulse" cx="260" cy="130" fill="#ffb4ab" r="4" />
                      <circle cx="280" cy="140" fill="#ff571a" r="3.5" />
                      <circle cx="295" cy="125" fill="#ff571a" r="4" />
                      <circle cx="310" cy="160" fill="#ffb4ab" r="5" />
                      <circle cx="330" cy="145" fill="#ff571a" r="3" />
                      <circle cx="350" cy="180" fill="#ff571a" r="4.5" />
                      <circle cx="370" cy="155" fill="#ffb4ab" r="4" />
                      <circle cx="380" cy="190" fill="#ff571a" r="3" />
                      <circle cx="395" cy="175" fill="#ff571a" r="5" />
                      <circle cx="410" cy="210" fill="#ffb4ab" r="4" />
                      <circle cx="310" cy="220" fill="#ff571a" r="4" />
                      <circle cx="340" cy="240" fill="#ffb4ab" r="3.5" />
                      <circle cx="360" cy="230" fill="#ff571a" r="4" />
                      <circle cx="280" cy="210" fill="#ff571a" r="3" />

                      {/* Discrepancy Annotation Box */}
                      <rect fill="#181b25" height="65" rx="8" stroke="#ff571a" strokeWidth="1" width="220" x="50" y="240" />
                      <text fill="#ffb4ab" fontFamily="Space Grotesk, sans-serif" fontSize="11" fontWeight="bold" x="65" y="262">⚠️ RECUENTO DUPLICADO</text>
                      <text fill="#bac9cc" fontFamily="JetBrains Mono" fontSize="10" x="65" y="282">342 Detecciones satelitales</text>
                      <text fill="#849396" fontFamily="JetBrains Mono" fontSize="9" x="65" y="296">Imposible asignar cuadrillas</text>
                    </svg>

                    {/* Warning Banner */}
                    <div className="absolute top-4 left-6 px-3 py-1.5 rounded-lg bg-red-950/80 border border-red-500/30 text-red-200 text-xs font-semibold flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-red-400">report_problem</span>
                      VISTA CRUDA: ALTA CONFUSIÓN • 342 DETECCIONES DESALINEADAS
                    </div>
                  </div>
                )}

                {/* HARMONIZED MODE LAYER */}
                {simulatorMode === 'armonizado' && (
                  <div className="absolute inset-0 w-full h-full p-6 flex flex-col justify-center animate-fadeIn">
                    <svg className="w-full h-full" fill="none" viewBox="0 0 700 350">
                      {/* Synthesized H3 Hexagons */}
                      <g fill="#ff571a" fillOpacity="0.25" stroke="#00e5ff" strokeWidth="1.2">
                        <polygon fill="#ff571a" fillOpacity="0.6" points="310,130 335,115 360,130 360,160 335,175 310,160" stroke="#ffb59e" strokeWidth="1.5" />
                        <polygon fill="#ff571a" fillOpacity="0.75" points="360,130 385,115 410,130 410,160 385,175 360,160" stroke="#ffb59e" strokeWidth="1.5" />
                        <polygon fill="#93000a" fillOpacity="0.8" points="335,175 360,160 385,175 385,205 360,220 335,205" stroke="#ff571a" strokeWidth="2" />
                        <polygon fill="#ff571a" fillOpacity="0.4" points="285,175 310,160 335,175 335,205 310,220 285,205" stroke="#00daf3" strokeWidth="1" />
                        <polygon fill="#ff571a" fillOpacity="0.5" points="360,220 385,205 410,220 410,250 385,265 360,250" stroke="#ffb59e" strokeWidth="1.5" />
                      </g>

                      {/* Vector Propagation Arrow */}
                      <defs>
                        <marker id="arrow" markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="5" refY="5" viewBox="0 0 10 10">
                          <path d="M 0 1 L 10 5 L 0 9 z" fill="#00e5ff" />
                        </marker>
                      </defs>
                      <line markerEnd="url(#arrow)" stroke="#00e5ff" strokeDasharray="4 3" strokeWidth="2.5" x1="270" x2="430" y1="110" y2="240" />
                      <text fill="#00e5ff" fontFamily="JetBrains Mono" fontSize="11" fontWeight="bold" x="440" y="255">PROPAGACIÓN: 28 km/h SE</text>

                      {/* Consolidated Front Tag */}
                      <rect fill="#0a0e17" height="80" rx="8" stroke="#00e5ff" strokeWidth="1" width="250" x="50" y="40" />
                      <text fill="#c3f5ff" fontFamily="Space Grotesk, sans-serif" fontSize="12" fontWeight="bold" x="65" y="62">FRENTE UNIFICADO SAN IGNACIO</text>
                      <text fill="#62ff96" fontFamily="JetBrains Mono" fontSize="11" x="65" y="80">✓ 3 frentes consolidados (de 342)</text>
                      <text fill="#ffb59e" fontFamily="JetBrains Mono" fontSize="11" x="65" y="96">✓ 4,210 ha reales estimadas</text>
                      <text fill="#849396" fontFamily="JetBrains Mono" fontSize="9" x="65" y="110">Índice HFII: 8.6/10 (Severidad crítica)</text>
                    </svg>

                    {/* Active Status Banner */}
                    <div className="absolute top-4 left-6 px-3 py-1.5 rounded-lg bg-cyan-950/80 border border-cyan-400/40 text-[#00daf3] text-xs font-semibold flex items-center gap-2 shadow-[0_0_12px_rgba(0,229,255,0.3)]">
                      <span className="material-symbols-outlined text-[16px] text-[#22ef7e]">verified</span>
                      VISTA ARMONIZADA: 3 FRENTES DE FUEGO DETERMINADOS
                    </div>
                  </div>
                )}

                {/* Severity Legend */}
                <div className="absolute bottom-4 right-4 bg-[#181b25]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-3 z-10">
                  <span className="font-mono text-[9px] text-[#849396] uppercase">SEVERIDAD HFII:</span>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#22ef7e]"></span>
                    <span className="text-[9px] font-mono text-[#bac9cc]">Baja</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#ffb59e]"></span>
                    <span className="text-[9px] font-mono text-[#bac9cc]">Media</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#ff571a]"></span>
                    <span className="text-[9px] font-mono text-[#bac9cc]">Alta</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]"></span>
                    <span className="text-[9px] font-mono text-[#bac9cc]">Extrema</span>
                  </div>
                </div>
              </div>

              {/* Bottom Telemetry Readout Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-[#131722] border border-white/5 flex flex-col">
                  <span className="font-mono text-[10px] text-[#849396]">POLÍGONOS DETECTADOS</span>
                  <span className="font-mono text-base font-bold text-white mt-1">
                    {simulatorMode === 'armonizado' ? (
                      <span className="text-[#62ff96]">3 frentes consolidados</span>
                    ) : (
                      '342 puntos crudos'
                    )}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#131722] border border-white/5 flex flex-col">
                  <span className="font-mono text-[10px] text-[#849396]">ÁREA ESTIMADA</span>
                  <span className="font-mono text-base font-bold mt-1">
                    {simulatorMode === 'armonizado' ? (
                      <span className="text-[#00daf3]">4,210 ha reales</span>
                    ) : (
                      <span className="text-[#ffb59e]">Distorsión (+34,000 ha)</span>
                    )}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#131722] border border-white/5 flex flex-col">
                  <span className="font-mono text-[10px] text-[#849396]">RECURSOS REQUERIDOS</span>
                  <span className="font-mono text-base font-bold mt-1">
                    {simulatorMode === 'armonizado' ? (
                      <span className="text-[#22ef7e]">5 cuadrillas óptimas</span>
                    ) : (
                      <span className="text-[#ef4444]">24 cuadrillas (Sobredimensión)</span>
                    )}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#131722] border border-white/5 flex flex-col">
                  <span className="font-mono text-[10px] text-[#849396]">PRECISIÓN DE ASIGNACIÓN</span>
                  <span className="font-mono text-base font-bold mt-1">
                    {simulatorMode === 'armonizado' ? (
                      <span className="text-[#62ff96]">98.2% (Validado)</span>
                    ) : (
                      <span className="text-[#849396]">31% (Cruda)</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 6. SECCIÓN 5: IMPACTO EN BOSQUES ─── */}
        <section id="impacto-en-bosques" className="w-full bg-[#070b13]/80 py-20 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col gap-10">
            <div className="flex flex-col gap-2 max-w-2xl">
              <span className="font-mono text-xs text-[#00daf3] uppercase tracking-widest font-bold">
                APLICACIÓN OPERACIONAL INMEDIATA
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#dfe2f0] tracking-tight">
                De la teledetección a la acción en tierra
              </h2>
              <p className="text-sm sm:text-base text-[#bac9cc]">
                PyrosHarmonizer no es un ejercicio académico aislado: está estructurado para salvar vidas humanas, fauna y árboles en las tres escalas de respuesta en Bolivia.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Tactical Card 1 */}
              <div className="p-6 sm:p-8 rounded-2xl bg-[#131722] border border-white/5 flex flex-col justify-between group hover:border-orange-500/30 transition-all">
                <div className="flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#ff571a]/20 text-[#ff571a] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[28px]">local_fire_department</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#dfe2f0]">Bomberos y Cuadrillas</h3>
                  <p className="text-xs sm:text-sm text-[#bac9cc] leading-relaxed">
                    Ruta de aproximación segura y priorización estricta por vector de avance. Las cuadrillas ya no pierden jornadas persiguiendo píxeles fantasma generados por el reflejo térmico de nubes o salares.
                  </p>
                  <div className="p-3 rounded-xl bg-[#0a0e17] border border-white/5 flex flex-col gap-1.5">
                    <div className="font-mono text-xs text-[#62ff96] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px]">check</span> Ahorro del 40% en combustible táctico
                    </div>
                    <div className="font-mono text-xs text-[#62ff96] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px]">check</span> Alerta temprana de embolsamiento
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-3 font-mono text-xs text-[#849396] border-t border-white/5">
                  COE Santa Cruz • Brigadas Comunales
                </div>
              </div>

              {/* Tactical Card 2 */}
              <div className="p-6 sm:p-8 rounded-2xl bg-[#131722] border border-white/5 flex flex-col justify-between group hover:border-emerald-500/30 transition-all">
                <div className="flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#22ef7e]/20 text-[#22ef7e] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[28px]">forest</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#dfe2f0]">Guardaparques (SERNAP / ABT)</h3>
                  <p className="text-xs sm:text-sm text-[#bac9cc] leading-relaxed">
                    Alertas automáticas transmitidas vía Bot de Telegram y WhatsApp satelital ante la primera incursión de calor en zonas núcleo protegidas, permitiendo contención perimetral antes de que el fuego salte a copas.
                  </p>
                  <div className="p-3 rounded-xl bg-[#0a0e17] border border-white/5 flex flex-col gap-1.5">
                    <div className="font-mono text-xs text-[#62ff96] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px]">check</span> Intersección automática con mapas SERNAP
                    </div>
                    <div className="font-mono text-xs text-[#62ff96] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px]">check</span> Notificaciones de baja latencia
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-3 font-mono text-xs text-[#849396] border-t border-white/5">
                  22 Áreas Protegidas Nacionales
                </div>
              </div>

              {/* Tactical Card 3 */}
              <div className="p-6 sm:p-8 rounded-2xl bg-[#131722] border border-white/5 flex flex-col justify-between group hover:border-cyan-500/30 transition-all">
                <div className="flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#00e5ff]/20 text-[#00daf3] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[28px]">policy</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#dfe2f0]">Autoridades y Políticas</h3>
                  <p className="text-xs sm:text-sm text-[#bac9cc] leading-relaxed">
                    Generación en 1 clic de Reportes Ejecutivos en PDF con sustento científico y comparabilidad histórica para declaraciones de Desastre Departamental o activación de ayuda de cooperación internacional.
                  </p>
                  <div className="p-3 rounded-xl bg-[#0a0e17] border border-white/5 flex flex-col gap-1.5">
                    <div className="font-mono text-xs text-[#62ff96] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px]">check</span> Estadísticas no viciadas por cambio de sensor
                    </div>
                    <div className="font-mono text-xs text-[#62ff96] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px]">check</span> Auditoría espacial reproducible
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-3 font-mono text-xs text-[#849396] border-t border-white/5">
                  Ministerio de Medio Ambiente • Cancillería
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 7. SECCIÓN 6: PORTAL DE ACCESO EVALUADOR NASA ─── */}
        <section className="w-full py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <div className="relative p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-[#131722] via-[#181b25] to-[#070b13] border border-cyan-500/30 shadow-2xl overflow-hidden">
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#00e5ff]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#ff571a]/10 rounded-full blur-3xl pointer-events-none" />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                <div className="lg:col-span-7 flex flex-col gap-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0a0e17] border border-orange-500/30 self-start">
                    <span className="material-symbols-outlined text-[#ff571a] text-[16px]">stars</span>
                    <span className="font-mono text-[10px] text-[#ffdbd0] uppercase tracking-wider font-bold">
                      EVALUACIÓN NASA SPACE APPS 2026 • ACCESO INMEDIATO
                    </span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-[#dfe2f0] tracking-tight">
                    Portal de Acceso Evaluador NASA
                  </h2>
                  <p className="text-sm sm:text-base text-[#bac9cc] max-w-xl">
                    Acceso instantáneo para los jurados del Space Apps Challenge. El entorno de auditoría incluye el dataset de la Chiquitania precargado, filtros satelitales interactivos y exportación de informes PDF.
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <button
                      type="button"
                      onClick={() => handleQuickAccess('Jurado Evaluador NASA', 'jurado')}
                      className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#00daf3] to-[#00e5ff] text-[#00363d] font-bold text-sm sm:text-base shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:brightness-110 hover:scale-[1.02] transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
                      🚀 Ingresar como Jurado (1 Clic)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAccess('Guardaparque SERNAP', 'guardaparque')}
                      className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-[#1c1f29] hover:bg-[#262a34] text-white font-medium text-sm border border-white/10 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-[#22ef7e]">science</span>
                      Ingresar como Analista SERNAP
                    </button>
                  </div>

                  {loginNotification && (
                    <div className="mt-2 p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-[#62ff96] font-mono text-xs flex items-center gap-2 animate-fadeIn">
                      <span className="material-symbols-outlined text-[18px]">task_alt</span>
                      <span>{loginNotification}</span>
                    </div>
                  )}
                </div>

                {/* Quick Mocked Form Panel */}
                <div className="lg:col-span-5 p-6 rounded-2xl bg-[#0a0e17]/90 border border-white/10 shadow-inner flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-1 border-b border-white/5">
                    <span className="text-sm font-semibold text-white">Credencial Personalizada</span>
                    <span className="font-mono text-[10px] text-[#849396]">JWT SIMULATION</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[10px] text-[#849396] uppercase">ID de Evaluador</label>
                    <input
                      type="text"
                      readOnly
                      value="NASA-JURY-RETO8-2026"
                      className="w-full px-3 py-2 rounded-lg bg-[#181b25] text-[#dfe2f0] font-mono text-xs border border-white/10"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[10px] text-[#849396] uppercase">Dataset de Validación</label>
                    <select className="w-full px-3 py-2 rounded-lg bg-[#181b25] text-[#dfe2f0] font-mono text-xs border border-white/10 focus:outline-none focus:border-cyan-400">
                      <option>Bolivia - Chiquitania (Temporada 2024-2026)</option>
                      <option>P.N. Noel Kempff Mercado (Selva Amazónica)</option>
                      <option>Pantanal ANMI San Matías (Humedales)</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickAccess('Jurado Evaluador NASA', 'jurado')}
                    className="w-full mt-2 py-2.5 rounded-lg bg-[#1c1f29] hover:bg-cyan-500/20 text-[#00daf3] border border-cyan-500/30 font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">vpn_key</span>
                    Validar Token y Cargar Capas
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="w-full bg-[#070b13] py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col gap-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-col gap-2 max-w-xl">
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-[#c3f5ff] tracking-tight">PyrosHarmonizer</span>
                <span className="font-mono text-[10px] px-2.5 py-0.5 rounded bg-[#1c1f29] text-[#62ff96] border border-[#22ef7e]/30 font-semibold">
                  MISSION ACTIVE • ORBIT LEO
                </span>
              </div>
              <p className="text-xs text-[#bac9cc] leading-relaxed">
                Plataforma aeroespacial de resolución multisensor para homologar discordancias de resolución entre MODIS y VIIRS, protegiendo los biomas críticos de la Amazonía y Chiquitania boliviana.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-[#ffdbd0] font-mono text-xs transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">login</span>
                Portal de Acceso (Login)
              </Link>
              <a
                href="http://localhost:5000/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#181b25] hover:bg-[#262a34] text-[#00daf3] font-mono text-xs border border-white/5 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">api</span>
                OpenAPI Docs
              </a>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-6 bg-[#0a0e17] rounded-xl p-4 border border-white/5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[#bac9cc] font-mono text-xs">
              <span className="text-[#00daf3] font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">sensors</span>
                TELEMETRÍA &amp; SENSORES:
              </span>
              <span>NASA FIRMS</span>
              <span className="text-[#849396]">•</span>
              <span>MODIS C6.1 (Aqua/Terra 1km)</span>
              <span className="text-[#849396]">•</span>
              <span>VIIRS 375m (VNP14IMGTDL)</span>
              <span className="text-[#849396]">•</span>
              <span>SERNAP Bolivia</span>
              <span className="text-[#849396]">•</span>
              <span>ABT</span>
            </div>
            <div className="font-mono text-xs text-[#849396]">
              © 2026 NASA Space Apps Challenge • Team PyrosHarmonizer
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
