import { siteName, siteNameLead, siteNameRest } from '../lib/site'

export function Brand() {
  return (
    <a
      aria-label={`${siteName} home`}
      className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-foreground"
      href="/"
    >
      <img
        alt=""
        className="size-7 rounded-[9px]"
        height="28"
        src="/favicon.svg"
        width="28"
      />
      <span>
        <span className="text-foreground">{siteNameLead}</span>
        <span className="text-foreground">{siteNameRest}</span>
      </span>
    </a>
  )
}
