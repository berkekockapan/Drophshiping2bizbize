interface TrendyolExternalLinkProps {
  href: string;
  label: string;
  size?: "sm" | "md";
}

const sizeClasses = {
  sm: {
    button: "h-9 w-9 rounded-2xl",
    icon: "h-5 w-5",
  },
  md: {
    button: "h-10 w-10 rounded-[18px]",
    icon: "h-6 w-6",
  },
} as const;

export function TrendyolExternalLink({ href, label, size = "md" }: TrendyolExternalLinkProps) {
  const classes = sizeClasses[size];

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center border border-orange-200 bg-[#fff3e8] text-[#f27a1a] shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:bg-[#ffe8d2] focus:outline-none focus:ring-2 focus:ring-orange-300 ${classes.button}`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={classes.icon}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="2.5" y="2.5" width="19" height="19" rx="6.5" fill="currentColor" />
        <path d="M7.75 7.5H16.25V10H13.25V16.5H10.75V10H7.75V7.5Z" fill="white" />
      </svg>
    </a>
  );
}
