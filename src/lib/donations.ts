import { apiFetch, jsonRequest, readJson, readOptionalJson } from './api'

export const donationCurrency = String(
  import.meta.env.VITE_DONATION_CURRENCY ?? 'USD',
)

export const donationMinCents = 100
export const donationMaxCents = 100_000

const presetSource = String(
  import.meta.env.VITE_DONATION_PRESETS ?? '500,1000,2500',
)

export const donationPresetsCents: number[] = presetSource
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isInteger(value) && value > 0)

export const defaultPresetCents = donationPresetsCents[1] ?? 1000

export const donationCurrencySymbol = (() => {
  const parts = new Intl.NumberFormat(undefined, {
    currency: donationCurrency,
    style: 'currency',
  }).formatToParts(1)

  return parts.find((part) => part.type === 'currency')?.value ?? ''
})()

export function formatDonationAmount(cents: number) {
  return new Intl.NumberFormat(undefined, {
    currency: donationCurrency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    style: 'currency',
  }).format(cents / 100)
}

type DonationCheckoutResponse = {
  checkoutUrl?: unknown
  message?: unknown
}

export async function createDonationCheckout(
  amountCents: number,
  couponCode?: string,
) {
  const trimmedCoupon = couponCode?.trim()
  const response = await apiFetch(
    '/api/donations',
    jsonRequest({
      amountCents,
      ...(trimmedCoupon ? { couponCode: trimmedCoupon } : {}),
    }, { method: 'POST' }),
  )
  const data = await readOptionalJson<DonationCheckoutResponse>(response)

  if (!response.ok || typeof data?.checkoutUrl !== 'string') {
    throw new Error(
      typeof data?.message === 'string'
        ? data.message
        : 'Unable to start checkout. Please try again.',
    )
  }

  return data.checkoutUrl
}

export type DonationStatus = {
  hasDonated: boolean
  donationCount: number
  totalAmountCents: number
  currency: string | null
  lastDonationAt: string | null
}

export async function fetchDonationStatus(): Promise<DonationStatus | null> {
  const response = await apiFetch('/api/donations/me')

  if (response.status === 401) {
    return null
  }

  if (!response.ok) {
    throw new Error('Unable to load donation status')
  }

  const data = await readJson<Partial<DonationStatus>>(response)

  return {
    hasDonated: data.hasDonated === true,
    donationCount:
      typeof data.donationCount === 'number' ? data.donationCount : 0,
    totalAmountCents:
      typeof data.totalAmountCents === 'number' ? data.totalAmountCents : 0,
    currency: typeof data.currency === 'string' ? data.currency : null,
    lastDonationAt:
      typeof data.lastDonationAt === 'string' ? data.lastDonationAt : null,
  }
}
