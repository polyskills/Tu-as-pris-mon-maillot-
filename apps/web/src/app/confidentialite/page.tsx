import Link from 'next/link';
import { PageLegale, Valeur } from '@/components/PageLegale';
import { DUREE_JOURNAUX, EDITEUR, HEBERGEUR, MISE_A_JOUR, PRESTATAIRE_EMAILS } from '@/lib/legal';

export const metadata = { title: 'Confidentialité · Tu as pris mon maillot ?' };

const lienCompte = (
  <Link href="/compte" className="font-semibold text-accent">
    Mon compte
  </Link>
);

export default function Confidentialite() {
  return (
    <PageLegale titre="Politique de confidentialité">
      <p>
        « Tu as pris mon maillot ? » prépare la liste de valise de chaque membre de votre famille. Nous ne gardons que
        ce qui sert à ce service. Pas de publicité, pas de revente, pas de mesure d’audience.
      </p>

      <section>
        <h2>Responsable du traitement</h2>
        <p>
          {EDITEUR.societe} ({EDITEUR.marque}), {EDITEUR.siege}. Contact :{' '}
          <Valeur v={EDITEUR.contact} manque="adresse e-mail de contact" />.
        </p>
      </section>

      <section>
        <h2>Données gardées</h2>
        <ul>
          <li>
            <strong>Votre compte</strong> : adresse e-mail, date de création.
          </li>
          <li>
            <strong>Vos sessions de connexion</strong> : date, adresse IP et navigateur utilisé.
          </li>
          <li>
            <strong>Votre famille</strong>, telle que vous la décrivez : prénom, année de naissance, sexe (facultatif),
            couleur, habitudes (lunettes, couches, doudou…), affaires personnelles et responsabilités de chacun. Ces
            informations peuvent concerner des enfants : seul un parent ou un adulte de la famille les saisit, et elles
            se limitent à ce qui sert à préparer la valise.
          </li>
          <li>
            <strong>Vos voyages</strong> : nom, dates, destinations, climat, transports, hébergement, activités,
            participants, et les listes avec leur pointage (dont l’adresse e-mail du membre qui a coché chaque article,
            si la famille est partagée).
          </li>
          <li>
            <strong>Le partage de la famille</strong> : adresses des membres et des personnes invitées.
          </li>
          <li>
            <strong>Les journaux du serveur</strong> : adresse IP, page demandée, date, pour la sécurité du service.
          </li>
        </ul>
      </section>

      <section>
        <h2>Pourquoi, et sur quelle base</h2>
        <ul>
          <li>
            Fournir le service (compte, listes, partage, e-mails de connexion et d’invitation) : exécution du contrat
            qui vous lie à nous en utilisant le service (RGPD, article 6.1.b).
          </li>
          <li>
            Sécurité et prévention des abus (limitation des envois, journaux) : notre intérêt légitime à protéger le
            service et ses utilisateurs (article 6.1.f).
          </li>
        </ul>
      </section>

      <section>
        <h2>Qui y a accès</h2>
        <ul>
          <li>Vous, et les membres de votre famille si vous la partagez : ils voient les mêmes profils et voyages.</li>
          <li>{EDITEUR.societe}, pour faire fonctionner et maintenir le service.</li>
          <li>
            Nos sous-traitants, uniquement pour ce service : l’hébergeur du serveur (
            <Valeur v={HEBERGEUR.identite} manque="hébergeur" />) et le service d’envoi des e-mails (
            <Valeur v={PRESTATAIRE_EMAILS} manque="prestataire d’envoi des e-mails" />
            ).
          </li>
        </ul>
        <p>
          Les données sont stockées en <Valeur v={HEBERGEUR.pays} manque="pays des serveurs" />.
        </p>
      </section>

      <section>
        <h2>Combien de temps</h2>
        <ul>
          <li>Compte, famille et voyages : jusqu’à la suppression de votre compte.</li>
          <li>Sessions de connexion : 60 jours.</li>
          <li>Liens de connexion : 15 minutes.</li>
          <li>Invitations : jusqu’à leur acceptation, leur refus ou leur annulation.</li>
          <li>
            Journaux du serveur : <Valeur v={DUREE_JOURNAUX} manque="durée de conservation des journaux" />.
          </li>
        </ul>
        <p>
          Si vous supprimez votre compte, votre adresse est aussi retirée du pointage, des invitations et de l’équipe du
          catalogue. Seul l’historique des modifications du catalogue (réservé à l’équipe qui le gère) garde l’adresse
          de son auteur.
        </p>
      </section>

      <section>
        <h2>Sur votre appareil</h2>
        <ul>
          <li>Un cookie de session, indispensable pour rester connecté.</li>
          <li>
            Une copie de vos données et du pointage pas encore envoyé, pour utiliser l’application sans réseau. Elle est
            effacée à la déconnexion.
          </li>
          <li>Les pages de l’application, pour qu’elle s’ouvre hors ligne (aucune donnée personnelle).</li>
        </ul>
        <p>Aucun cookie publicitaire ni de mesure d’audience : aucun consentement n’est donc demandé.</p>
      </section>

      <section>
        <h2>Vos droits</h2>
        <p>
          Vous pouvez à tout moment consulter et corriger vos données dans l’application, et depuis {lienCompte}{' '}
          télécharger toutes vos données (accès, portabilité) ou supprimer votre compte (effacement). Pour toute autre
          demande (opposition, limitation) : <Valeur v={EDITEUR.contact} manque="adresse e-mail de contact" />.
        </p>
        <p>
          Vous pouvez aussi adresser une réclamation à la CNIL :{' '}
          <a href="https://www.cnil.fr" className="font-semibold text-accent" rel="noopener noreferrer">
            cnil.fr
          </a>
          .
        </p>
      </section>

      <p className="text-sm text-discret">Dernière mise à jour : {MISE_A_JOUR}.</p>
    </PageLegale>
  );
}
