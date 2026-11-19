import { initials } from '../lib/format.js';

/** Club badge, or a neat initials badge when we don't have the club's logo. */
export default function TeamLogo({ src, name, className = '' }) {
  if (src) return <img src={src} alt="" loading="lazy" className={`tlogo ${className}`} />;
  return (
    <span className={`tlogo tlogo--initials ${className}`} title={name} aria-hidden>
      {initials(name)}
    </span>
  );
}
