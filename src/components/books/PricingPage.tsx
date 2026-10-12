import { useState } from 'react'
import { signInWithGithub, useBookAccess } from './access'
import { BooksLayout } from './BooksLayout'
import { CheckIcon } from './icons'

const features = [
  'All current books',
  'Every future book',
  'Newsletter',
  'Email when a new book is out',
]

export function PricingPage() {
  const { isSignedIn, isSubscribed } = useBookAccess()
  const [notice, setNotice] = useState('')

  const subscribe = () => {
    if (!isSignedIn) {
      signInWithGithub()
      return
    }
    // Checkout (Dodo subscription) is wired up in the billing phase.
    setNotice('Checkout is not live yet.')
  }

  return (
    <BooksLayout active="pricing" grid>
      <main className="bk-main bk-main--center">
        <h1 className="bk-h1 bk-center">One plan. Every book.</h1>

        <section aria-label="Plan" className="bk-plan">
          <div className="bk-plan__price">
            <span className="bk-plan__amount">$5</span>
            <span className="bk-muted">/ month</span>
          </div>
          <ul className="bk-plan__list">
            {features.map((feature) => (
              <li key={feature}>
                <CheckIcon size={16} />
                {feature}
              </li>
            ))}
          </ul>
          {isSubscribed ? (
            <a className="bk-btn bk-btn--primary bk-btn--block" href="/books">
              Go to books
            </a>
          ) : (
            <button className="bk-btn bk-btn--primary bk-btn--block" onClick={subscribe} type="button">
              Subscribe
            </button>
          )}
          <span aria-live="polite" className="bk-plan__foot">
            {notice || 'Cancel anytime'}
          </span>
        </section>
      </main>
    </BooksLayout>
  )
}
