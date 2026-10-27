import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text } from 'react-native';
import { Saisie, styles } from './ui';

const versIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Sélecteur de date (AAAA-MM-JJ). Natif sur mobile, champ texte sur le web. */
export function ChoixDate({ valeur, onChange }: { valeur: string; onChange: (iso: string) => void }) {
  const [ouvert, setOuvert] = useState(false);
  const date = new Date(`${valeur}T12:00:00`);

  if (Platform.OS === 'web') {
    return <Saisie value={valeur} onChangeText={onChange} placeholder="AAAA-MM-JJ" />;
  }

  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={date}
        mode="date"
        display="compact"
        locale="fr-FR"
        onChange={(_, d) => d && onChange(versIso(d))}
        style={{ alignSelf: 'flex-start' }}
      />
    );
  }

  // Android : la boîte de dialogue s'ouvre au tap.
  return (
    <>
      <Pressable onPress={() => setOuvert(true)} style={styles.saisie}>
        <Text style={styles.texte}>{date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
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

export const aujourdhuiIso = () => versIso(new Date());
