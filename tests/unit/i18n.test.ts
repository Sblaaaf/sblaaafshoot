import { describe, expect, it } from 'vitest';
import { formatNumber, t } from '../../src/i18n';

// Intl fr-FR sépare les milliers par une espace fine insécable (U+202F).
const NNBSP = ' ';

describe('i18n', () => {
  it('renvoie le texte français d’une clé', () => {
    expect(t('app.title')).toBe('SblaaafShoot');
  });

  it('remplace les paramètres et formate les nombres en français', () => {
    expect(t('hello.viewport', { width: 360, height: 1234 })).toBe(
      `Zone logique : 360 × 1${NNBSP}234`,
    );
  });

  it('laisse visible un paramètre manquant', () => {
    expect(t('hello.version', {})).toBe('Version {version}');
  });

  it('formate les nombres au format français', () => {
    expect(formatNumber(1234567)).toBe(`1${NNBSP}234${NNBSP}567`);
  });
});
