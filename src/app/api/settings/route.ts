import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ADMIN_KEY } from "@/lib/constants";
import crypto from "crypto";

// GET /api/settings - Fetch settings
export async function GET() {
  try {
    const rows = await query<any[]>("SELECT * FROM FIN_settings");
    const settings: Record<string, string> = {};
    rows.forEach((row) => {
      settings[row.setting_key] = row.setting_value;
    });
    return NextResponse.json(settings);
  } catch (error: any) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 },
    );
  }
}

// POST /api/settings - Update settings (Admin-gated)
export async function POST(request: Request) {
  try {
    const adminKeyHeader = request.headers.get("x-admin-key");
    if (adminKeyHeader !== ADMIN_KEY) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid Admin key" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { sponsor_budget, sponsor_name, increment } = body;

    // If increment flag is present and true, treat the provided sponsor_budget
    // value as a top-up to be added to the existing sponsor pool. Also create
    // an expense record for the top-up and write an activity log.
    if (sponsor_budget !== undefined) {
      const parsedBudget = parseFloat(sponsor_budget);
      if (isNaN(parsedBudget) || parsedBudget < 0) {
        return NextResponse.json(
          { error: "Sponsor budget must be a positive number" },
          { status: 400 },
        );
      }

      if (increment) {
        // Read current sponsor budget
        const rows = await query<any[]>(
          "SELECT setting_value FROM FIN_settings WHERE setting_key = ?",
          ["sponsor_budget"],
        );
        let current = 0;
        if (rows && rows.length > 0) {
          current = parseFloat(rows[0].setting_value) || 0;
        }

        const newBudget = current + parsedBudget;

        await query(
          `INSERT INTO FIN_settings (setting_key, setting_value) 
           VALUES ('sponsor_budget', ?) 
           ON DUPLICATE KEY UPDATE setting_value = ?`,
          [String(newBudget.toFixed(2)), String(newBudget.toFixed(2))],
        );

        // Insert a top-up expense record so it appears in the admin ledger
        const topUpId = crypto.randomUUID();
        const title = `Sponsor Top-up`;
        const paidBy = sponsor_name ? String(sponsor_name).trim() : "Sponsor";
        const dateNow = new Date();

        await query(
          `INSERT INTO FIN_expenses (id, title, amount, category, paidBy, date, notes, createdBy, paymentSource)
           VALUES (?, ?, ?, 'Top-up', ?, ?, ?, 'admin', 'Sponsor')`,
          [
            topUpId,
            title,
            parsedBudget,
            paidBy,
            dateNow,
            `Top-up by admin: ${paidBy}`,
          ],
        );

        // Activity log
        const logId = crypto.randomUUID();
        await query(
          `INSERT INTO FIN_activity_logs (id, action, username, details)
           VALUES (?, 'CREATE', 'admin', ?)`,
          [
            logId,
            `Top-up: ${paidBy} added ₹${parsedBudget.toFixed(2)} to sponsor pool`,
          ],
        );
      } else {
        // Replace existing sponsor budget value
        await query(
          `INSERT INTO FIN_settings (setting_key, setting_value) 
           VALUES ('sponsor_budget', ?) 
           ON DUPLICATE KEY UPDATE setting_value = ?`,
          [String(parsedBudget.toFixed(2)), String(parsedBudget.toFixed(2))],
        );
      }
    }

    if (sponsor_name !== undefined) {
      await query(
        `INSERT INTO FIN_settings (setting_key, setting_value) 
         VALUES ('sponsor_name', ?) 
         ON DUPLICATE KEY UPDATE setting_value = ?`,
        [String(sponsor_name).trim(), String(sponsor_name).trim()],
      );
    }

    return NextResponse.json({ message: "Settings updated successfully" });
  } catch (error: any) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }
}
