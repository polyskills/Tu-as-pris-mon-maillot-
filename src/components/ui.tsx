import { ReactNode } from 'react';
import { Pressable, Switch, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { Profil } from '../domain/types';
import { COULEURS_PROFIL, creerStyles, useCouleurs } from './theme';

export function Bouton({
  titre,
  onPress,
  variante = 'plein',
  desactive,
  style,
}: {
  titre: string;
  onPress: () => void;
  variante?: 'plein' | 'contour' | 'danger' | 'discret';
  desactive?: boolean;
  style?: ViewStyle;
}) {
  const c = useCouleurs();
  const s = useStyles();
  const couleurTexte = { plein: c.accentTexte, contour: c.accent, danger: c.danger, discret: c.discret }[variante];
  return (
    <Pressable
      onPress={onPress}
      disabled={desactive}
      style={({ pressed }) => [
        s.bouton,
        variante === 'plein' && { backgroundColor: c.accent },
        variante === 'contour' && { borderWidth: 1, borderColor: c.accent },
        variante === 'danger' && { borderWidth: 1, borderColor: c.danger },
        (pressed || desactive) && { opacity: 0.45 },
        style,
      ]}
    >
      <Text style={[s.boutonTexte, { color: couleurTexte }]}>{titre}</Text>
    </Pressable>
  );
}

export function Puce({ libelle, actif, onPress }: { libelle: string; actif: boolean; onPress: () => void }) {
  const s = useStyles();
  return (
    <Pressable onPress={onPress} style={[s.puce, actif && s.puceActive]}>
      <Text style={[s.puceTexte, actif && s.puceTexteActif]}>{libelle}</Text>
    </Pressable>
  );
}

/** Groupe de puces à choix multiple. */
export function ChoixPuces<K extends string>({
  options,
  valeur,
  onChange,
}: {
  options: Record<K, string>;
  valeur: K[];
  onChange: (v: K[]) => void;
}) {
  const s = useStyles();
  return (
    <View style={s.puces}>
      {(Object.keys(options) as K[]).map((k) => (
        <Puce
          key={k}
          libelle={options[k]}
          actif={valeur.includes(k)}
          onPress={() => onChange(valeur.includes(k) ? valeur.filter((x) => x !== k) : [...valeur, k])}
        />
      ))}
    </View>
  );
}

export function ChoixUnique<K extends string>({
  options,
  valeur,
  onChange,
}: {
  options: Record<K, string>;
  valeur: K;
  onChange: (v: K) => void;
}) {
  const s = useStyles();
  return (
    <View style={s.puces}>
      {(Object.keys(options) as K[]).map((k) => (
        <Puce key={k} libelle={options[k]} actif={valeur === k} onPress={() => onChange(k)} />
      ))}
    </View>
  );
}

export function Champ({ libelle, aide, children }: { libelle: string; aide?: string; children: ReactNode }) {
  const s = useStyles();
  return (
    <View style={s.champ}>
      <Text style={s.libelle}>{libelle}</Text>
      {aide && <Text style={s.discret}>{aide}</Text>}
      {children}
    </View>
  );
}

export function Saisie(props: TextInputProps) {
  const c = useCouleurs();
  const s = useStyles();
  return <TextInput placeholderTextColor={c.discret} {...props} style={[s.saisie, props.style]} />;
}

export function Interrupteur({ libelle, aide, valeur, onChange }: { libelle: string; aide?: string; valeur: boolean; onChange: (v: boolean) => void }) {
  const c = useCouleurs();
  const s = useStyles();
  return (
    <View style={s.ligneEspacee}>
      <View style={{ flex: 1 }}>
        <Text style={s.libelle}>{libelle}</Text>
        {aide && <Text style={s.discret}>{aide}</Text>}
      </View>
      <Switch value={valeur} onValueChange={onChange} trackColor={{ true: c.accent }} />
    </View>
  );
}

export function Compteur({ valeur, onChange, min = 0, suffixe }: { valeur: number; onChange: (v: number) => void; min?: number; suffixe?: string }) {
  const s = useStyles();
  return (
    <View style={s.compteur}>
      <Pressable style={s.compteurBouton} onPress={() => onChange(Math.max(min, valeur - 1))} hitSlop={6}>
        <Text style={s.compteurSigne}>−</Text>
      </Pressable>
      <Text style={s.compteurValeur}>
        {valeur}
        {suffixe ? <Text style={s.discret}> {suffixe}</Text> : null}
      </Text>
      <Pressable style={s.compteurBouton} onPress={() => onChange(valeur + 1)} hitSlop={6}>
        <Text style={s.compteurSigne}>+</Text>
      </Pressable>
    </View>
  );
}

export function BarreProgression({ faits, total, hauteur = 8 }: { faits: number; total: number; hauteur?: number }) {
  const c = useCouleurs();
  const ratio = total === 0 ? 0 : faits / total;
  return (
    <View style={{ height: hauteur, borderRadius: hauteur / 2, backgroundColor: c.bordure, overflow: 'hidden' }}>
      <View
        style={{
          height: '100%',
          width: `${ratio * 100}%`,
          borderRadius: hauteur / 2,
          backgroundColor: ratio === 1 ? c.succes : c.accent,
        }}
      />
    </View>
  );
}

export const couleurProfil = (p: Profil, profils: Profil[]) =>
  p.couleur ?? COULEURS_PROFIL[Math.max(0, profils.findIndex((x) => x.id === p.id)) % COULEURS_PROFIL.length];

/** Rond de couleur avec l'initiale. `fini` ajoute une coche verte. */
export function Avatar({ prenom, couleur, taille = 36, fini }: { prenom: string; couleur: string; taille?: number; fini?: boolean }) {
  const c = useCouleurs();
  return (
    <View
      style={{
        width: taille,
        height: taille,
        borderRadius: taille / 2,
        backgroundColor: couleur,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: taille * 0.45 }}>{prenom.slice(0, 1).toUpperCase()}</Text>
      {fini && (
        <View
          style={{
            position: 'absolute',
            right: -3,
            bottom: -3,
            width: taille * 0.45,
            height: taille * 0.45,
            borderRadius: taille,
            backgroundColor: c.succes,
            borderWidth: 2,
            borderColor: c.carte,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: taille * 0.22, fontWeight: '800' }}>✓</Text>
        </View>
      )}
    </View>
  );
}

export const useStyles = creerStyles((c) => ({
  ecran: { flex: 1, backgroundColor: c.fond },
  contenu: { padding: 16, gap: 12, paddingBottom: 48 },
  carte: {
    backgroundColor: c.carte,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: c.bordure,
    gap: 8,
  },
  titre: { fontSize: 18, fontWeight: '700', color: c.texte },
  grandTitre: { fontSize: 26, fontWeight: '800', color: c.texte },
  texte: { fontSize: 15, color: c.texte },
  discret: { fontSize: 13, color: c.discret },
  vide: { textAlign: 'center', color: c.discret, fontSize: 15, marginVertical: 24, lineHeight: 22 },
  bouton: { paddingVertical: 13, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center' },
  boutonTexte: { fontSize: 16, fontWeight: '600' },
  puces: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  puce: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.bordure,
    backgroundColor: c.carte,
  },
  puceActive: { borderColor: c.accent, backgroundColor: c.accentClair },
  puceTexte: { fontSize: 14, color: c.texte },
  puceTexteActif: { color: c.accent, fontWeight: '600' },
  champ: { gap: 8 },
  libelle: { fontSize: 15, fontWeight: '600', color: c.texte },
  saisie: {
    backgroundColor: c.carte,
    borderWidth: 1,
    borderColor: c.bordure,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: c.texte,
  },
  ligneEspacee: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  compteur: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  compteurBouton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compteurSigne: { fontSize: 22, color: c.accent },
  compteurValeur: { fontSize: 20, fontWeight: '700', minWidth: 32, textAlign: 'center', color: c.texte },
  lien: { color: c.accent, fontSize: 16 },
}));
