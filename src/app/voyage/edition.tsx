import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { aujourdhuiIso, ChoixDate } from '../../components/ChoixDate';
import { Bouton, Champ, ChoixPuces, ChoixUnique, Compteur, Interrupteur, Saisie, styles } from '../../components/ui';
import { ACTIVITES, CLIMATS, DESTINATIONS, HEBERGEMENTS, TRANSPORTS } from '../../domain/libelles';
import { ParametresVoyage, Voyage } from '../../domain/types';
import { useStore } from '../../store/store';

const parametres = ({ id, creeLe, articles, ...p }: Voyage): ParametresVoyage => p;

export default function EditionVoyage() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existant = useStore((s) => s.voyages.find((v) => v.id === id));
  const profils = useStore((s) => s.profils);
  const creer = useStore((s) => s.creerVoyage);
  const modifier = useStore((s) => s.modifierVoyage);
  const supprimer = useStore((s) => s.supprimerVoyage);

  // On ne garde que les paramètres : la liste d'articles reste celle du store.
  const [p, setP] = useState<ParametresVoyage>(() =>
    existant ? parametres(existant) : {
      nom: '',
      depart: aujourdhuiIso(),
      nuits: 7,
      destinations: [],
      climat: 'tempere',
      etranger: false,
      transports: ['voiture'],
      hebergement: 'location',
      machineALaver: false,
      activites: [],
      participants: profils.map((x) => x.id),
    },
  );
  const maj = <K extends keyof ParametresVoyage>(cle: K, valeur: ParametresVoyage[K]) => setP({ ...p, [cle]: valeur });

  const participants = Object.fromEntries(profils.map((x) => [x.id, x.prenom]));
  const valide = p.nom.trim().length > 0 && p.participants.length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(p.depart);

  const valider = () => {
    const params = { ...p, nom: p.nom.trim() };
    if (existant) {
      modifier(existant.id, params);
      router.back();
    } else {
      const nouveau = creer(params);
      router.replace(`/voyage/${nouveau}`);
    }
  };

  const confirmerSuppression = () =>
    Alert.alert(`Supprimer « ${existant?.nom} » ?`, 'La liste et le pointage seront perdus.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          supprimer(existant!.id);
          router.dismissAll();
        },
      },
    ]);

  return (
    <ScrollView style={styles.ecran} contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: existant ? 'Modifier le voyage' : 'Nouveau voyage' }} />

      <Champ libelle="Nom du voyage">
        <Saisie value={p.nom} onChangeText={(t) => maj('nom', t)} placeholder="Ex. : Biarritz juillet" />
      </Champ>

      <Champ libelle="Départ">
        <ChoixDate valeur={p.depart} onChange={(d) => maj('depart', d)} />
      </Champ>

      <Champ libelle="Nombre de nuits">
        <Compteur valeur={p.nuits} onChange={(n) => maj('nuits', n)} />
      </Champ>

      <Champ libelle="Qui part ?">
        <ChoixPuces options={participants} valeur={p.participants} onChange={(v) => maj('participants', v)} />
      </Champ>

      <Champ libelle="Type de destination" aide="Plusieurs choix possibles.">
        <ChoixPuces options={DESTINATIONS} valeur={p.destinations} onChange={(v) => maj('destinations', v)} />
      </Champ>

      <Champ libelle="Climat attendu">
        <ChoixUnique options={CLIMATS} valeur={p.climat} onChange={(v) => maj('climat', v)} />
      </Champ>

      <Interrupteur libelle="À l'étranger" valeur={p.etranger} onChange={(v) => maj('etranger', v)} />

      <Champ libelle="Transport">
        <ChoixPuces options={TRANSPORTS} valeur={p.transports} onChange={(v) => maj('transports', v)} />
      </Champ>

      <Champ libelle="Hébergement">
        <ChoixUnique options={HEBERGEMENTS} valeur={p.hebergement} onChange={(v) => maj('hebergement', v)} />
      </Champ>

      <Interrupteur
        libelle="Machine à laver sur place"
        valeur={p.machineALaver}
        onChange={(v) => maj('machineALaver', v)}
      />

      <Champ libelle="Activités prévues">
        <ChoixPuces options={ACTIVITES} valeur={p.activites} onChange={(v) => maj('activites', v)} />
      </Champ>

      <Bouton titre={existant ? 'Mettre à jour la liste' : 'Générer la liste'} onPress={valider} desactive={!valide} />
      {existant && <Bouton titre="Supprimer le voyage" variante="danger" onPress={confirmerSuppression} />}
    </ScrollView>
  );
}
