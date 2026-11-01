import Link from 'next/link';
import { PageLegale, Valeur } from '@/components/PageLegale';
import { EDITEUR, HEBERGEUR, MISE_A_JOUR } from '@/lib/legal';

export const metadata = { title: 'Mentions légales · Tu as pris mon maillot ?' };

export default function MentionsLegales() {
  return (
    <PageLegale titre="Mentions légales">
      <section>
        <h2>Éditeur</h2>
        <p>
          « Tu as pris mon maillot ? » est un service {EDITEUR.marque}, marque de la société{' '}
          <strong>{EDITEUR.societe}</strong>, {EDITEUR.forme} au capital de{' '}
          <Valeur v={EDITEUR.capital} manque="capital social" />.
        </p>
        <ul>
          <li>Siège social : {EDITEUR.siege}</li>
          <li>{EDITEUR.rcs}</li>
          <li>SIRET : {EDITEUR.siret}</li>
          <li>TVA intracommunautaire : {EDITEUR.tva}</li>
          <li>
            Contact : <Valeur v={EDITEUR.contact} manque="adresse e-mail de contact" />
          </li>
        </ul>
      </section>

      <section>
        <h2>Directeur de la publication</h2>
        <p>{EDITEUR.directeurPublication}</p>
      </section>

      <section>
        <h2>Hébergement</h2>
        <p>
          Le site et ses données sont hébergés par{' '}
          <Valeur v={HEBERGEUR.identite} manque="nom, adresse et téléphone de l’hébergeur du serveur" />, en{' '}
          <Valeur v={HEBERGEUR.pays} manque="pays des serveurs" />.
        </p>
      </section>

      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          Les textes, le catalogue d’articles, les règles de génération des listes, le logo et l’interface sont la
          propriété de {EDITEUR.societe}. Toute reproduction sans autorisation est interdite. Les données saisies par
          les utilisateurs (profils, voyages) leur appartiennent.
        </p>
      </section>

      <section>
        <h2>Données personnelles</h2>
        <p>
          Voir la{' '}
          <Link href="/confidentialite" className="font-semibold text-accent">
            politique de confidentialité
          </Link>
          .
        </p>
      </section>

      <p className="text-sm text-discret">Dernière mise à jour : {MISE_A_JOUR}.</p>
    </PageLegale>
  );
}
