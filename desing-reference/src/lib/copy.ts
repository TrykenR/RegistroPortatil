import type { ErrCode } from './store'

/** Human voice for every failure: a person explaining, not a system reporting. */
export const ERR: Record<ErrCode, string> = {
  invalid: 'Escribe tu documento completo, solo números.',
  not_owner: 'Ese equipo no está vinculado a tu documento.',
  rate: 'Demasiados intentos. Espera un momento y vuelve a intentar.',
  down: 'El sistema está fuera de servicio por ahora. Pasa con el portero e inténtalo de nuevo más tarde.',
  consent: 'Debes aceptar el tratamiento de tus datos para continuar.',
  noconn: 'Tu primer registro necesita conexión. Busca señal o pasa con el portero.',
  name: 'Escribe tu nombre y tu apellido.',
  laptop: 'Elige la marca y el color de tu equipo.',
  auth: 'Usuario o clave incorrectos.',
}

export const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true })

export const fmtDateTime = (t: number) =>
  new Date(t).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
