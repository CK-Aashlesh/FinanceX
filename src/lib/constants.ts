export const SITE_PASSWORDS = process.env.SITE_PASSWORDS?.split(',') ?? [];
export const ADMIN_KEY = process.env.ADMIN_KEY ?? "";

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
