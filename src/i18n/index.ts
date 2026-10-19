import fr from './fr.json';

export type MessageKey = keyof typeof fr;
export type MessageParams = Readonly<Record<string, string | number>>;

const messages: Readonly<Record<MessageKey, string>> = fr;

const numberFormat = new Intl.NumberFormat('fr-FR');

/** Nombre au format français (SPEC §8.2) : 1234 → « 1 234 ». */
export const formatNumber = (value: number): string => numberFormat.format(value);

/**
 * Traduit une clé et remplace les `{param}`. Les nombres sont formatés en français.
 * Un paramètre absent laisse le `{param}` visible, pour repérer l'oubli.
 */
export const t = (key: MessageKey, params?: MessageParams): string => {
  const template = messages[key];
  if (params === undefined) return template;
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = params[name];
    if (value === undefined) return placeholder;
    return typeof value === 'number' ? formatNumber(value) : value;
  });
};
