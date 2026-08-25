/** Supabase `card_theme` table */
export type CardThemeRow = {
  theme_id: number | string;
  theme_name: string;
  theme_path: string;
  status: number;
};

export type CardThemeDto = {
  themeId: number;
  themeName: string;
  themePath: string;
  status: boolean;
};

export function mapCardTheme(row: CardThemeRow): CardThemeDto {
  return {
    themeId: Number(row.theme_id),
    themeName: row.theme_name,
    themePath: row.theme_path,
    status: Number(row.status) === 1,
  };
}
