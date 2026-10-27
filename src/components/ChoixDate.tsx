import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, useColorScheme } from 'react-native';
import { Saisie, useStyles } from './ui';

const versIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const depuisIso = (iso: string) => new Date(`${iso}T12:00:00`);

export const aujourdhuiIso = () => versIso(new Date());

export const plusJours = (iso: string, jours: number) => {
  const d = depuisIso(iso);
  d.setDate(d.getDate() + jours);
  return versIso(d);
};

/** Nombre de jours entre aujourd'hui et une date (négatif si passée). */
export const joursAvant = (iso: string) =>
  Math.round((depuisIso(iso).getTime() - depuisIso(aujourdhuiIso()).getTime()) / 86_400_000);

export const dateLongue = (iso: string) =>
  depuisIso(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** Sélecteur de date (AAAA-MM-JJ). Natif sur mobile, champ texte sur le web. */
export function ChoixDate({ valeur, onChange }: { valeur: string; onChange: (iso: string) => void }) {
  const [ouvert, setOuvert] = useState(false);
  const s = useStyles();
  const sombre = useColorScheme() === 'dark';

  if (Platform.OS === 'web') {
    return <Saisie value={valeur} onChangeText={onChange} placeholder="AAAA-MM-JJ" />;
  }

  const date = depuisIso(valeur);

  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={date}
        mode="date"
        display="inline"
        locale="fr-FR"
        themeVariant={sombre ? 'dark' : 'light'}
        onChange={(_, d) => d && onChange(versIso(d))}
      />
    );
  }

  // Android : la boîte de dialogue s'ouvre au tap.
  return (
    <>
      <Pressable onPress={() => setOuvert(true)} style={s.saisie}>
        <Text style={s.texte}>{dateLongue(valeur)}</Text>
      </Pressable>
      {ouvert && (
        <DateTimePicker
          value={date}
          mode="date"
          onChange={(_, d) => {
            setOuvert(false);
            if (d) onChange(versIso(d));
          }}
        />
      )}
    </>
  );
}
