import { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, TextInputProps, View } from 'react-native';

export const couleurs = {
  fond: '#F6F7FB',
  carte: '#FFFFFF',
  texte: '#1B1F2A',
  discret: '#6B7280',
  bordure: '#E3E6EE',
  accent: '#0E7C86',
  accentClair: '#DDF1F2',
  succes: '#2E9E5B',
  danger: '#C2410C',
};

export function Bouton({
  titre,
  onPress,
  variante = 'plein',
  desactive,
}: {
  titre: string;
  onPress: () => void;
  variante?: 'plein' | 'contour' | 'danger';
  desactive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={desactive}
      style={({ pressed }) => [
        styles.bouton,
        variante === 'plein' && { backgroundColor: couleurs.accent },
        variante === 'contour' && { borderWidth: 1, borderColor: couleurs.accent },
        variante === 'danger' && { borderWidth: 1, borderColor: couleurs.danger },
        (pressed || desactive) && { opacity: 0.5 },
      ]}
    >
      <Text
        style={[
          styles.boutonTexte,
          { color: variante === 'plein' ? '#fff' : variante === 'danger' ? couleurs.danger : couleurs.accent },
        ]}
      >
        {titre}
      </Text>
    </Pressable>
  );
}

export function Puce({ libelle, actif, onPress }: { libelle: string; actif: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.puce, actif && styles.puceActive]}>
      <Text style={[styles.puceTexte, actif && { color: couleurs.accent, fontWeight: '600' }]}>{libelle}</Text>
    </Pressable>
  );
}

/** Groupe de puces. `multiple` = plusieurs choix possibles. */
export function ChoixPuces<K extends string>({
  options,
  valeur,
  onChange,
}: {
  options: Record<K, string>;
  valeur: K[];
  onChange: (v: K[]) => void;
}) {
  return (
    <View style={styles.puces}>
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
  return (
    <View style={styles.puces}>
      {(Object.keys(options) as K[]).map((k) => (
        <Puce key={k} libelle={options[k]} actif={valeur === k} onPress={() => onChange(k)} />
      ))}
    </View>
  );
}

export function Champ({ libelle, aide, children }: { libelle: string; aide?: string; children: ReactNode }) {
  return (
    <View style={styles.champ}>
      <Text style={styles.libelle}>{libelle}</Text>
      {aide && <Text style={styles.aide}>{aide}</Text>}
      {children}
    </View>
  );
}

export function Saisie(props: TextInputProps) {
  return <TextInput placeholderTextColor={couleurs.discret} {...props} style={[styles.saisie, props.style]} />;
}

export function Interrupteur({ libelle, valeur, onChange }: { libelle: string; valeur: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.interrupteur}>
      <Text style={styles.libelle}>{libelle}</Text>
      <Switch value={valeur} onValueChange={onChange} trackColor={{ true: couleurs.accent }} />
    </View>
  );
}

export function Compteur({ valeur, onChange, min = 0 }: { valeur: number; onChange: (v: number) => void; min?: number }) {
  return (
    <View style={styles.compteur}>
      <Pressable style={styles.compteurBouton} onPress={() => onChange(Math.max(min, valeur - 1))}>
        <Text style={styles.compteurSigne}>−</Text>
      </Pressable>
      <Text style={styles.compteurValeur}>{valeur}</Text>
      <Pressable style={styles.compteurBouton} onPress={() => onChange(valeur + 1)}>
        <Text style={styles.compteurSigne}>+</Text>
      </Pressable>
    </View>
  );
}

export function BarreProgression({ faits, total }: { faits: number; total: number }) {
  const ratio = total === 0 ? 0 : faits / total;
  return (
    <View style={styles.barre}>
      <View style={[styles.barreRemplie, { width: `${ratio * 100}%`, backgroundColor: ratio === 1 ? couleurs.succes : couleurs.accent }]} />
    </View>
  );
}

export const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  contenu: { padding: 16, gap: 12, paddingBottom: 48 },
  carte: {
    backgroundColor: couleurs.carte,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    gap: 6,
  },
  titre: { fontSize: 18, fontWeight: '700', color: couleurs.texte },
  texte: { fontSize: 15, color: couleurs.texte },
  discret: { fontSize: 13, color: couleurs.discret },
  vide: { textAlign: 'center', color: couleurs.discret, fontSize: 15, marginVertical: 24, lineHeight: 22 },
  bouton: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center' },
  boutonTexte: { fontSize: 16, fontWeight: '600' },
  puces: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  puce: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.carte,
  },
  puceActive: { borderColor: couleurs.accent, backgroundColor: couleurs.accentClair },
  puceTexte: { fontSize: 14, color: couleurs.texte },
  champ: { gap: 8 },
  libelle: { fontSize: 15, fontWeight: '600', color: couleurs.texte },
  aide: { fontSize: 13, color: couleurs.discret },
  saisie: {
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: couleurs.texte,
  },
  interrupteur: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  compteur: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  compteurBouton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: couleurs.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compteurSigne: { fontSize: 22, color: couleurs.accent },
  compteurValeur: { fontSize: 20, fontWeight: '700', minWidth: 32, textAlign: 'center', color: couleurs.texte },
  barre: { height: 8, borderRadius: 4, backgroundColor: couleurs.bordure, overflow: 'hidden' },
  barreRemplie: { height: '100%', borderRadius: 4 },
});
