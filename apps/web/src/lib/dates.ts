const versIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const depuisIso = (iso: string) => new Date(`${iso}T12:00:00`);

export const aujourdhuiIso = () => versIso(new Date());

export const dateValide = (iso: string) => /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(depuisIso(iso).getTime());

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

export const dateCourte = (iso: string) =>
  depuisIso(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
