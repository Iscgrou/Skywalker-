import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import React from "react";

export default function Portal() {
  const { publicId } = useParams<{ publicId: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/portal/${publicId}`],
    enabled: !!publicId,
  });

  console.log('=== SIMPLE PORTAL DEBUG ===');
  console.log('publicId:', publicId);
  console.log('data:', data);
  console.log('isLoading:', isLoading);
  console.log('error:', error);

  if (isLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #1e293b, #334155, #475569)', 
        color: 'white', 
        padding: '40px',
        fontFamily: 'sans-serif',
        direction: 'rtl'
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>در حال بارگذاری...</h1>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #7f1d1d, #991b1b)', 
        color: 'white', 
        padding: '40px',
        fontFamily: 'sans-serif',
        direction: 'rtl'
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>خطا در بارگذاری!</h1>
        <p>داده: {JSON.stringify(data)}</p>
        <p>خطا: {JSON.stringify(error)}</p>
      </div>
    );
  }

  // Safely extract data
  const totalDebt = parseFloat(data.totalDebt || '0');
  const totalSales = parseFloat(data.totalSales || '0');
  const credit = parseFloat(data.credit || '0');
  const invoices = data.invoices || [];
  const payments = data.payments || [];

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1e293b, #334155, #475569)', 
      color: 'white', 
      padding: '20px',
      fontFamily: 'Tahoma, sans-serif',
      direction: 'rtl'
    }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #1e40af, #3730a3)', 
        padding: '30px', 
        borderRadius: '15px',
        marginBottom: '30px',
        border: '2px solid #3b82f6'
      }}>
        <h1 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '10px' }}>
          پرتال عمومی نماینده
        </h1>
        <h2 style={{ fontSize: '24px', color: '#93c5fd', marginBottom: '10px' }}>
          {data.name}
        </h2>
        <p style={{ fontSize: '16px', color: '#dbeafe' }}>
          شناسه پنل: {data.panelUsername}
        </p>
      </div>

      {/* Financial Overview - Simple Cards */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
          ۱. موجودی مالی و وضعیت حساب
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '20px' 
        }}>
          {/* Total Debt */}
          <div style={{ 
            background: 'linear-gradient(135deg, #dc2626, #b91c1c)', 
            padding: '20px', 
            borderRadius: '10px',
            border: '2px solid #ef4444'
          }}>
            <p style={{ fontSize: '14px', marginBottom: '10px', opacity: 0.9 }}>بدهی کل</p>
            <p style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '5px' }}>
              {totalDebt.toLocaleString('fa-IR')} تومان
            </p>
            <p style={{ fontSize: '12px', opacity: 0.8 }}>
              Raw: {data.totalDebt}
            </p>
          </div>

          {/* Total Sales */}
          <div style={{ 
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', 
            padding: '20px', 
            borderRadius: '10px',
            border: '2px solid #3b82f6'
          }}>
            <p style={{ fontSize: '14px', marginBottom: '10px', opacity: 0.9 }}>فروش کل</p>
            <p style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '5px' }}>
              {totalSales.toLocaleString('fa-IR')} تومان
            </p>
            <p style={{ fontSize: '12px', opacity: 0.8 }}>
              Raw: {data.totalSales}
            </p>
          </div>

          {/* Credit */}
          <div style={{ 
            background: 'linear-gradient(135deg, #059669, #047857)', 
            padding: '20px', 
            borderRadius: '10px',
            border: '2px solid #10b981'
          }}>
            <p style={{ fontSize: '14px', marginBottom: '10px', opacity: 0.9 }}>اعتبار</p>
            <p style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '5px' }}>
              {credit.toLocaleString('fa-IR')} تومان
            </p>
            <p style={{ fontSize: '12px', opacity: 0.8 }}>
              Raw: {data.credit}
            </p>
          </div>

          {/* Net Balance */}
          <div style={{ 
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', 
            padding: '20px', 
            borderRadius: '10px',
            border: '2px solid #8b5cf6'
          }}>
            <p style={{ fontSize: '14px', marginBottom: '10px', opacity: 0.9 }}>موجودی خالص</p>
            <p style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '5px' }}>
              {Math.abs(credit - totalDebt).toLocaleString('fa-IR')} تومان
            </p>
            <p style={{ fontSize: '12px', opacity: 0.8 }}>
              {(credit - totalDebt) >= 0 ? 'بستانکار' : 'بدهکار'}
            </p>
          </div>
        </div>
      </div>

      {/* Invoices Section */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
          ۲. فاکتورهای مرتب شده ({invoices.length} فاکتور)
        </h3>
        <div style={{ 
          background: '#334155', 
          padding: '20px', 
          borderRadius: '10px',
          border: '2px solid #475569'
        }}>
          {invoices.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {invoices.map((invoice, index) => (
                <div key={index} style={{ 
                  background: '#475569', 
                  padding: '15px', 
                  borderRadius: '8px',
                  border: '1px solid #64748b'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '5px' }}>
                        {invoice.invoiceNumber}
                      </p>
                      <p style={{ fontSize: '14px', opacity: 0.8 }}>
                        تاریخ: {invoice.issueDate}
                      </p>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
                        {parseFloat(invoice.amount).toLocaleString('fa-IR')} تومان
                      </p>
                      <p style={{ 
                        fontSize: '12px', 
                        padding: '4px 8px', 
                        borderRadius: '4px',
                        background: invoice.status === 'paid' ? '#059669' : '#dc2626',
                        color: 'white',
                        display: 'inline-block'
                      }}>
                        {invoice.status === 'paid' ? 'پرداخت شده' : 'پرداخت نشده'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', fontSize: '18px', opacity: 0.7 }}>
              فاکتوری یافت نشد
            </p>
          )}
        </div>
      </div>

      {/* Payments Section */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
          ۳. تاریخچه پرداخت‌ها ({payments.length} پرداخت)
        </h3>
        <div style={{ 
          background: '#334155', 
          padding: '20px', 
          borderRadius: '10px',
          border: '2px solid #475569'
        }}>
          {payments.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {payments.map((payment, index) => (
                <div key={index} style={{ 
                  background: 'linear-gradient(135deg, #059669, #047857)', 
                  padding: '15px', 
                  borderRadius: '8px',
                  border: '1px solid #10b981'
                }}>
                  <p style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    {parseFloat(payment.amount).toLocaleString('fa-IR')} تومان
                  </p>
                  <p style={{ fontSize: '14px', opacity: 0.9 }}>
                    تاریخ: {payment.paymentDate}
                  </p>
                  {payment.description && (
                    <p style={{ fontSize: '12px', opacity: 0.8 }}>
                      {payment.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', fontSize: '18px', opacity: 0.7 }}>
              پرداختی یافت نشد
            </p>
          )}
        </div>
      </div>

      {/* Debug Info */}
      <div style={{ 
        background: '#1f2937', 
        padding: '20px', 
        borderRadius: '10px',
        border: '2px solid #374151',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        <h4 style={{ marginBottom: '10px' }}>اطلاعات Debug:</h4>
        <pre style={{ whiteSpace: 'pre-wrap', opacity: 0.8 }}>
          {JSON.stringify({
            name: data.name,
            totalDebt: data.totalDebt,
            totalSales: data.totalSales,
            credit: data.credit,
            invoicesCount: invoices.length,
            paymentsCount: payments.length
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
}