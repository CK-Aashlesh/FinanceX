import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ADMIN_KEY } from '@/lib/constants';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function getPublicIdFromUrl(url: string): string | null {
  // Extract folder/public_id from Cloudinary URL (everything after v[digits]/ and before file extension)
  const regex = /\/v\d+\/([^\.]+)/;
  const match = url.match(regex);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/expenses/[id] - Update an expense and log it (Admin-gated)
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    // Server-side check for admin-key header
    const adminKeyHeader = request.headers.get('x-admin-key');
    if (adminKeyHeader !== ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Admin key' }, { status: 403 });
    }

    const body = await request.json();
    const { title, amount, category, paidBy, date, notes, billImageUrl, paymentSource } = body;

    // Validation
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const parsedAmount = parseFloat(body.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    if (!paidBy || typeof paidBy !== 'string' || paidBy.trim() === '') {
      return NextResponse.json({ error: 'Paid By name is required' }, { status: 400 });
    }

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    // Retrieve old expense details for specific logging
    const oldExpenses = await query<any[]>('SELECT * FROM FIN_expenses WHERE id = ?', [id]);
    if (oldExpenses.length === 0) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }
    const oldExpense = oldExpenses[0];

    const isTopUp = oldExpense.category === 'Top-up';
    const finalCategory = isTopUp ? 'Top-up' : (category && typeof category === 'string' ? category.trim() : 'General');
    const finalPaymentSource = isTopUp ? 'Sponsor' : (paymentSource && typeof paymentSource === 'string' ? paymentSource.trim() : 'Other');
    const finalTitle = isTopUp ? 'Sponsor Funding Pool' : title.trim();

    const parsedDate = new Date(date);

    // Update expense record
    await query(
      `UPDATE FIN_expenses 
       SET title = ?, amount = ?, category = ?, paidBy = ?, date = ?, notes = ?, updatedBy = 'admin', billImageUrl = ?, paymentSource = ? 
       WHERE id = ?`,
      [
        finalTitle,
        parsedAmount,
        finalCategory,
        paidBy.trim(),
        parsedDate,
        notes ? notes.trim() : null,
        billImageUrl || null,
        finalPaymentSource,
        id
      ]
    );

    // Synchronize settings if the edited row is the Sponsor Funding Pool config
    if (isTopUp) {
      await query(
        `INSERT INTO FIN_settings (setting_key, setting_value) 
         VALUES ('sponsor_budget', ?) 
         ON DUPLICATE KEY UPDATE setting_value = ?`,
        [String(parsedAmount.toFixed(2)), String(parsedAmount.toFixed(2))]
      );
      await query(
        `INSERT INTO FIN_settings (setting_key, setting_value) 
         VALUES ('sponsor_name', ?) 
         ON DUPLICATE KEY UPDATE setting_value = ?`,
        [paidBy.trim(), paidBy.trim()]
      );
    }

    // Write activity log
    const logId = crypto.randomUUID();
    await query(
      `INSERT INTO FIN_activity_logs (id, action, username, details)
       VALUES (?, 'UPDATE', 'admin', ?)`,
      [
        logId,
        `Updated expense: "${oldExpense.title}" (₹${oldExpense.amount.toFixed(2)}) -> "${title.trim()}" (₹${parsedAmount.toFixed(2)})`
      ]
    );

    // Fetch the updated expense
    const updatedExpenses = await query<any[]>('SELECT * FROM FIN_expenses WHERE id = ?', [id]);
    const updatedExpense = updatedExpenses[0];

    return NextResponse.json(updatedExpense);
  } catch (error: any) {
    console.error('Error updating expense:', error);
    return NextResponse.json(
      { error: 'Failed to update expense' },
      { status: 500 }
    );
  }
}

// DELETE /api/expenses/[id] - Delete an expense and log it (Admin-gated)
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    // Server-side check for admin-key header
    const adminKeyHeader = request.headers.get('x-admin-key');
    if (adminKeyHeader !== ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Admin key' }, { status: 403 });
    }

    // Retrieve details for specific logging
    const oldExpenses = await query<any[]>('SELECT * FROM FIN_expenses WHERE id = ?', [id]);
    if (oldExpenses.length === 0) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }
    const oldExpense = oldExpenses[0];

    // Delete receipt image from Cloudinary if present
    if (oldExpense.billImageUrl) {
      try {
        const publicId = getPublicIdFromUrl(oldExpense.billImageUrl);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      } catch (cloudinaryErr) {
        console.error('Failed to delete image from Cloudinary:', cloudinaryErr);
      }
    }

    // Delete record
    await query('DELETE FROM FIN_expenses WHERE id = ?', [id]);

    // Synchronize settings: reset budget to 0.00 if the deleted row is the Sponsor Funding Pool config
    if (oldExpense.category === 'Top-up') {
      await query(
        "UPDATE FIN_settings SET setting_value = '0.00' WHERE setting_key = 'sponsor_budget'"
      );
    }

    // Write activity log
    const logId = crypto.randomUUID();
    await query(
      `INSERT INTO FIN_activity_logs (id, action, username, details)
       VALUES (?, 'DELETE', 'admin', ?)`,
      [
        logId,
        `Deleted expense: "${oldExpense.title}" (₹${oldExpense.amount.toFixed(2)})`
      ]
    );

    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
}
