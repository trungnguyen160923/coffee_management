import React from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

type GoodsReceiptDetailRow = {
  ingredient?: { name?: string };
  unitCodeInput?: string;
  qtyInput?: number;
  damageQty?: number;
  unitPrice?: number;
  lineTotal?: number;
  lotNumber?: string;
  mfgDate?: string;
  expDate?: string;
  status?: string;
  note?: string;
};

type GoodsReceiptRow = {
  grnNumber: string;
  poId: number;
  supplierName?: string;
  branchId?: number;
  status?: string;
  totalAmount?: number;
  createAt?: string;
  details?: GoodsReceiptDetailRow[];
};

interface Props {
  open: boolean;
  onClose: () => void;
  receipt: GoodsReceiptRow | null;
}

const GoodsReceiptDetailModal: React.FC<Props> = ({ open, onClose, receipt }) => {
  const handleExportToExcel = () => {
    if (!receipt) return;

    try {
      // Table headers - chỉ bảng nguyên liệu
      const tableHeaders = [
        'STT',
        'Nguyên liệu (Ingredient)',
        'Đơn vị (Unit)',
        'Số lượng (Quantity)',
        'Số lượng hỏng (Damaged)',
        'Đơn giá (Unit Price)',
        'Thành tiền (Line Total)',
        'Trạng thái (Status)',
        'Số lô (Lot Number)',
        'Ngày sản xuất (MFG Date)',
        'Ngày hết hạn (EXP Date)',
      ];

      // Table data
      const tableData = (receipt.details || []).map((d, index) => [
        index + 1,
        d.ingredient?.name || 'Unknown',
        d.unitCodeInput || '-',
        d.qtyInput ?? 0,
        d.damageQty ?? 0,
        d.unitPrice ?? 0,
        d.lineTotal ?? 0,
        d.status || '-',
        d.lotNumber || '-',
        d.mfgDate || '-',
        d.expDate || '-',
      ]);

      // Chỉ có bảng nguyên liệu
      const sheetData = [
        tableHeaders,
        ...tableData,
      ];

      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Phiếu nhập hàng');

      // Set column widths
      worksheet['!cols'] = [
        { wch: 5 },  // STT
        { wch: 25 }, // Nguyên liệu
        { wch: 10 }, // Đơn vị
        { wch: 12 }, // Số lượng
        { wch: 12 }, // Số lượng hỏng
        { wch: 15 }, // Đơn giá
        { wch: 15 }, // Thành tiền
        { wch: 12 }, // Trạng thái
        { wch: 15 }, // Số lô
        { wch: 15 }, // MFG Date
        { wch: 15 }, // EXP Date
      ];

      // Generate file
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const now = new Date();
      const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      link.href = url;
      link.setAttribute('download', `Phieu_Nhap_Hang_${receipt.grnNumber}_${ts}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Export error:', err);
      toast.error('Lỗi khi xuất file Excel: ' + (err?.message || 'Unknown error'));
    }
  };

  const handleExportToPDF = async () => {
    if (!receipt) return;

    try {
      // Generate HTML content
      const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Phiếu Nhập Hàng - ${receipt.grnNumber}</title>
  <style>
    @media print {
      @page {
        size: A4;
        margin: 1cm;
      }
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #333;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #333;
    }
    .header h1 {
      font-size: 24px;
      color: #1f2937;
      margin-bottom: 10px;
      font-weight: bold;
    }
    .info-section {
      margin-bottom: 20px;
    }
    .info-row {
      display: flex;
      margin-bottom: 8px;
    }
    .info-label {
      font-weight: bold;
      width: 200px;
    }
    .info-value {
      flex: 1;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 11px;
    }
    .table th,
    .table td {
      padding: 8px;
      text-align: left;
      border: 1px solid #ddd;
    }
    .table th {
      background: #4a5568;
      color: white;
      font-weight: bold;
      text-align: center;
    }
    .table td {
      text-align: center;
    }
    .table td:nth-child(3),
    .table td:nth-child(4),
    .table td:nth-child(5),
    .table td:nth-child(6),
    .table td:nth-child(7) {
      text-align: right;
    }
    .table tr:nth-child(even) {
      background: #f9fafb;
    }
    .summary {
      margin-top: 20px;
      text-align: right;
      font-size: 14px;
      font-weight: bold;
      padding: 10px;
      background: #f3f4f6;
    }
    .signature-section {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .signature-box {
      flex: 1;
      text-align: center;
      padding: 10px;
    }
    .signature-line {
      border-top: 1px solid #333;
      margin-top: 60px;
      padding-top: 5px;
      font-weight: bold;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      text-align: center;
      font-size: 10px;
      color: #666;
      border-top: 1px solid #ddd;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>PHIẾU NHẬP HÀNG - GOODS RECEIPT</h1>
  </div>

  <div class="info-section">
    <div class="info-row">
      <div class="info-label">Số phiếu nhập (GRN Number):</div>
      <div class="info-value">${receipt.grnNumber}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Số đơn hàng (PO):</div>
      <div class="info-value">PO-${receipt.poId}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Nhà cung cấp (Supplier):</div>
      <div class="info-value">${receipt.supplierName || 'N/A'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Chi nhánh (Branch):</div>
      <div class="info-value">${receipt.branchId || 'N/A'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Trạng thái (Status):</div>
      <div class="info-value">${receipt.status || 'N/A'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Ngày tạo (Created):</div>
      <div class="info-value">${receipt.createAt ? new Date(receipt.createAt).toLocaleString('vi-VN') : '-'}</div>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>STT</th>
        <th>Nguyên liệu</th>
        <th>Đơn vị</th>
        <th>Số lượng</th>
        <th>Số lượng hỏng</th>
        <th>Đơn giá</th>
        <th>Thành tiền</th>
        <th>Trạng thái</th>
        <th>Số lô</th>
        <th>MFG Date</th>
        <th>EXP Date</th>
      </tr>
    </thead>
    <tbody>
      ${(receipt.details || []).map((d, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${d.ingredient?.name || 'Unknown'}</td>
          <td>${d.unitCodeInput || '-'}</td>
          <td>${(d.qtyInput ?? 0).toLocaleString('vi-VN')}</td>
          <td>${(d.damageQty ?? 0).toLocaleString('vi-VN')}</td>
          <td>${(d.unitPrice ?? 0).toLocaleString('vi-VN')}</td>
          <td>${(d.lineTotal ?? 0).toLocaleString('vi-VN')}</td>
          <td>${d.status || '-'}</td>
          <td>${d.lotNumber || '-'}</td>
          <td>${d.mfgDate || '-'}</td>
          <td>${d.expDate || '-'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="summary">
    <div>TỔNG CỘNG (TOTAL): ${(receipt.totalAmount ?? 0).toLocaleString('vi-VN')} VND</div>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-line">Người giao hàng<br/>(Supplier)</div>
    </div>
    <div class="signature-box">
      <div class="signature-line">Người nhận hàng<br/>(Receiver)</div>
    </div>
    <div class="signature-box">
      <div class="signature-line">Người phê duyệt<br/>(Approver)</div>
    </div>
  </div>

  <div class="footer">
    <div>Báo cáo được tạo tự động bởi hệ thống quản lý cà phê</div>
    <div>Thời gian tạo: ${new Date().toLocaleString('vi-VN')}</div>
  </div>
</body>
</html>
      `;

      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
        return;
      }

      // Write HTML content
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 500));

      // Trigger print dialog
      printWindow.focus();
      printWindow.print();
    } catch (err: any) {
      console.error('Export PDF error:', err);
      toast.error('Lỗi khi xuất file PDF: ' + (err?.message || 'Unknown error'));
    }
  };

  if (!open || !receipt) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] overflow-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-semibold">Goods Receipt Details • {receipt.grnNumber}</div>
          <div className="flex gap-2">
            <button 
              onClick={handleExportToExcel} 
              className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Xuất Excel
            </button>
            <button 
              onClick={handleExportToPDF} 
              className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Xuất PDF
            </button>
            <button onClick={onClose} className="px-2 py-1 text-sm border rounded-lg hover:bg-gray-50">Close</button>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-700">
            <div><span className="font-medium">PO:</span> PO-{receipt.poId}</div>
            <div><span className="font-medium">Supplier:</span> {receipt.supplierName}</div>
            <div><span className="font-medium">Branch:</span> {receipt.branchId}</div>
            <div><span className="font-medium">Status:</span> {receipt.status}</div>
            <div><span className="font-medium">Created:</span> {receipt.createAt ? new Date(receipt.createAt).toLocaleString() : '-'}</div>
            <div><span className="font-medium">Total:</span> {(receipt.totalAmount ?? 0).toLocaleString()} VND</div>
          </div>
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Ingredient</th>
                    <th className="px-3 py-2 text-left">Unit</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Damaged</th>
                    <th className="px-3 py-2 text-right">Unit Price</th>
                    <th className="px-3 py-2 text-right">Line Total</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Lot / MFG / EXP</th>
                  </tr>
                </thead>
                <tbody>
                  {(receipt.details || []).map((d, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2">{d.ingredient?.name || 'Unknown'}</td>
                      <td className="px-3 py-2">{d.unitCodeInput}</td>
                      <td className="px-3 py-2 text-right">{(d.qtyInput ?? 0).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">{(d.damageQty ?? 0).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">{(d.unitPrice ?? 0).toLocaleString()} VND</td>
                      <td className="px-3 py-2 text-right">{(d.lineTotal ?? 0).toLocaleString()} VND</td>
                      <td className="px-3 py-2">{d.status}</td>
                      <td className="px-3 py-2">
                        <div className="text-xs text-gray-600 space-y-0.5">
                          <div>Lot: {d.lotNumber || '-'}</div>
                          <div>MFG: {d.mfgDate || '-'}</div>
                          <div>EXP: {d.expDate || '-'}</div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(receipt.details || []).length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-4 text-center text-gray-500">No details</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoodsReceiptDetailModal;


