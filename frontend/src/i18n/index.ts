import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from '../locales/en'
import { tr } from '../locales/tr'

const STORAGE_KEY = 'gezify.lang'

function readStoredLng(): 'en' | 'tr' {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'tr' || v === 'en') return v
  } catch {
    /* ignore */
  }
  return 'en'
}

const initialLng = readStoredLng()

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    tr: { translation: tr },
  },
  lng: initialLng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
  try {
    localStorage.setItem(STORAGE_KEY, lng)
  } catch {
    /* ignore */
  }
})

document.documentElement.lang = initialLng

export { i18n }
