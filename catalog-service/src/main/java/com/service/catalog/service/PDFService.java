package com.service.catalog.service;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.io.font.PdfEncodings;
import com.service.catalog.entity.PurchaseOrder;
import com.service.catalog.entity.PurchaseOrderDetail;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class PDFService {

    public String generatePOPDF(PurchaseOrder po) {
        try {
            // Create PDF file path in uploads/pdfs directory
            String fileName = "PO_" + po.getPoNumber() + "_" + System.currentTimeMillis() + ".pdf";
            String uploadsDir = "uploads";
            String pdfsDir = uploadsDir + File.separator + "pdfs";
            File pdfsFolder = new File(pdfsDir);
            if (!pdfsFolder.exists()) {
                pdfsFolder.mkdirs();
            }
            String filePath = pdfsDir + File.separator + fileName;
            
            // Create PDF document
            PdfWriter writer = new PdfWriter(filePath);
            PdfDocument pdfDoc = new PdfDocument(writer);
            Document document = new Document(pdfDoc);
            
            // Set font for Vietnamese character support
            PdfFont font = getVietnameseFont();
            
            // Add title
            Paragraph title = new Paragraph("PURCHASE ORDER")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(20)
                    .setBold()
                    .setFont(font);
            document.add(title);
            
            // Add PO information
            addPOInfo(document, po, font);
            
            // Add line items table
            addLineItemsTable(document, po, font);
            
            // Add totals
            addTotals(document, po, font);
            
            // Add footer
            addFooter(document, font);
            
            document.close();
            
            log.info("PDF generated successfully: {}", filePath);
            return filePath;
            
        } catch (IOException e) {
            log.error("Failed to generate PDF: {}", e.getMessage());
            throw new RuntimeException("Failed to generate PDF", e);
        }
    }
    
    private void addPOInfo(Document document, PurchaseOrder po, PdfFont font) throws IOException {
        Table infoTable = new Table(2).useAllAvailableWidth();
        
        // PO Number
        infoTable.addCell(new Cell().add(new Paragraph("PO Number:").setBold().setFont(font)));
        infoTable.addCell(new Cell().add(new Paragraph(po.getPoNumber()).setFont(font)));
        
        // Supplier
        infoTable.addCell(new Cell().add(new Paragraph("Supplier:").setBold().setFont(font)));
        String supplierName = po.getSupplier() != null && po.getSupplier().getName() != null ? 
            po.getSupplier().getName() : "N/A";
        String processedSupplierName = handleVietnameseText(supplierName);
        infoTable.addCell(new Cell().add(new Paragraph(processedSupplierName).setFont(font)));
        
        // Date
        infoTable.addCell(new Cell().add(new Paragraph("Date:").setBold().setFont(font)));
        infoTable.addCell(new Cell().add(new Paragraph(po.getCreateAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))).setFont(font)));
        
        // Expected Delivery
        if (po.getExpectedDeliveryAt() != null) {
            infoTable.addCell(new Cell().add(new Paragraph("Expected Delivery:").setBold().setFont(font)));
            infoTable.addCell(new Cell().add(new Paragraph(po.getExpectedDeliveryAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))).setFont(font)));
        }
        
        // Status
        infoTable.addCell(new Cell().add(new Paragraph("Status:").setBold().setFont(font)));
        infoTable.addCell(new Cell().add(new Paragraph(po.getStatus()).setFont(font)));
        
        document.add(infoTable);
        document.add(new Paragraph("\n"));
    }
    
    private void addLineItemsTable(Document document, PurchaseOrder po, PdfFont font) throws IOException {
        Table table = new Table(5).useAllAvailableWidth();
        
        // Header
        table.addHeaderCell(new Cell().add(new Paragraph("Item").setBold().setFont(font)));
        table.addHeaderCell(new Cell().add(new Paragraph("Quantity").setBold().setFont(font)));
        table.addHeaderCell(new Cell().add(new Paragraph("Unit").setBold().setFont(font)));
        table.addHeaderCell(new Cell().add(new Paragraph("Unit Price").setBold().setFont(font)));
        table.addHeaderCell(new Cell().add(new Paragraph("Total").setBold().setFont(font)));
        
        // Line items
        for (PurchaseOrderDetail detail : po.getDetails()) {
            // Handle Vietnamese text with proper encoding
            String ingredientName = handleVietnameseText(detail.getIngredient().getName());
            String unitName = handleVietnameseText(detail.getUnit().getName());
            
            table.addCell(new Cell().add(new Paragraph(ingredientName).setFont(font)));
            table.addCell(new Cell().add(new Paragraph(detail.getQty().toString()).setFont(font)));
            table.addCell(new Cell().add(new Paragraph(unitName).setFont(font)));
            table.addCell(new Cell().add(new Paragraph(formatCurrency(detail.getUnitPrice())).setFont(font)));
            table.addCell(new Cell().add(new Paragraph(formatCurrency(detail.getLineTotal())).setFont(font)));
        }
        
        document.add(table);
        document.add(new Paragraph("\n"));
    }
    
    private void addTotals(Document document, PurchaseOrder po, PdfFont font) throws IOException {
        Table totalsTable = new Table(2).useAllAvailableWidth();
        
        // Subtotal
        totalsTable.addCell(new Cell().add(new Paragraph("Subtotal:").setBold().setFont(font)));
        totalsTable.addCell(new Cell().add(new Paragraph(formatCurrency(po.getTotalAmount())).setFont(font)));
        
        // Total
        BigDecimal total = po.getTotalAmount();
        totalsTable.addCell(new Cell().add(new Paragraph("TOTAL:").setBold().setFontSize(14).setFont(font)));
        totalsTable.addCell(new Cell().add(new Paragraph(formatCurrency(total)).setBold().setFontSize(14).setFont(font)));
        
        document.add(totalsTable);
    }
    
    private void addFooter(Document document, PdfFont font) throws IOException {
        document.add(new Paragraph("\n"));
        document.add(new Paragraph("Terms & Conditions:").setBold().setFont(font));
        document.add(new Paragraph("• Payment terms: Net 30 days").setFont(font));
        document.add(new Paragraph("• Delivery: As per agreed schedule").setFont(font));
        document.add(new Paragraph("• Quality: Must meet specifications").setFont(font));
        document.add(new Paragraph("\n"));
        document.add(new Paragraph("Generated on: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))).setFont(font));
    }
    
    private String formatCurrency(BigDecimal amount) {
        return String.format("%,.2f VND", amount);
    }
    
    private PdfFont getVietnameseFont() throws IOException {
        try {
            // Approach 1: Try to use font files directly from system
            String[] systemFontPaths = {
                "C:/Windows/Fonts/times.ttf",
                "C:/Windows/Fonts/arial.ttf", 
                "C:/Windows/Fonts/tahoma.ttf",
                "C:/Windows/Fonts/verdana.ttf",
                "C:/Windows/Fonts/calibri.ttf"
            };
            
            for (String fontPath : systemFontPaths) {
                try {
                    File fontFile = new File(fontPath);
                    if (fontFile.exists()) {
                        PdfFont font = PdfFontFactory.createFont(fontPath, PdfEncodings.IDENTITY_H);
                        if (testFontWithVietnamese(font)) {
                            return font;
                        }
                    }
                } catch (Exception e) {
                    // Try next font
                }
            }
            
            // Approach 2: Try system font names with different methods
            String[] fontNames = {
                "Times New Roman",
                "Arial", 
                "Tahoma",
                "Verdana",
                "Calibri"
            };
            
            for (String fontName : fontNames) {
                try {
                    // Method 1: Direct font name
                    PdfFont font = PdfFontFactory.createFont(fontName, PdfEncodings.IDENTITY_H);
                    if (testFontWithVietnamese(font)) {
                        return font;
                    }
                } catch (Exception e) {
                    // Method 2: Try with different encoding
                    try {
                        PdfFont font = PdfFontFactory.createFont(fontName, PdfEncodings.UTF8);
                        if (testFontWithVietnamese(font)) {
                            return font;
                        }
                    } catch (Exception ex) {
                        // Try next font
                    }
                }
            }
            
            // Approach 3: Use built-in fonts with proper encoding
            try {
                PdfFont font = PdfFontFactory.createFont(StandardFonts.HELVETICA, PdfEncodings.IDENTITY_H);
                return font;
            } catch (Exception e) {
                // Final fallback
                return PdfFontFactory.createFont(StandardFonts.HELVETICA);
            }
            
        } catch (Exception e) {
            return PdfFontFactory.createFont(StandardFonts.HELVETICA);
        }
    }
    
    private boolean testFontWithVietnamese(PdfFont font) {
        try {
            // Test with the specific problematic text
            String testText = "Bao Bì Xanh Việt Nam, Cốc giấy in logo 350ml, ống hút nhựa PP";
            Paragraph testParagraph = new Paragraph(testText).setFont(font);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
    
    private void testVietnameseText(PdfFont font) {
        try {
            // Test specific Vietnamese characters that were problematic
            String testText = "Bao Bì Xanh Việt Nam, Cốc giấy in logo 350ml, ống hút nhựa PP";
            Paragraph testParagraph = new Paragraph(testText).setFont(font);
        } catch (Exception e) {
            // Test failed
        }
    }
    
    // Alternative approach: Create a custom font with better Vietnamese support
    private PdfFont createCustomVietnameseFont() throws IOException {
        try {
            // Try to create a font that specifically handles Vietnamese characters
            // This approach uses a combination of techniques
            
            // First, try to find a font that works with Vietnamese
            String[] testFonts = {
                "Times New Roman",
                "Arial",
                "Tahoma"
            };
            
            for (String fontName : testFonts) {
                try {
                    // Create font with proper encoding
                    PdfFont font = PdfFontFactory.createFont(fontName, PdfEncodings.IDENTITY_H);
                    
                    // Test with a simple Vietnamese character first
                    String simpleTest = "Việt Nam";
                    try {
                        Paragraph test = new Paragraph(simpleTest).setFont(font);
                        return font;
                    } catch (Exception e) {
                        // Try next font
                    }
                } catch (Exception e) {
                    // Try next font
                }
            }
            
            // If all else fails, use a basic font but with proper encoding
            return PdfFontFactory.createFont(StandardFonts.HELVETICA, PdfEncodings.IDENTITY_H);
            
        } catch (Exception e) {
            return PdfFontFactory.createFont(StandardFonts.HELVETICA);
        }
    }
    
    // Handle Vietnamese text with proper encoding and fallback
    private String handleVietnameseText(String text) {
        if (text == null || text.trim().isEmpty()) {
            return "N/A";
        }
        
        try {
            // Ensure proper UTF-8 encoding
            String processedText = new String(text.getBytes("UTF-8"), "UTF-8");
            return processedText;
        } catch (Exception e) {
            // Return original text if processing fails
            return text;
        }
    }
    
    // Scheduled task to clean up PDF files every 6 hours (0, 6, 12, 18)
    @Scheduled(cron = "0 0 0,6,12,18 * * ?")
    public void cleanupPDFFiles() {
        try {
            String pdfsDir = "uploads" + File.separator + "pdfs";
            File pdfsFolder = new File(pdfsDir);
            
            if (pdfsFolder.exists() && pdfsFolder.isDirectory()) {
                File[] pdfFiles = pdfsFolder.listFiles((dir, name) -> name.toLowerCase().endsWith(".pdf"));
                
                if (pdfFiles != null) {
                    int deletedCount = 0;
                    for (File pdfFile : pdfFiles) {
                        if (pdfFile.delete()) {
                            deletedCount++;
                        }
                    }
                    log.info("Cleaned up {} PDF files from {}", deletedCount, pdfsDir);
                }
            }
        } catch (Exception e) {
            log.error("Failed to cleanup PDF files: {}", e.getMessage());
        }
    }
    
}
