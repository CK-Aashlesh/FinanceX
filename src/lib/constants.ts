// TODO: In a production application, these secrets must be stored in environment variables (e.g. .env)
// and accessed via process.env.SITE_PASSWORD and process.env.ADMIN_KEY to prevent leaking secrets in client bundles.
export const SITE_PASSWORDS = ["treasurer@numa", "treasurer@ziyana"] as const;
export const ADMIN_KEY = "treasurer@adminsh";

// Categories for expenses
export const EXPENSE_CATEGORIES = [
  "Food",
  "Travel",
  "Stationery/Printing",
  "Swag/Prizes",
  "Venue",
  "Tech/Equipment",
  "Misc",
] as const;

export type ExpenseCategory =
  | (typeof EXPENSE_CATEGORIES)[number]
  | (string & {});

// If false, the admin authentication state is cached in sessionStorage so they aren't asked every time.
// If true, the admin key will be requested for every single edit/delete operation.
export const ADMIN_ASK_EVERY_TIME = false;
