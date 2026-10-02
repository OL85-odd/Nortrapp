import { useMediaUrl } from '../../data/media';
import { bildeUrl, erMedia } from '../bilder';

/** Viser et bilde enten det er innebygd i appen eller lastet opp («media:…»). */
export function BildeVisning({ fil, alt, loading }: { fil: string; alt: string; loading?: 'lazy' | 'eager' }) {
  return erMedia(fil) ? <MediaBilde fil={fil} alt={alt} /> : <img src={bildeUrl(fil)} alt={alt} loading={loading} />;
}

function MediaBilde({ fil, alt }: { fil: string; alt: string }) {
  const url = useMediaUrl(fil);
  if (!url) return <span class="bilde-mangler">Bildet finnes ikke på denne maskinen</span>;
  return <img src={url} alt={alt} />;
}
