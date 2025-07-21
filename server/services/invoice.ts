import { toPersianDigits, getCurrentPersianDate } from "../../client/src/lib/persian-date";

export interface UsageDataRecord {
  representative_code?: string;
  panel_username?: string;
  admin_username: string; // Primary unique identifier
  usage_amount: number;
  period_start: string;
  period_end: string;
  [key: string]: any; // Additional fields from JSON
}

export interface ProcessedInvoice {
  representativeCode: string;
  panelUsername: string;
  amount: number;
  usageData: UsageDataRecord;
  issueDate: string;
  dueDate: string;
}

export function parseUsageJsonData(jsonData: string): UsageDataRecord[] {
  try {
    const data = JSON.parse(jsonData);
    
    // Handle different JSON structures
    if (Array.isArray(data)) {
      return data;
    } else if (data.usage_data && Array.isArray(data.usage_data)) {
      return data.usage_data;
    } else if (typeof data === 'object') {
      // Single record
      return [data];
    }
    
    throw new Error('فرمت JSON نامعتبر');
  } catch (error) {
    console.error('خطا در پردازش JSON:', error);
    throw new Error('فایل JSON قابل پردازش نیست');
  }
}

export function calculateInvoiceAmount(usageData: UsageDataRecord): number {
  // Base calculation logic - can be customized
  const baseRate = 1000; // 1000 toman per unit
  const usage = usageData.usage_amount || 0;
  
  // Apply tiered pricing
  let amount = 0;
  if (usage <= 100) {
    amount = usage * baseRate;
  } else if (usage <= 500) {
    amount = (100 * baseRate) + ((usage - 100) * baseRate * 0.9);
  } else {
    amount = (100 * baseRate) + (400 * baseRate * 0.9) + ((usage - 500) * baseRate * 0.8);
  }
  
  return Math.round(amount);
}

export function processUsageData(usageRecords: UsageDataRecord[]): ProcessedInvoice[] {
  const currentDate = getCurrentPersianDate();
  
  return usageRecords.map(record => {
    const amount = calculateInvoiceAmount(record);
    
    return {
      representativeCode: record.representative_code || record.admin_username,
      panelUsername: record.admin_username, // Use admin_username as main identifier
      amount,
      usageData: record,
      issueDate: currentDate,
      dueDate: addDaysToPersianDate(currentDate, 30) // 30 days from issue
    };
  });
}

// Helper function to create public portal ID from admin_username
export function generatePublicId(adminUsername: string): string {
  // Create a consistent public ID based on admin_username
  return `portal_${adminUsername.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
}

// Helper function to auto-create representative from usage data
export async function createRepresentativeFromUsageData(
  adminUsername: string,
  db: any,
  defaultSalesPartnerId?: number
): Promise<any> {
  const publicId = generatePublicId(adminUsername);
  
  // Create basic representative profile with minimal required data
  const newRepresentative = {
    code: adminUsername, // Use admin_username as code
    name: `فروشگاه ${adminUsername}`, // Default shop name
    ownerName: null, // Will be set to null as default
    panelUsername: adminUsername,
    phone: null,
    publicId: publicId,
    salesPartnerId: defaultSalesPartnerId || null,
    isActive: true
  };

  return newRepresentative;
}

// Helper to get or create default sales partner
export async function getOrCreateDefaultSalesPartner(db: any): Promise<number> {
  const { salesPartners } = await import("../../shared/schema");
  const { eq } = await import("drizzle-orm");
  
  // Try to find existing default partner
  const existing = await db.select().from(salesPartners).where(eq(salesPartners.name, "همکار پیش‌فرض")).limit(1);
  
  if (existing.length > 0) {
    return existing[0].id;
  }
  
  // Create default sales partner
  const [newPartner] = await db.insert(salesPartners).values({
    name: "همکار پیش‌فرض",
    phone: null,
    email: null,
    commissionRate: "5.00", // 5% default commission
    isActive: true
  }).returning();
  
  return newPartner.id;
}

export function addDaysToPersianDate(persianDate: string, days: number): string {
  // Convert Persian date to Gregorian, add days, convert back
  const parts = persianDate.split('/');
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]); 
  const day = parseInt(parts[2]);
  
  // Simple approximation - in production use proper Persian calendar library
  const gregorianDate = new Date(year - 621 + 1979, month - 1, day);
  gregorianDate.setDate(gregorianDate.getDate() + days);
  
  // Convert back to Persian (simplified)
  const newYear = gregorianDate.getFullYear() - 1979 + 621;
  const newMonth = gregorianDate.getMonth() + 1;
  const newDay = gregorianDate.getDate();
  
  return toPersianDigits(`${newYear}/${newMonth.toString().padStart(2, '0')}/${newDay.toString().padStart(2, '0')}`);
}

export function validateUsageData(records: UsageDataRecord[]): { 
  valid: UsageDataRecord[], 
  invalid: { record: any, errors: string[] }[] 
} {
  const valid: UsageDataRecord[] = [];
  const invalid: { record: any, errors: string[] }[] = [];
  
  records.forEach(record => {
    const errors: string[] = [];
    
    if (!record.representative_code || typeof record.representative_code !== 'string') {
      errors.push('کد نماینده وجود ندارد');
    }
    
    if (!record.panel_username || typeof record.panel_username !== 'string') {
      errors.push('نام کاربری پنل وجود ندارد');
    }
    
    if (typeof record.usage_amount !== 'number' || record.usage_amount < 0) {
      errors.push('میزان مصرف نامعتبر است');
    }
    
    if (errors.length === 0) {
      valid.push(record);
    } else {
      invalid.push({ record, errors });
    }
  });
  
  return { valid, invalid };
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return toPersianDigits(num.toLocaleString('fa-IR'));
}

export function generateInvoicePreview(invoice: ProcessedInvoice): string {
  return `نماینده: ${invoice.representativeCode}
پنل: ${invoice.panelUsername}  
مبلغ: ${formatCurrency(invoice.amount)} تومان
تاریخ صدور: ${invoice.issueDate}
سررسید: ${invoice.dueDate}`;
}
