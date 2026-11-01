'use client';

import {
  ACTIVITES,
  CLIMATS,
  Condition,
  DESTINATIONS,
  HABITUDES,
  HEBERGEMENTS,
  MOTIFS,
  TRANCHES,
  TRANSPORTS,
  ZONES,
} from '@maillot/domain';
import { Plus, Trash2, X } from 'lucide-react';
import { ChoixPuces, ChoixUnique, classeSaisie } from '@/components/ui';

// Éditeur visuel des conditions : des « cas » reliés par OU ; dans un cas, des critères tous vrais (ET) ;
// dans un critère, une seule valeur suffit. Chaque cas peut avoir des exceptions (« sauf »).

type Liste =
  | 'motifs'
  | 'destinations'
  | 'climats'
  | 'zones'
  | 'transports'
  | 'hebergements'
  | 'activites'
  | 'ages'
  | 'sexes'
  | 'habitudes';
type Critere = Liste | 'machineALaver' | 'nuitsMin';
type Simple = Omit<Condition, 'sauf'>;

const LISTES: Record<Liste, { libelle: string; options: Record<string, string> }> = {
  motifs: { libelle: 'Motif du voyage', options: MOTIFS },
  destinations: { libelle: 'Destination', options: DESTINATIONS },
  climats: { libelle: 'Climat', options: CLIMATS },
  zones: { libelle: 'Zone', options: ZONES },
  transports: { libelle: 'Transport', options: TRANSPORTS },
  hebergements: { libelle: 'Hébergement', options: HEBERGEMENTS },
  activites: { libelle: 'Activité', options: ACTIVITES },
  ages: { libelle: 'Âge de la personne', options: TRANCHES },
  sexes: { libelle: 'Sexe de la personne', options: { F: 'Fille / femme', M: 'Garçon / homme' } },
  habitudes: { libelle: 'Habitude ou besoin', options: HABITUDES },
};

const CRITERES: Record<Critere, string> = {
  ...(Object.fromEntries(Object.entries(LISTES).map(([k, v]) => [k, v.libelle])) as Record<Liste, string>),
  machineALaver: 'Machine à laver',
  nuitsMin: 'Durée minimum',
};

const enTableau = <T,>(v?: T | T[]) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const ouUn = <T,>(v: T[]) => (v.length === 0 ? undefined : v.length === 1 ? v[0] : v);

function AjoutCritere({ dejaLa, ajouter }: { dejaLa: Critere[]; ajouter: (c: Critere) => void }) {
  const restants = (Object.keys(CRITERES) as Critere[]).filter((c) => !dejaLa.includes(c));
  if (!restants.length) return null;
  return (
    <select
      className={`${classeSaisie} w-auto self-start text-sm`}
      value=""
      onChange={(e) => e.target.value && ajouter(e.target.value as Critere)}
    >
      <option value="">+ Ajouter un critère…</option>
      {restants.map((c) => (
        <option key={c} value={c}>
          {CRITERES[c]}
        </option>
      ))}
    </select>
  );
}

/** Critères d'une condition (sans exceptions). */
function EditeurSimple({ valeur, onChange }: { valeur: Simple; onChange: (c: Simple) => void }) {
  const presents = (Object.keys(CRITERES) as Critere[]).filter((c) => valeur[c] !== undefined);
  const retirer = (c: Critere) => {
    const copie = { ...valeur };
    delete copie[c];
    onChange(copie);
  };
  const ajouter = (c: Critere) =>
    onChange({ ...valeur, [c]: c === 'machineALaver' ? true : c === 'nuitsMin' ? 7 : [] });

  return (
    <div className="flex flex-col gap-3">
      {presents.length === 0 && <p className="text-sm text-discret">Aucun critère : toujours vrai.</p>}
      {presents.map((c) => (
        <div key={c} className="flex flex-col gap-2 rounded-xl bg-fond p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">{CRITERES[c]}</span>
            <button
              type="button"
              aria-label={`Retirer le critère ${CRITERES[c]}`}
              onClick={() => retirer(c)}
              className="rounded-full p-1 text-discret hover:bg-bordure/60"
            >
              <X size={16} />
            </button>
          </div>
          {c === 'machineALaver' ? (
            <ChoixUnique
              options={{ oui: 'Avec machine à laver', non: 'Sans machine à laver' }}
              valeur={valeur.machineALaver ? 'oui' : 'non'}
              onChange={(v) => onChange({ ...valeur, machineALaver: v === 'oui' })}
            />
          ) : c === 'nuitsMin' ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="number"
                min={1}
                className={`${classeSaisie} w-24`}
                value={valeur.nuitsMin ?? ''}
                onChange={(e) =>
                  onChange({ ...valeur, nuitsMin: Math.max(1, Math.round(Number(e.target.value) || 1)) })
                }
              />
              nuits ou plus
            </label>
          ) : (
            <>
              <ChoixPuces
                options={LISTES[c].options}
                valeur={(valeur[c] as string[]) ?? []}
                onChange={(v) => onChange({ ...valeur, [c]: v })}
              />
              {(valeur[c] as string[]).length === 0 && (
                <span className="text-sm text-soleil">Choisis au moins une valeur, sinon le critère est ignoré.</span>
              )}
            </>
          )}
        </div>
      ))}
      <AjoutCritere dejaLa={presents} ajouter={ajouter} />
    </div>
  );
}

