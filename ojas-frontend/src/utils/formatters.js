import { timeAgo } from './timeAgo'

const safeNumber = (value) => {
  if (value === undefined || value === null || isNaN(value)) {
    return null
  }
  return Number(value)
}

export const formatVoltage = (v) => {
  const num = safeNumber(v)
  return num !== null ? `${num.toFixed(1)} V` : '--'
}

export const formatCurrent = (a) => {
  const num = safeNumber(a)
  return num !== null ? `${num.toFixed(1)} A` : '--'
}

export const formatPower = (w) => {
  const num = safeNumber(w)
  if (num === null) return '--'
  return num >= 1000 ? `${(num / 1000).toFixed(2)} kW` : `${num} W`
}

export const formatEnergy = (kwh) => {
  const num = safeNumber(kwh)
  return num !== null ? `${num.toFixed(1)} kWh` : '--'
}

export const formatTemp = (t) => {
  const num = safeNumber(t)
  return num !== null ? `${num.toFixed(1)} °C` : '--'
}

export const formatLoad = (l) => {
  const num = safeNumber(l)
  return num !== null ? `${num}%` : '--'
}

export const formatFrequency = (f) => {
  const num = safeNumber(f)
  return num !== null ? `${num.toFixed(1)} Hz` : '--'
}

export const formatPowerFactor = (pf) => {
  const num = safeNumber(pf)
  return num !== null ? num.toFixed(2) : '--'
}

export const formatHumidity = (h) => {
  const num = safeNumber(h)
  return num !== null ? `${num}%` : '--'
}

export const formatCost = (kwh, rate) => {
  const kwhNum = safeNumber(kwh)
  const rateNum = safeNumber(rate)
  if (kwhNum === null || rateNum === null) return '--'
  const cost = kwhNum * rateNum
  return `$${cost.toFixed(2)}`
}

export const formatTimestamp = (ts) => {
  return timeAgo(ts)
}

export const formatRelativeTime = formatTimestamp
