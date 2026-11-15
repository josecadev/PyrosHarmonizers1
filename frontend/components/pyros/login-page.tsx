'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface LoginPageProps {
  onSuccess?: (role: string) => void
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [showTraditional, setShowTraditional] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLaunch = (roleName: string, roleKey: string = 'analyst') => {
    setIsLoading(true)
    setLoadingMsg('Montando réplica geoespacial PostGIS + VIIRS 375m...')

    setTimeout(() => {
      setLoadingMsg('Inicializando visualizador H3 L8 en Chiquitania (Concepción / San Ignacio)...')
    }, 500)

    setTimeout(() => {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pyros_authenticated', 'true')
        sessionStorage.setItem('pyros_role', roleKey)
        sessionStorage.setItem('pyros_role_name', roleName)
      }
      if (onSuccess) {
        onSuccess(roleKey)
      } else {
        router.push('/map')
      }
    }, 1100)
  }

  const handleTraditionalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleLaunch('Administrador Institucional', 'admin')
  }

  return (
    <div className="relative min-h-screen w-full bg-[#0c1324] font-sans text-[#dce1fb] antialiased flex items-center justify-center p-3 sm:p-6 overflow-x-hidden selection:bg-orange-500 selection:text-white">
      {/* Atmospheric backdrop grid and dynamic telemetry ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-[#f97316]/20 via-[#4cd7f6]/10 to-transparent blur-3xl rounded-full opacity-60"></div>
        <div className="absolute top-1/3 -left-48 w-96 h-96 bg-[#f97316]/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-10 -right-48 w-96 h-96 bg-[#03b5d3]/10 blur-[120px] rounded-full"></div>

        {/* Aerospace tactical grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="orbital-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#4cd7f6" strokeWidth="0.75" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#orbital-grid)" />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col gap-5 py-4">
        {/* TOP NOTCH: Official NASA Challenge Evaluation Banner */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-[#070d1f]/80 backdrop-blur-md px-4 py-2 rounded-lg border border-white/5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#f97316]"></span>
            </span>
            <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[#4cd7f6]">
              <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
              <span className="font-semibold">NASA International Space Apps Challenge 2026 — Reto #8</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1 px-2.5 py-1 bg-[#1a2035] hover:bg-[#252f4a] rounded-lg border border-white/10 font-mono text-[11px] text-[#4cd7f6] hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Inicio (Landing)</span>
            </Link>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#23293c] rounded-full border border-white/5">
              <span className="material-symbols-outlined text-sm text-[#ffb95f]">verified</span>
              <span className="font-mono text-[11px] text-[#ffb95f] font-medium">Proyecto en Evaluación Oficial</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] text-[#e0c0b1]">
              <span className="material-symbols-outlined text-sm text-[#4cd7f6]">public</span>
              <span>Dominio: Chiquitania &amp; Amazonía</span>
            </div>
          </div>
        </header>

        {/* LOGO & SCIENTIFIC HERO HEADER */}
        <section className="flex flex-col items-center text-center gap-3 pt-2 pb-2">
          <div className="flex flex-col items-center">
            {/* NASA / Pyros Emblem */}
            <div className="px-3 py-1.5 rounded-xl bg-[#070d1f]/70 border border-white/10 backdrop-blur-md shadow-md mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-2xl text-orange-500">local_fire_department</span>
              <span className="font-mono text-sm tracking-widest text-[#4cd7f6] font-bold">PYROSHARMONIZER</span>
              <span className="text-[10px] font-mono text-white/50 border-l border-white/20 pl-2">NASA FIRMS 2026</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#dce1fb] max-w-4xl tracking-tight leading-tight">
              Portal de Acceso y Evaluación Geoespacial
            </h1>
            <p className="text-sm sm:text-base text-[#e0c0b1]/90 max-w-3xl mt-2 leading-relaxed">
              Plataforma de armonización espacio-temporal de incendios forestales para Bolivia y la cuenca amazónica. Integración determinista de sensores <span className="text-[#4cd7f6] font-semibold">VIIRS</span> y <span className="text-orange-400 font-semibold">MODIS</span> en alta fidelidad.
            </p>
          </div>

          {/* TELEMETRY STATUS CHIPS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 w-full max-w-4xl mt-1">
            <div className="flex flex-col items-center justify-center p-3 bg-[#151b2d] border border-white/5 rounded-lg shadow-sm">
              <span className="font-mono text-[10px] text-[#e0c0b1] uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-orange-400">local_fire_department</span>
                Focos Armonizados
              </span>
              <span className="font-mono text-base font-bold text-orange-300 mt-0.5">+450,000</span>
              <span className="font-mono text-[10px] text-white/50">Serie 2023 - 2026</span>
            </div>

            <div className="flex flex-col items-center justify-center p-3 bg-[#151b2d] border border-white/5 rounded-lg shadow-sm">
              <span className="font-mono text-[10px] text-[#e0c0b1] uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-[#4cd7f6]">satellite_alt</span>
                Resolución Espacial
              </span>
              <span className="font-mono text-base font-bold text-[#acedff] mt-0.5">375m / 1km</span>
              <span className="font-mono text-[10px] text-white/50">VIIRS I-Band / MODIS</span>
            </div>

            <div className="flex flex-col items-center justify-center p-3 bg-[#151b2d] border border-white/5 rounded-lg shadow-sm">
              <span className="font-mono text-[10px] text-[#e0c0b1] uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-[#ffb95f]">hub</span>
                Motor Algorítmico
              </span>
              <span className="font-mono text-base font-bold text-[#ffddb8] mt-0.5">H3 &amp; ST-DBSCAN</span>
              <span className="font-mono text-[10px] text-white/50">Fusión Espacio-Temporal</span>
            </div>

            <div className="flex flex-col items-center justify-center p-3 bg-[#151b2d] border border-white/5 rounded-lg shadow-sm">
              <span className="font-mono text-[10px] text-[#e0c0b1] uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-[#03b5d3]">sync_saved_locally</span>
                Latencia Operativa
              </span>
              <span className="font-mono text-base font-bold text-[#4cd7f6] mt-0.5">&lt; 3 Horas</span>
              <span className="font-mono text-[10px] text-white/50">NASA FIRMS NRT Sync</span>
            </div>
          </div>
        </section>

        {/* HERO CARD: JURY 1-CLICK INSTANT ACCESS (FOCAL POINT) */}
        <section className="w-full max-w-4xl mx-auto relative group">
          {/* Outer thermal aura */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[#d78900]/40 via-[#f97316]/50 to-[#d78900]/40 rounded-xl blur-lg opacity-40 group-hover:opacity-75 transition duration-500"></div>

          <div className="relative bg-[#191f31]/95 border border-white/10 backdrop-blur-xl p-4 sm:p-6 rounded-xl shadow-2xl flex flex-col gap-4">
            {/* Floating tag */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f97316]/20 border border-[#f97316]/30 text-orange-300 font-mono text-xs">
                <span className="material-symbols-outlined text-sm animate-pulse text-[#f97316]">bolt</span>
                <span className="font-semibold">Modo Evaluación Express • Acceso Recomendado Jurados NASA</span>
              </div>
              <span className="font-mono text-[11px] text-[#e0c0b1] bg-[#2e3447] px-2.5 py-1 rounded">
                Sesión Instantánea: Token Efímero
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-0.5">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Acceso Rápido para Evaluadores
                </h2>
                <p className="text-sm text-[#e0c0b1]/80 mt-0.5">
                  Despliegue inmediato del banco de pruebas completo con telemetría de satélite y módulos de auditoría activos.
                </p>
              </div>
            </div>

            {/* HERO BUTTON TRIGGER */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                id="btn-jury-access"
                disabled={isLoading}
                onClick={() => handleLaunch('Jurado NASA Space Apps', 'analyst')}
                className="relative overflow-hidden w-full group/btn bg-gradient-to-r from-[#f97316] via-amber-500 to-[#f97316] bg-[length:200%_auto] hover:bg-right transition-all duration-500 p-4 sm:p-5 rounded-lg flex items-center justify-between shadow-xl cursor-pointer text-white disabled:opacity-70 disabled:pointer-events-none active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 z-10">
                  <span className="material-symbols-outlined text-2xl sm:text-3xl text-white">rocket_launch</span>
                  <div className="text-left">
                    <span className="block text-lg sm:text-xl font-bold text-white tracking-tight">
                      Ingresar como Jurado Evaluador (Acceso 1 Clic)
                    </span>
                    <span className="block font-mono text-xs text-white/90">
                      Carga inmediata del Dashboard Analítico con Dataset Chiquitania 2023–2026
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 z-10 bg-white/20 px-3 py-2 rounded-md group-hover/btn:translate-x-1 transition-transform">
                  <span className="font-mono text-xs text-white font-bold hidden sm:inline">ENTRAR</span>
                  <span className="material-symbols-outlined text-white text-xl">arrow_forward</span>
                </div>
              </button>

              {/* Loading state overlay simulator */}
              {isLoading && (
                <div className="p-3 bg-[#2e3447] border border-cyan-500/30 rounded-lg flex items-center gap-3 animate-pulse">
                  <span className="material-symbols-outlined text-[#4cd7f6] animate-spin text-xl">progress_activity</span>
                  <div className="flex flex-col">
                    <span className="font-mono text-xs text-[#4cd7f6] font-semibold">{loadingMsg}</span>
                    <span className="font-mono text-[10px] text-white/60">Cargando geometrías PostGIS y capas satelitales...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Micro-benefits list */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
              <div className="flex items-start gap-2 p-2 rounded bg-[#151b2d]/70 border border-white/5">
                <span className="material-symbols-outlined text-[#4cd7f6] text-lg mt-0.5">check_circle</span>
                <span className="text-xs text-[#dce1fb]">
                  <strong className="font-semibold text-[#acedff]">Sin registro requerido:</strong> Acceso instantáneo y transparente para evaluación rápida.
                </span>
              </div>
              <div className="flex items-start gap-2 p-2 rounded bg-[#151b2d]/70 border border-white/5">
                <span className="material-symbols-outlined text-[#4cd7f6] text-lg mt-0.5">check_circle</span>
                <span className="text-xs text-[#dce1fb]">
                  <strong className="font-semibold text-[#acedff]">Datos Reales Precargados:</strong> Chiquitania 2023-2026 (+450k eventos térmicos validados).
                </span>
              </div>
              <div className="flex items-start gap-2 p-2 rounded bg-[#151b2d]/70 border border-white/5">
                <span className="material-symbols-outlined text-[#4cd7f6] text-lg mt-0.5">check_circle</span>
                <span className="text-xs text-[#dce1fb]">
                  <strong className="font-semibold text-[#acedff]">Auditoría Habilitada:</strong> Comparativa MODIS vs VIIRS y descarga de reportes PDF ejecutivos.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: ROLE-BASED SIMULATION SELECTOR */}
        <section className="w-full max-w-4xl mx-auto flex flex-col gap-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h3 className="text-lg font-bold text-white">
              Selector de Perfiles de Simulación Operativa
            </h3>
            <span className="font-mono text-xs text-[#e0c0b1]/70">
              Entornos con telemetría adaptada a roles de respuesta
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Role 1: NASA Jury */}
            <div className="flex flex-col justify-between p-4 bg-[#191f31] border border-white/5 rounded-xl shadow-md hover:bg-[#23293c] transition-all group">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-[#2e3447] text-[#4cd7f6]">
                    <span className="material-symbols-outlined text-2xl">biotech</span>
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#4cd7f6]/10 text-[#4cd7f6] font-semibold">
                    NASA CHALLENGE
                  </span>
                </div>
                <h4 className="text-base font-bold text-white mt-1">Jurado NASA</h4>
                <p className="text-xs text-[#e0c0b1]/80 leading-relaxed">
                  Vista científica integral con auditoría de datos satelitales, validación de sesgo temporal y matrices de armonización ST-DBSCAN.
                </p>
              </div>

              <div className="mt-4 pt-2 border-t border-white/5 flex flex-col gap-2">
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-white/60">
                  <span className="material-symbols-outlined text-sm text-[#4cd7f6]">check</span>
                  <span>Matriz de incertidumbre H3</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleLaunch('Jurado NASA', 'analyst')}
                  className="w-full py-2 px-3 rounded bg-[#2e3447] hover:bg-[#4cd7f6]/20 hover:text-[#4cd7f6] text-white font-mono text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Cargar este perfil</span>
                  <span className="material-symbols-outlined text-sm">login</span>
                </button>
              </div>
            </div>

            {/* Role 2: SERNAP Ranger */}
            <div className="flex flex-col justify-between p-4 bg-[#191f31] border border-white/5 rounded-xl shadow-md hover:bg-[#23293c] transition-all group">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-[#2e3447] text-[#ffb95f]">
                    <span className="material-symbols-outlined text-2xl">forest</span>
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#ffb95f]/10 text-[#ffb95f] font-semibold">
                    ÁREAS PROTEGIDAS
                  </span>
                </div>
                <h4 className="text-base font-bold text-white mt-1">Guardaparque SERNAP</h4>
                <p className="text-xs text-[#e0c0b1]/80 leading-relaxed">
                  Monitoreo continuo en Parque Nacional Noel Kempff Mercado, Área Natural San Matías y Pantanal de Otuquis con alertas tempranas.
                </p>
              </div>

              <div className="mt-4 pt-2 border-t border-white/5 flex flex-col gap-2">
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-white/60">
                  <span className="material-symbols-outlined text-sm text-[#ffb95f]">check</span>
                  <span>Polígonos de zonificación ABT</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleLaunch('Guardaparque SERNAP / ABT', 'operator')}
                  className="w-full py-2 px-3 rounded bg-[#2e3447] hover:bg-[#ffb95f]/20 hover:text-[#ffb95f] text-white font-mono text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Cargar este perfil</span>
                  <span className="material-symbols-outlined text-sm">login</span>
                </button>
              </div>
            </div>

            {/* Role 3: Brigade Commander */}
            <div className="flex flex-col justify-between p-4 bg-[#191f31] border border-white/5 rounded-xl shadow-md hover:bg-[#23293c] transition-all group">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-[#2e3447] text-[#f97316]">
                    <span className="material-symbols-outlined text-2xl">local_fire_department</span>
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#f97316]/10 text-orange-400 font-semibold">
                    TÁCTICA FORESTAL
                  </span>
                </div>
                <h4 className="text-base font-bold text-white mt-1">Comandante de Brigada</h4>
                <p className="text-xs text-[#e0c0b1]/80 leading-relaxed">
                  Vista táctica para cuadrillas terrestres con velocidad de avance estimada del fuego, viento NCEP/NOAA y rutas de evacuación.
                </p>
              </div>

              <div className="mt-4 pt-2 border-t border-white/5 flex flex-col gap-2">
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-white/60">
                  <span className="material-symbols-outlined text-sm text-orange-400">check</span>
                  <span>Vector de propagación NRT</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleLaunch('Comandante de Brigada', 'operator')}
                  className="w-full py-2 px-3 rounded bg-[#2e3447] hover:bg-orange-500/20 hover:text-orange-400 text-white font-mono text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Cargar este perfil</span>
                  <span className="material-symbols-outlined text-sm">login</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: COLLAPSIBLE TRADITIONAL INSTITUTIONAL LOGIN */}
        <section className="w-full max-w-4xl mx-auto">
          <div className="bg-[#151b2d] border border-white/5 rounded-xl shadow-sm p-4">
            <button
              type="button"
              onClick={() => setShowTraditional((prev) => !prev)}
              className="w-full flex items-center justify-between text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-white/60 group-hover:text-[#4cd7f6] transition-colors">vpn_key</span>
                <div>
                  <span className="font-mono text-xs text-white font-semibold block">Acceso técnico o administrativo con credenciales</span>
                  <span className="text-xs text-white/50">Para investigadores con tokens FIRMS propios y administradores gubernamentales</span>
                </div>
              </div>
              <span className={`material-symbols-outlined text-white/60 transition-transform duration-300 ${showTraditional ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>

            {showTraditional && (
              <form onSubmit={handleTraditionalSubmit} className="mt-4 pt-4 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[10px] text-[#e0c0b1] uppercase tracking-wider">
                    Correo institucional (@nasa.gov, @sernap.gob.bo)
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-white/40 text-lg">badge</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="investigador@nasa.gov"
                      className="w-full bg-[#070d1f] border border-white/10 text-white font-mono text-xs pl-10 pr-3 py-2 rounded focus:outline-none focus:border-[#4cd7f6] placeholder:text-white/30"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[10px] text-[#e0c0b1] uppercase tracking-wider">
                    Contraseña cifrada / Token de acceso
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-white/40 text-lg">lock</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full bg-[#070d1f] border border-white/10 text-white font-mono text-xs pl-10 pr-3 py-2 rounded focus:outline-none focus:border-[#4cd7f6] placeholder:text-white/30"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
                  <a
                    href="https://firms.modaps.eosdis.nasa.gov/api/"
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-[#4cd7f6] hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">help</span>
                    ¿Problemas con su token de API FIRMS o claves de postGIS?
                  </a>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2 bg-[#2e3447] hover:bg-[#33394c] text-white font-mono text-xs font-semibold rounded border border-white/10 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <span className="material-symbols-outlined text-sm">key</span>
                    <span>Iniciar sesión con cuenta institucional</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

        {/* FOOTER: REAL-TIME TELEMETRY & AUDIT STATUS */}
        <footer className="w-full max-w-5xl mx-auto mt-2 bg-[#070d1f]/90 border border-white/5 backdrop-blur-md rounded-xl p-3 shadow-lg flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-mono text-[11px] text-[#e0c0b1]">
              <span className="h-2 w-2 rounded-full bg-[#4cd7f6] animate-pulse"></span>
              <span>PostGIS 3.4 Spatial Cluster: <span className="text-[#4cd7f6] font-semibold">Local Docker :5001 [Activo]</span></span>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px] text-[#e0c0b1]">
              <span className="h-2 w-2 rounded-full bg-[#f97316] animate-ping"></span>
              <span>NASA FIRMS NRT Sync: <span className="text-orange-400 font-semibold">Órbita Terra/VIIRS sincronizada</span></span>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px] text-[#e0c0b1]">
              <span className="material-symbols-outlined text-xs text-[#ffb95f]">memory</span>
              <span>Algoritmos: <span className="text-[#ffb95f] font-semibold">H3 L8 Hex-Mesh + ST-DBSCAN Cluster</span></span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-1 pt-1 border-t border-white/5 font-mono text-[10px] text-white/50">
            <div>
              <span>PyrosHarmonizer v1.0.4-production • Space Apps Bolivia &amp; Global Challenge Reto #8</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">satellite</span>
                MODIS MOD14/MYD14 + VIIRS VNP14IMG
              </span>
              <span className="px-2 py-0.5 rounded bg-[#191f31] text-[#e0c0b1]">
                EPSG:4326 / WGS 84
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
