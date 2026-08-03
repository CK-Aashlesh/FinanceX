import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ADMIN_KEY } from "@/lib/constants";
import crypto from "crypto";

// GET /api/settings - Fetch settings dynamically
export async function GET() {
  try {
    // Fetch all active sponsor funding config transactions (category = 'Top-up')
    const topUps = await query<any[]>(
      "SELECT paidBy, amount FROM FIN_expenses WHERE category = 'Top-up'"
    );

    let totalBudget = 0;
    const names: string[] = [];
    const sponsorsList: { name: string; budget: number }[] = [];

    topUps.forEach((row) => {
      const budgetVal = parseFloat(row.amount) || 0;
      totalBudget += budgetVal;
      const cleanName = String(row.paidBy).trim();
      if (cleanName) {
        if (!names.includes(cleanName)) {
          names.push(cleanName);
        }
        sponsorsList.push({ name: cleanName, budget: budgetVal });
      }
    });

    const sponsorName = names.length > 0 ? names.join(" / ") : "Sponsor";

    return NextResponse.json({
      sponsor_budget: String(totalBudget.toFixed(2)),
      sponsor_name: sponsorName,
      sponsors: sponsorsList
    });
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
    if (!adminKeyHeader) {
      return NextResponse.json(
        { error: "Unauthorized: Missing Admin key" },
        { status: 403 },
      );
    }

    const hashed = crypto.createHash('sha256').update(adminKeyHeader).digest('hex');
    const adminUsers = await query<any[]>("SELECT email FROM FIN_users WHERE password_hash = ? AND role = 'admin'", [hashed]);
    if (adminUsers.length === 0) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid Admin key" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { sponsor_budget, sponsor_name, increment } = body;

    if (sponsor_budget !== undefined && sponsor_name !== undefined) {
      const parsedBudget = parseFloat(sponsor_budget);
      if (isNaN(parsedBudget) || parsedBudget < 0) {
        return NextResponse.json(
          { error: "Sponsor budget must be a positive number" },
          { status: 400 },
        );
      }

      const nameVal = String(sponsor_name).trim();
      if (!nameVal) {
        return NextResponse.json(
          { error: "Sponsor name is required" },
          { status: 400 },
        );
      }

      // Check if there is an existing Top-up record for this sponsor
      const existingTopUps = await query<any[]>(
        "SELECT id, amount FROM FIN_expenses WHERE category = 'Top-up' AND paidBy = ?",
        [nameVal]
      );

      if (existingTopUps.length > 0) {
        if (increment) {
          // Add to existing sponsor budget
          await query(
            "UPDATE FIN_expenses SET amount = amount + ? WHERE category = 'Top-up' AND paidBy = ?",
            [parsedBudget, nameVal]
          );
        } else if (parsedBudget === 0) {
          // Setting budget to 0 deletes this sponsor's funding row
          await query(
            "DELETE FROM FIN_expenses WHERE category = 'Top-up' AND paidBy = ?",
            [nameVal]
          );
        } else {
          // Update existing sponsor budget amount (absolute overwrite)
          await query(
            "UPDATE FIN_expenses SET amount = ? WHERE category = 'Top-up' AND paidBy = ?",
            [parsedBudget, nameVal]
          );
        }
      } else {
        if (parsedBudget > 0) {
          // Insert a new sponsor funding pool row
          const topUpId = crypto.randomUUID();
          await query(
            `INSERT INTO FIN_expenses (id, title, amount, category, paidBy, date, notes, createdBy, paymentSource)
             VALUES (?, 'Sponsor Funding Pool', ?, 'Top-up', ?, ?, 'Sponsor funding pool configured by administrator', 'admin', 'Sponsor')`,
            [topUpId, parsedBudget, nameVal, new Date()]
          );
        }
      }

      // Write activity log
      const logDetails = increment
        ? `Added ₹${parsedBudget.toFixed(2)} to sponsor "${nameVal}" pool`
        : `Configured sponsor "${nameVal}" budget to ₹${parsedBudget.toFixed(2)}`;

      const logId = crypto.randomUUID();
      await query(
        `INSERT INTO FIN_activity_logs (id, action, username, details)
         VALUES (?, 'UPDATE', 'admin', ?)`,
        [
          logId,
          logDetails,
        ],
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
