import { ojcPool } from "../../loaders/postgres";

let profileStrikeCountColumnPromise: Promise<boolean> | null = null;

export function hasProfileStrikeCountColumn(): Promise<boolean> {
  if (!profileStrikeCountColumnPromise) {
    profileStrikeCountColumnPromise = ojcPool
      .query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = current_schema()
             AND table_name = 'Profiles'
             AND column_name = 'strikeCount'
         ) AS "exists"`,
      )
      .then((result) => result.rows[0]?.exists === true)
      .catch(() => false);
  }

  return profileStrikeCountColumnPromise;
}
