import { Fragment } from 'preact';
import { useState } from 'preact/hooks';
import { db } from '../data/store';
import { mediaUrl, useMediaUrl } from '../data/media';
import { svarTekst } from '../prosess/motor';
import { prosessFor } from '../prosess/prosjekter';
import type { Prosjekt, ProsjektDokument } from '../prosess/types';
import { Modal } from '../ui/Modal';
import { DOK_NAVN, feltInfo } from './tolk';
import './innlesing.css';

/** Dokumentene som er lest inn i prosjektet, og verdiene som kom fra dem. */
export function DokumentDialog({ p, onLukk, onLesInn }: { p: Prosjekt; onLukk: () => void; onLesInn?: () => void }) {
  const [stor, setStor] = useState<string | null>(null);
  const prosess = prosessFor(p);
  const steg = prosess.faser.flatMap((f) => f.steg);
  const verdier = (prosess.innlesing?.felter ?? []).flatMap((f) => {
    const info = feltInfo(prosess, f);
    const s = steg.find((x) => x.id === f.nokkel && x.valg);
    const v = s ? p.svar[f.nokkel] : p.felt[f.nokkel];
    if (v === undefined || v === '') return [];
    const tekst = s ? svarTekst(s, v) : `${v}${info.enhet && info.art === 'tall' ? ' ' + info.enhet : ''}`;
    return [{ etikett: info.etikett, tekst }];
  });
  const navn = (id: string | null) => db.value.brukere.find((b) => b.id === id)?.initialer ?? '?';

  if (stor) {
    return (
      <Modal tittel="Dokument" etikett={p.nummer} onLukk={() => setStor(null)} bred>
        <StortBilde ref_={stor} />
        <div class="modal-knapper">
          <button class="btn" onClick={() => setStor(null)}>
            ← Tilbake
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal tittel="Dokumenter" etikett={p.nummer} onLukk={onLukk} bred>
      {(p.dokumenter ?? []).length === 0 ? (
        <p>Ingen dokumenter er lest inn ennå.</p>
      ) : (
        <ul class="dok-liste">
          {p.dokumenter!.map((d) => (
            <li key={d.id} class="dok-kort card">
              <span>
                <strong>{DOK_NAVN[d.type]}</strong> · {d.navn}
              </span>
              <span class="label">
                Lest inn {new Date(d.lest).toLocaleString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} av {navn(d.brukerId)}
                {d.ocr ? ' · skannet (OCR)' : ''}
              </span>
              <span class="dok-sider">
                {d.sider.map((s, i) => (
                  <Miniatyr key={s} ref_={s} tekst={`Side ${i + 1}`} onClick={() => setStor(s)} />
                ))}
              </span>
              <OriginalLenke d={d} />
            </li>
          ))}
        </ul>
      )}
      {verdier.length > 0 && (
        <>
          <span class="label">Bekreftede verdier fra dokumentene</span>
          <dl class="innleste">
            {verdier.map((v) => (
              <Fragment key={v.etikett}>
                <dt>{v.etikett}</dt>
                <dd>{v.tekst}</dd>
              </Fragment>
            ))}
          </dl>
        </>
      )}
      <div class="modal-knapper">
        {onLesInn && (
          <button class="btn" onClick={onLesInn}>
            ⇩ Les inn dokument
          </button>
        )}
        <button class="btn btn-primary" onClick={onLukk}>
          Lukk
        </button>
      </div>
    </Modal>
  );
}

function Miniatyr({ ref_, tekst, onClick }: { ref_: string; tekst: string; onClick: () => void }) {
  const url = useMediaUrl(ref_);
  return <button onClick={onClick}>{url ? <img src={url} alt={tekst} /> : <span class="label">{tekst}</span>}</button>;
}

function StortBilde({ ref_ }: { ref_: string }) {
  const url = useMediaUrl(ref_);
  return <div class="dok-stor">{url && <img src={url} alt="" />}</div>;
}

function OriginalLenke({ d }: { d: ProsjektDokument }) {
  return (
    <button
      class="btn liten"
      style={{ justifySelf: 'start' }}
      onClick={async () => {
        const url = await mediaUrl(d.fil);
        if (url) window.open(url, '_blank');
        else alert('Fant ikke originalfilen i denne nettleseren.');
      }}
    >
      Åpne originalen
    </button>
  );
}
