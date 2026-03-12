import { app } from 'electron'
import { readFileSync } from 'fs'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

type TranslationData = Record<string, unknown>

let translations: TranslationData = {}
let fallback: TranslationData = {}

/**
 * Simple i18n helper for the main process.
 * Reads the same locale JSON files used by the renderer.
 */
export function initMainI18n(): void {
  const locale = app.getLocale().split('-')[0] // 'ja-JP' → 'ja'
  const supportedLocales = ['en', 'ja']
  const lang = supportedLocales.includes(locale) ? locale : 'en'

  const localesDir = is.dev
    ? join(__dirname, '../../src/renderer/src/i18n/locales')
    : join(__dirname, '../renderer/locales')

  try {
    const enData = readFileSync(join(localesDir, 'en.json'), 'utf-8')
    fallback = JSON.parse(enData)
  } catch { /* fallback to empty */ }

  if (lang !== 'en') {
    try {
      const langData = readFileSync(join(localesDir, `${lang}.json`), 'utf-8')
      translations = JSON.parse(langData)
    } catch { /* fallback to en */ }
  } else {
    translations = fallback
  }
}

/**
 * Get a translated string by dot-notation key.
 * Falls back to English, then to the key itself.
 *
 * @example t('tray.showWindow') // → 'Show Window' or 'ウィンドウを表示'
 */
export function t(key: string, defaultValue?: string): string {
  const result = getNestedValue(translations, key) ?? getNestedValue(fallback, key)
  if (typeof result === 'string') return result
  return defaultValue ?? key
}

function getNestedValue(obj: TranslationData, key: string): unknown {
  const keys = key.split('.')
  let current: unknown = obj
  for (const k of keys) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[k]
  }
  return current
}