function EditeurCas({
  valeur,
  onChange,
  supprimer,
  numero,
}: {
  valeur: Condition;
  onChange: (c: Condition) => void;
  supprimer: () => void;
  numero?: number;
}) {
  const { sauf, ...simple } = valeur;
  const exceptions = enTableau(sauf);
  const majExceptions = (liste: Simple[]) => onChange({ ...simple, ...(liste.length && { sauf: ouUn(liste) }) });

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-bordure p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold">{numero ? `Cas ${numero}` : 'Condition'}</span>
        <button
          type="button"
          onClick={supprimer}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-danger hover:bg-danger/10"
        >
          <Trash2 size={15} /> Retirer
        </button>
      </div>
      <EditeurSimple valeur={simple} onChange={(s) => onChange({ ...s, ...(sauf && { sauf }) })} />

      {exceptions.map((e, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-xl border border-dashed border-danger/50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-danger">Sauf si…</span>
            <button
              type="button"
              aria-label="Retirer l’exception"
              onClick={() => majExceptions(exceptions.filter((_, j) => j !== i))}
              className="rounded-full p-1 text-discret hover:bg-bordure/60"
            >
              <X size={16} />
            </button>
          </div>
          <EditeurSimple valeur={e} onChange={(n) => majExceptions(exceptions.map((x, j) => (j === i ? n : x)))} />
        </div>
      ))}
      <button
        type="button"
        onClick={() => majExceptions([...exceptions, {}])}
        className="flex items-center gap-1 self-start text-sm font-semibold text-danger"
      >
        <Plus size={16} /> Ajouter une exception (sauf si…)
      </button>
    </div>
  );
}

export function EditeurConditions({
  valeur,
  onChange,
}: {
  valeur?: Condition | Condition[];
  onChange: (si: Condition | Condition[] | undefined) => void;
}) {
  const cas = enTableau(valeur);
  const maj = (liste: Condition[]) => onChange(ouUn(liste));

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-discret">
        Dans un cas, tous les critères doivent être vrais. Dans un critère, une seule valeur suffit. Plusieurs cas :
        l’un ou l’autre suffit.
      </p>
      {cas.length === 0 && (
        <p className="rounded-xl bg-fond p-3 text-sm">Aucune condition : l’article apparaît pour tout voyage.</p>
      )}
      {cas.map((c, i) => (
        <div key={i} className="flex flex-col gap-3">
          {i > 0 && (
            <span className="self-center rounded-full bg-accent-clair px-3 py-1 text-xs font-bold text-accent">OU</span>
          )}
          <EditeurCas
            valeur={c}
            numero={cas.length > 1 ? i + 1 : undefined}
            onChange={(n) => maj(cas.map((x, j) => (j === i ? n : x)))}
            supprimer={() => maj(cas.filter((_, j) => j !== i))}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => maj([...cas, {}])}
        className="flex items-center gap-1 self-start text-sm font-semibold text-accent"
      >
        <Plus size={16} /> {cas.length === 0 ? 'Ajouter une condition' : 'Ajouter un autre cas (OU)'}
      </button>
    </div>
  );
}
