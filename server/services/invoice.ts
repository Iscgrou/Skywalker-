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
    console.log('Parsing JSON data, length:', jsonData.length);
    const data = JSON.parse(jsonData);
    let usageRecords: any[] = [];
    
    console.log('Parsed JSON type:', typeof data);
    console.log('Is array:', Array.isArray(data));
    
    // Handle MarFaNet JSON export format (PHPMyAdmin JSON export)
    if (Array.isArray(data)) {
      console.log('Processing array data, length:', data.length);
      
      // Find the data section in the array
      const dataSection = data.find(item => item.type === 'table' && item.data && Array.isArray(item.data));
      if (dataSection) {
        console.log('Found table section with data');
        usageRecords = dataSection.data;
      } else {
        // If it's directly an array of records
        console.log('Processing direct array of records');
        usageRecords = data.filter(item => item && typeof item === 'object' && (item.admin_username || item.representative_code));
      }
    } else if (data.usage_data && Array.isArray(data.usage_data)) {
      console.log('Found usage_data section');
      usageRecords = data.usage_data;
    } else if (data.data && Array.isArray(data.data)) {
      console.log('Found data section');
      usageRecords = data.data;
    } else if (typeof data === 'object' && data.admin_username) {
      console.log('Single record detected');
      return [data];
    }
    
    console.log('Extracted records count:', usageRecords.length);
    
    if (usageRecords.length === 0) {
      console.log('No records found in JSON structure');
      console.log('JSON structure:', JSON.stringify(data, null, 2).substring(0, 1000));
      throw new Error('هیچ رکورد معتبری در فایل JSON یافت نشد');
    }
    
    console.log(`پردازش ${usageRecords.length} رکورد از فایل JSON`);
    console.log("نمونه اول رکورد:", JSON.stringify(usageRecords[0], null, 2));
    return usageRecords;
  } catch (error) {
    console.error('خطا در پردازش JSON:', error);
    throw new Error('فایل JSON قابل پردازش نیست: ' + (error as Error).message);
  }
}

export function calculateInvoiceAmount(usageData: UsageDataRecord): number {
  // Use the amount directly from MarFaNet JSON data
  const amount = parseFloat(usageData.amount || '0');
  return Math.round(amount);
}

export function processUsageData(usageRecords: UsageDataRecord[]): ProcessedInvoice[] {
  const currentDate = getCurrentPersianDate();
  
  // Group by admin_username and sum amounts
  const groupedData = usageRecords.reduce((acc, record) => {
    const adminUsername = record.admin_username;
    if (!adminUsername) return acc;
    
    if (!acc[adminUsername]) {
      acc[adminUsername] = {
        admin_username: adminUsername,
        records: [],
        totalAmount: 0
      };
    }
    
    acc[adminUsername].records.push(record);
    acc[adminUsername].totalAmount += parseFloat(record.amount || '0');
    
    return acc;
  }, {} as Record<string, { admin_username: string; records: any[]; totalAmount: number }>);
  
  // Convert to ProcessedInvoice format
  return Object.values(groupedData).map(group => {
    return {
      representativeCode: group.admin_username,
      panelUsername: group.admin_username,
      amount: Math.round(group.totalAmount),
      usageData: {
        admin_username: group.admin_username,
        records: group.records,
        totalRecords: group.records.length,
        period_start: group.records[0]?.event_timestamp || currentDate,
        period_end: group.records[group.records.length - 1]?.event_timestamp || currentDate,
        usage_amount: group.totalAmount
      } as any,
      issueDate: currentDate,
      dueDate: addDaysToPersianDate(currentDate, 30)
    };
  });
}

// Helper function to create public portal ID from admin_username
export function generatePublicId(adminUsername: string): string {
  // Create a clean, consistent public ID based on admin_username
  return adminUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
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
  if (parts.length !== 3) {
    // If invalid format, return current date + days
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + days);
    const year = currentDate.getFullYear() - 1979 + 621;
    const month = currentDate.getMonth() + 1;
    const day = currentDate.getDate();
    return toPersianDigits(`${year}/${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`);
  }
  
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]); 
  const day = parseInt(parts[2]);
  
  // Validate parsed values
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    // If invalid numbers, return current date + days
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + days);
    const newYear = currentDate.getFullYear() - 1979 + 621;
    const newMonth = currentDate.getMonth() + 1;
    const newDay = currentDate.getDate();
    return toPersianDigits(`${newYear}/${newMonth.toString().padStart(2, '0')}/${newDay.toString().padStart(2, '0')}`);
  }
  
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
    
    // For MarFaNet JSON format validation - check actual data format
    // Allow both admin_username and representative_code as valid identifiers
    const username = record.admin_username || record.representative_code;
    if (!username || typeof username !== 'string' || username.trim() === '') {
      errors.push('admin_username یا representative_code وجود ندارد یا خالی است');
    }
    
    const amountValue = parseFloat(record.amount || '0');
    if (!record.amount || isNaN(amountValue) || amountValue <= 0) {
      errors.push(`مبلغ نامعتبر: ${record.amount}`);
    }
    
    if (errors.length === 0) {
      // Add derived fields for processing compatibility
      const username = record.admin_username || record.representative_code || '';
      record.admin_username = username; // Ensure consistency
      record.representative_code = username;
      record.panel_username = username;  
      record.usage_amount = amountValue;
      record.period_start = record.event_timestamp || new Date().toISOString();
      record.period_end = record.event_timestamp || new Date().toISOString();
      
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
