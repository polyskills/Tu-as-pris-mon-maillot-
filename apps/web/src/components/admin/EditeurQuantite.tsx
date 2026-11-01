'use client';

import { decrireQuantite, RegleQuantite } from '@maillot/domain';
import { ChoixUnique, classeSaisie } from '@/components/ui';

const TYPES = {
  un: '1',
  fixe: 'Nombre fixe',
  parJour: 'Selon la durée',
  parClimat: 'Selon le climat',
  parParticipant: '1 par participant',
} as const;
type TypeQuantite = keyof typeof TYPES;

const PAR_DEFAUT: Record<Exclude<TypeQuantite, 'un'>, RegleQuantite> = {
  fixe: { type: 'fixe', n: 2 },
  parJour: { type: 'parJour', ratio: 1, max: 10 },
  parClimat: { type: 'parClimat', chaud: 1, tempere: 1, froid: 2 },
  parParticipant: { type: 'parParticipant' },
};

/** Champ numérique : vide = valeur absente (pour les réglages facultatifs). */
function Nombre({
  libelle,
  valeur,
  onChange,
  decimal,
  facultatif,
}: {
  libelle: string;
  valeur?: number;
  onChange: (v: number | undefined) => void;
  decimal?: boolean;
  facultatif?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-discret">
        {libelle}
        {facultatif && ' (facultatif)'}
      </span>
      <input
        type="number"
        inputMode={decimal ? 'decimal' : 'numeric'}
        step={decimal ? 0.1 : 1}
        min={0}
        className={classeSaisie}
        value={valeur ?? ''}
        onChange={(e) => {
          const brut = e.target.value.replace(',', '.');
          if (brut === '') return onChange(facultatif ? undefined : 0);
          const n = decimal ? Number(brut) : Math.round(Number(brut));
          if (Number.isFinite(n)) onChange(n);
        }}
      />
    </label>
  );
}

export function EditeurQuantite({
  valeur,
  onChange,
}: {
  valeur?: RegleQuantite;
  onChange: (q: RegleQuantite | undefined) => void;
}) {
  const type: TypeQuantite = valeur?.type ?? 'un';
  return (
    <div className="flex flex-col gap-3">
      <ChoixUnique
        options={TYPES}
        valeur={type}
        onChange={(t) => onChange(t === 'un' ? undefined : t === type ? valeur : PAR_DEFAUT[t])}
      />
      {valeur?.type === 'fixe' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Nombre
            libelle="Nombre"
            valeur={valeur.n}
            onChange={(n) => onChange({ ...valeur, n: Math.max(1, n ?? 1) })}
          />
        </div>
      )}
      {valeur?.type === 'parJour' && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Nombre
              libelle="Par jour"
              decimal
              valeur={valeur.ratio}
              onChange={(ratio) => onChange({ ...valeur, ratio: ratio ?? 0 })}
            />
            <Nombre
              libelle="Par jour au chaud"
              decimal
              facultatif
              valeur={valeur.auChaud}
              onChange={(auChaud) => onChange({ ...valeur, auChaud })}
            />
            <Nombre
              libelle="En plus"
              facultatif
              valeur={valeur.plus}
              onChange={(plus) => onChange({ ...valeur, plus: plus || undefined })}
            />
            <Nombre
              libelle="Maximum"
              facultatif
              valeur={valeur.max}
              onChange={(max) => onChange({ ...valeur, max: max || undefined })}
            />
          </div>
          <p className="text-sm text-discret">
            Jours = nuits + 1, plafonnés à 7 avec une machine à laver. Résultat arrondi au supérieur, 1 minimum.
          </p>
        </>
      )}
      {valeur?.type === 'parClimat' && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          <Nombre
            libelle="Chaud"
            valeur={valeur.chaud}
            onChange={(chaud) => onChange({ ...valeur, chaud: chaud ?? 0 })}
          />
          <Nombre
            libelle="Tempéré"
            valeur={valeur.tempere}
            onChange={(tempere) => onChange({ ...valeur, tempere: tempere ?? 0 })}
          />
          <Nombre
            libelle="Froid"
            valeur={valeur.froid}
            onChange={(froid) => onChange({ ...valeur, froid: froid ?? 0 })}
          />
        </div>
      )}
      {valeur?.type === 'parParticipant' && (
        <p className="text-sm text-discret">Pour un article commun : autant que de voyageurs.</p>
      )}
      <p className="text-sm">
        <span className="text-discret">Résumé : </span>
        {decrireQuantite(valeur)}
      </p>
    </div>
  );
}
