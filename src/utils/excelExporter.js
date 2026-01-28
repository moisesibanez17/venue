const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

class ExcelExporter {
    /**
     * Export attendees list to Excel
     */
    static async exportAttendees(event, tickets, outputPath = null) {
        try {
            // Create workbook
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Event Platform';
            workbook.created = new Date();

            // Add worksheet
            const worksheet = workbook.addWorksheet('Attendees');

            // Define columns
            worksheet.columns = [
                { header: 'Ticket Number', key: 'ticket_number', width: 20 },
                { header: 'Full Name', key: 'full_name', width: 25 },
                { header: 'Email', key: 'email', width: 30 },
                { header: 'Phone', key: 'phone', width: 15 },
                { header: 'Ticket Type', key: 'ticket_type', width: 20 },
                { header: 'Purchase Date', key: 'purchase_date', width: 20 },
                { header: 'Amount Paid', key: 'amount_paid', width: 15 },
                { header: 'Status', key: 'status', width: 12 },
                { header: 'Checked In', key: 'checked_in', width: 15 },
                { header: 'Check-in Time', key: 'checkin_time', width: 20 }
            ];

            // Style header row
            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' }
            };
            worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

            // Add data
            tickets.forEach(ticket => {
                worksheet.addRow({
                    ticket_number: ticket.ticket_number,
                    full_name: ticket.user.full_name,
                    email: ticket.user.email,
                    phone: ticket.user.phone || 'N/A',
                    ticket_type: ticket.ticket_type.name,
                    purchase_date: new Date(ticket.purchase.created_at).toLocaleDateString('es-ES'),
                    amount_paid: `$${ticket.purchase.total}`,
                    status: ticket.status,
                    checked_in: ticket.status === 'used' ? 'Yes' : 'No',
                    checkin_time: ticket.checked_in_at ? new Date(ticket.checked_in_at).toLocaleString('es-ES') : 'N/A'
                });
            });

            // Add conditional formatting for status
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1) { // Skip header
                    const statusCell = row.getCell('status');
                    if (statusCell.value === 'used') {
                        statusCell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FF70AD47' }
                        };
                    } else if (statusCell.value === 'cancelled') {
                        statusCell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFFF0000' }
                        };
                    }
                }
            });

            // Add summary section
            const summaryRow = worksheet.rowCount + 3;
            worksheet.getCell(`A${summaryRow}`).value = 'Summary Statistics';
            worksheet.getCell(`A${summaryRow}`).font = { bold: true, size: 14 };

            const totalTickets = tickets.length;
            const checkedIn = tickets.filter(t => t.status === 'used').length;
            const totalRevenue = tickets.reduce((sum, t) => sum + parseFloat(t.purchase.total), 0);

            worksheet.getCell(`A${summaryRow + 1}`).value = 'Total Tickets:';
            worksheet.getCell(`B${summaryRow + 1}`).value = totalTickets;

            worksheet.getCell(`A${summaryRow + 2}`).value = 'Checked In:';
            worksheet.getCell(`B${summaryRow + 2}`).value = checkedIn;

            worksheet.getCell(`A${summaryRow + 3}`).value = 'Check-in Rate:';
            worksheet.getCell(`B${summaryRow + 3}`).value = `${((checkedIn / totalTickets) * 100).toFixed(2)}%`;

            worksheet.getCell(`A${summaryRow + 4}`).value = 'Total Revenue:';
            worksheet.getCell(`B${summaryRow + 4}`).value = `$${totalRevenue.toFixed(2)}`;

            // Auto-fit columns
            worksheet.columns.forEach(column => {
                column.alignment = { vertical: 'middle' };
            });

            // Generate output path if not provided
            if (!outputPath) {
                const exportDir = path.join(process.cwd(), 'uploads', 'exports');
                if (!fs.existsSync(exportDir)) {
                    fs.mkdirSync(exportDir, { recursive: true });
                }
                outputPath = path.join(exportDir, `attendees-${event.id}-${Date.now()}.xlsx`);
            }

            // Write to file
            await workbook.xlsx.writeFile(outputPath);

            return outputPath;
        } catch (error) {
            console.error('Excel Export Error:', error);
            throw error;
        }
    }

    /**
     * Export sales report
     */
    static async exportSalesReport(event, purchases, outputPath = null) {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Sales Report');

            // Event header
            worksheet.mergeCells('A1:F1');
            worksheet.getCell('A1').value = event.title;
            worksheet.getCell('A1').font = { bold: true, size: 16 };
            worksheet.getCell('A1').alignment = { horizontal: 'center' };

            worksheet.mergeCells('A2:F2');
            worksheet.getCell('A2').value = `Sales Report - Generated ${new Date().toLocaleDateString('es-ES')}`;
            worksheet.getCell('A2').alignment = { horizontal: 'center' };

            // Columns
            worksheet.getRow(4).values = ['Date', 'Customer Name', 'Email', 'Ticket Type', 'Quantity', 'Total'];
            worksheet.getRow(4).font = { bold: true };
            worksheet.getRow(4).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF70AD47' }
            };

            // Data
            let totalRevenue = 0;
            let totalTickets = 0;

            purchases.forEach((purchase, index) => {
                worksheet.addRow([
                    new Date(purchase.created_at).toLocaleDateString('es-ES'),
                    purchase.user.full_name,
                    purchase.user.email,
                    purchase.ticket_type.name,
                    purchase.quantity,
                    `$${purchase.total}`
                ]);

                totalRevenue += parseFloat(purchase.total);
                totalTickets += purchase.quantity;
            });

            // Totals
            const totalRow = worksheet.rowCount + 2;
            worksheet.getCell(`E${totalRow}`).value = 'Total Tickets:';
            worksheet.getCell(`E${totalRow}`).font = { bold: true };
            worksheet.getCell(`F${totalRow}`).value = totalTickets;

            worksheet.getCell(`E${totalRow + 1}`).value = 'Total Revenue:';
            worksheet.getCell(`E${totalRow + 1}`).font = { bold: true };
            worksheet.getCell(`F${totalRow + 1}`).value = `$${totalRevenue.toFixed(2)}`;
            worksheet.getCell(`F${totalRow + 1}`).font = { bold: true };

            // Column widths
            worksheet.getColumn(1).width = 15;
            worksheet.getColumn(2).width = 25;
            worksheet.getColumn(3).width = 30;
            worksheet.getColumn(4).width = 20;
            worksheet.getColumn(5).width = 10;
            worksheet.getColumn(6).width = 15;

            if (!outputPath) {
                const exportDir = path.join(process.cwd(), 'uploads', 'exports');
                if (!fs.existsSync(exportDir)) {
                    fs.mkdirSync(exportDir, { recursive: true });
                }
                outputPath = path.join(exportDir, `sales-${event.id}-${Date.now()}.xlsx`);
            }

            await workbook.xlsx.writeFile(outputPath);

            return outputPath;
        } catch (error) {
            console.error('Excel Sales Report Error:', error);
            throw error;
        }
    }
}

module.exports = ExcelExporter;
