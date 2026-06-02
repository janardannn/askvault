export function Gem({ size = 40 }: { size?: number }) {
  return (
    <span className="gem" style={{ width: size, height: size }}>
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
        <defs>
          <linearGradient id="gemA" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#b6a4ff" />
            <stop offset="1" stopColor="#6d4aff" />
          </linearGradient>
          <linearGradient id="gemB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8b7cf6" />
            <stop offset="1" stopColor="#4c2fd0" />
          </linearGradient>
        </defs>
        <polygon points="24,3 39,16 24,45 9,16" fill="url(#gemB)" />
        <polygon points="24,3 39,16 24,22" fill="url(#gemA)" opacity="0.95" />
        <polygon points="24,3 9,16 24,22" fill="#cabfff" opacity="0.55" />
        <polygon points="9,16 24,22 24,45" fill="#3a23a8" opacity="0.55" />
        <polygon points="39,16 24,22 24,45" fill="#5436c9" opacity="0.7" />
      </svg>
    </span>
  );
}
