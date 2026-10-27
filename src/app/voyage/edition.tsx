import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ReactNode, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { aujourdhuiIso, ChoixDate, dateLongue, plusJours } from '../../components/ChoixDate';
import { creerStyles, useCouleurs } from '../../components/theme';
import {
  Avatar,
  Bouton,
  Champ,
  ChoixPuces,
  ChoixUnique,
  Compteur,
  couleurProfil,
  Interrupteur,
  Saisie,
  useStyles,
} from '../../components/ui';
import { CATALOGUE } from '../../domain/catalogue';
import { genererArticles } from '../../domain/generer';
import { ACTIVITES, CLIMATS, DESTINATIONS, HEBERGEMENTS, TRANSPORTS } from '../../domain/libelles';
import { ParametresVoyage, Voyage } from '../../domain/types';
import { useStore } from '../../store/store';

const parametres = ({ id, creeLe, articles, ...p }: Voyage): ParametresVoyage => p;
const ETAPES = ['Où ?', 'Quand ?', 'Qui ?', 'Comment ?', 'Résumé'];
const liste = <K extends string>(cles: K[], libelles: Record<K, string>) =>
  cles.length ? cles.map((k) => libelles[k]).join(', ') : '—';

export default function EditionVoyage() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existant = useStore((s) => s.voyages.find((v) => v.id === id));
  const profils = useStore((s) => s.profils);
  const creer = useStore((s) => s.creerVoyage);
  const modifier = useStore((s) => s.modifierVoyage);
  const supprimer = useStore((s) => s.supprimerVoyage);
  const c = useCouleurs();
  const s = useStyles();
  const l = useStylesLocaux();

  const [etape, setEtape] = useState(0);
  // On ne garde que les paramètres : la liste d'articles reste celle du store.
  const [p, setP] = useState<ParametresVoyage>(() =>
    existant
      ? parametres(existant)
      : {
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

  const etapeValide = [
    p.nom.trim().length > 0,
    /^\d{4}-\d{2}-\d{2}$/.test(p.depart),
    p.participants.length > 0,
    true,
    true,
  ];
  const toutValide = etapeValide.every(Boolean);

  const valider = () => {
    const params = { ...p, nom: p.nom.trim() };
    if (existant) {
      modifier(existant.id, params);
      router.back();
    } else {
      router.replace(`/voyage/${creer(params)}`);
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

  const suivant = () => (etape < ETAPES.length - 1 ? setEtape(etape + 1) : valider());

  let contenu: ReactNode;
  if (etape === 0) {
    contenu = (
      <>
        <Champ libelle="Nom du voyage">
          <Saisie value={p.nom} onChangeText={(t) => maj('nom', t)} placeholder="Ex. : Biarritz juillet" autoFocus={!existant} />
        </Champ>
        <Champ libelle="Type de destination" aide="Plusieurs choix possibles.">
          <ChoixPuces options={DESTINATIONS} valeur={p.destinations} onChange={(v) => maj('destinations', v)} />
        </Champ>
        <Champ libelle="Climat attendu">
          <ChoixUnique options={CLIMATS} valeur={p.climat} onChange={(v) => maj('climat', v)} />
        </Champ>
        <Interrupteur
          libelle="À l'étranger"
          aide="Ajoute passeports, adaptateur, devises…"
          valeur={p.etranger}
          onChange={(v) => maj('etranger', v)}
        />
      </>
    );
  } else if (etape === 1) {
    contenu = (
      <>
        <Champ libelle="Départ">
          <ChoixDate valeur={p.depart} onChange={(d) => maj('depart', d)} />
        </Champ>
        <Champ libelle="Durée">
          <Compteur valeur={p.nuits} onChange={(n) => maj('nuits', n)} suffixe={p.nuits > 1 ? 'nuits' : 'nuit'} />
        </Champ>
        {/^\d{4}-\d{2}-\d{2}$/.test(p.depart) && (
          <Text style={s.discret}>Retour le {dateLongue(plusJours(p.depart, p.nuits))}</Text>
        )}
      </>
    );
  } else if (etape === 2) {
    contenu = (
      <Champ libelle="Qui part ?">
        {profils.map((x) => {
          const actif = p.participants.includes(x.id);
          return (
            <Pressable
              key={x.id}
              onPress={() =>
                maj('participants', actif ? p.participants.filter((i) => i !== x.id) : [...p.participants, x.id])
              }
              style={[l.participant, actif && l.participantActif]}
            >
              <Avatar prenom={x.prenom} couleur={couleurProfil(x, profils)} />
              <Text style={[s.texte, { flex: 1, fontWeight: '600' }]}>{x.prenom}</Text>
              <View style={[l.case, actif && { backgroundColor: c.accent, borderColor: c.accent }]}>
                {actif && <Text style={{ color: c.accentTexte, fontWeight: '800' }}>✓</Text>}
              </View>
            </Pressable>
          );
        })}
      </Champ>
    );
  } else if (etape === 3) {
    contenu = (
      <>
        <Champ libelle="Transport">
          <ChoixPuces options={TRANSPORTS} valeur={p.transports} onChange={(v) => maj('transports', v)} />
        </Champ>
        <Champ libelle="Hébergement">
          <ChoixUnique options={HEBERGEMENTS} valeur={p.hebergement} onChange={(v) => maj('hebergement', v)} />
        </Champ>
        <Interrupteur
          libelle="Machine à laver sur place"
          aide="Limite les vêtements à 7 jours."
          valeur={p.machineALaver}
          onChange={(v) => maj('machineALaver', v)}
        />
        <Champ libelle="Activités prévues">
          <ChoixPuces options={ACTIVITES} valeur={p.activites} onChange={(v) => maj('activites', v)} />
        </Champ>
      </>
    );
  } else {
    const apercu = genererArticles(p, profils, CATALOGUE);
    const noms = profils.filter((x) => p.participants.includes(x.id)).map((x) => x.prenom);
    const lignes: [string, string, number][] = [
      ['Voyage', p.nom || '—', 0],
      ['Destination', `${liste(p.destinations, DESTINATIONS)} · ${CLIMATS[p.climat]}${p.etranger ? ' · étranger' : ''}`, 0],
      ['Dates', `${dateLongue(p.depart)} · ${p.nuits} nuit${p.nuits > 1 ? 's' : ''}`, 1],
      ['Participants', noms.join(', ') || '—', 2],
      ['Trajet et séjour', `${liste(p.transports, TRANSPORTS)} · ${HEBERGEMENTS[p.hebergement]}${p.machineALaver ? ' · machine à laver' : ''}`, 3],
      ['Activités', liste(p.activites, ACTIVITES), 3],
    ];
    contenu = (
      <>
        <View style={s.carte}>
          {lignes.map(([titre, valeur, cible]) => (
            <Pressable key={titre} onPress={() => setEtape(cible)} style={l.resume}>
              <View style={{ flex: 1 }}>
                <Text style={s.discret}>{titre}</Text>
                <Text style={s.texte}>{valeur}</Text>
              </View>
              <Text style={s.lien}>Modifier</Text>
            </Pressable>
          ))}
        </View>
        <View style={l.apercu}>
          <Text style={[s.titre, { color: c.texte }]}>{apercu.length} articles</Text>
          <Text style={s.discret}>
            {existant ? 'Ce qui est déjà pointé sera conservé.' : 'Tu pourras retirer ou ajouter des articles ensuite.'}
          </Text>
        </View>
        {existant && <Bouton titre="Supprimer le voyage" variante="danger" onPress={confirmerSuppression} />}
      </>
    );
  }

  return (
    <KeyboardAvoidingView style={s.ecran} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: existant ? 'Modifier le voyage' : 'Nouveau voyage',
          headerRight: existant
            ? () => (
                <Pressable onPress={valider} disabled={!toutValide} hitSlop={8}>
                  <Text style={[s.lien, { fontWeight: '700' }, !toutValide && { opacity: 0.4 }]}>Enregistrer</Text>
                </Pressable>
              )
            : undefined,
        }}
      />

      <View style={l.etapes}>
        {ETAPES.map((nom, i) => (
          <Pressable
            key={nom}
            style={{ flex: 1, gap: 6 }}
            disabled={!existant && i > etape}
            onPress={() => setEtape(i)}
          >
            <View style={[l.segment, i <= etape && { backgroundColor: c.accent }]} />
            <Text style={[l.etapeNom, i === etape && { color: c.accent, fontWeight: '700' }]}>{nom}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={[s.contenu, { gap: 20 }]} keyboardShouldPersistTaps="handled">
        <Text style={s.grandTitre}>{ETAPES[etape]}</Text>
        {contenu}
      </ScrollView>

      <View style={l.pied}>
        {etape > 0 && <Bouton titre="Précédent" variante="contour" onPress={() => setEtape(etape - 1)} style={{ flex: 1 }} />}
        <Bouton
          titre={etape < ETAPES.length - 1 ? 'Suivant' : existant ? 'Mettre à jour la liste' : 'Générer la liste'}
          onPress={suivant}
          desactive={etape < ETAPES.length - 1 ? !etapeValide[etape] : !toutValide}
          style={{ flex: 2 }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const useStylesLocaux = creerStyles((c) => ({
  etapes: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: c.carte,
    borderBottomWidth: 1,
    borderBottomColor: c.bordure,
  },
  segment: { height: 4, borderRadius: 2, backgroundColor: c.bordure },
  etapeNom: { fontSize: 12, color: c.discret, textAlign: 'center' },
  pied: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingBottom: 28,
    backgroundColor: c.carte,
    borderTopWidth: 1,
    borderTopColor: c.bordure,
  },
  participant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.bordure,
    backgroundColor: c.carte,
  },
  participantActif: { borderColor: c.accent, backgroundColor: c.accentClair },
  case: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: c.discret,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resume: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  apercu: { backgroundColor: c.soleilClair, borderRadius: 14, padding: 16, gap: 4 },
}));
