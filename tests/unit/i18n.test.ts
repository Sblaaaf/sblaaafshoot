import { describe, expect, it } from 'vitest';
import { formatDuration, formatNumber, t } from '../../src/i18n';

// Intl fr-FR sépare les milliers par une espace fine insécable (U+202F).
const NNBSP = ' ';

describe('i18n', () => {
  it('renvoie le texte français d’une clé', () => {
    expect(t('app.title')).toBe('SblaaafShoot');
  });

  it('remplace les paramètres et formate les nombres en français', () => {
    expect(t('end.kills', { kills: 1234 })).toBe(`Ennemis éliminés : 1${NNBSP}234`);
  });

  it('laisse visible un paramètre manquant', () => {
    expect(t('hud.squad', {})).toBe('Effectif {count}');
  });

  it('formate les nombres au format français', () => {
    expect(formatNumber(1234567)).toBe(`1${NNBSP}234${NNBSP}567`);
  });

  it('formate les durées en chronomètre', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(83.9)).toBe('1:23');
    expect(formatDuration(300)).toBe('5:00');
    expect(formatDuration(-4)).toBe('0:00');
  });
});
