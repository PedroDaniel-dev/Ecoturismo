// Bandeiras em SVG (emojis de bandeira não aparecem no Windows).
const FLAGS = {
  pt: (
    <svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#009C3B" /><path d="M15 2.5 27 10 15 17.5 3 10Z" fill="#FFDF00" /><circle cx="15" cy="10" r="4.6" fill="#002776" /><path d="M10.6 9.2c3-.9 6.3-.5 8.9 1.1" stroke="#fff" strokeWidth=".8" fill="none" /></svg>
  ),
  es: (
    <svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#AA151B" /><rect y="5" width="30" height="10" fill="#F1BF00" /></svg>
  ),
  en: (
    <svg viewBox="0 0 30 20">
      <rect width="30" height="20" fill="#B22234" />
      {[1, 3, 5, 7, 9, 11].map(i => <rect key={i} y={(i * 20) / 13} width="30" height={20 / 13} fill="#fff" />)}
      <rect width="13" height={(20 / 13) * 7} fill="#3C3B6E" />
    </svg>
  ),
  fr: (
    <svg viewBox="0 0 30 20"><rect width="10" height="20" fill="#002395" /><rect x="10" width="10" height="20" fill="#fff" /><rect x="20" width="10" height="20" fill="#ED2939" /></svg>
  ),
};

export function Flag({ code, className = 'w-6 h-4' }) {
  return <span className={`inline-block overflow-hidden rounded-[3px] ring-1 ring-black/10 shrink-0 [&>svg]:w-full [&>svg]:h-full ${className}`}>{FLAGS[code] || FLAGS.pt}</span>;
}
