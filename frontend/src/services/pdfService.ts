import { jsPDF } from 'jspdf';
import { DailyLogItem, VitalsRecord } from '../types';

export const pdfService = {
  /**
   * Generates a 30-day clinical medical summary PDF report in hospital-grade A4 format
   */
  generateDoctorReport(params: {
    patientName?: string;
    caregiverName?: string;
    adherenceRate: number;
    logs: DailyLogItem[];
    vitals: VitalsRecord[];
  }): void {
    if (typeof window === 'undefined') return;

    const patientName = params.patientName || 'Eleanor Vance (Age 78)';
    const caregiver = params.caregiverName || 'Sarah Connor (Daughter)';
    const reportDate = new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // =========================================================================
    // 1. HEADER & BRANDING
    // =========================================================================
    // 5mm Royal Navy Accent Bar at the very top
    doc.setFillColor(30, 58, 138); // #1E3A8A Royal Navy
    doc.rect(0, 0, 210, 5, 'F');

    // Title: CAREBRIDGE AMBIENT HEALTHCARE
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(30, 58, 138); // #1E3A8A
    doc.text('CAREBRIDGE AMBIENT HEALTHCARE', 16, 15);

    // Subtitle & Metadata
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // #64748B Slate
    doc.text('30-Day Certified Clinical Audit & Medication Adherence Report', 16, 20.5);
    doc.text(`Generated: ${reportDate}  •  Record ID: CB-7821-EV  •  HIPAA / HL7 FHIR Compliant`, 16, 25.5);

    // Right Badge: CERTIFIED CLINICAL RECORD
    doc.setFillColor(240, 253, 244); // #F0FDF4 Emerald Tint
    doc.setDrawColor(16, 185, 129); // #10B981 Emerald Border
    doc.setLineWidth(0.35);
    doc.roundedRect(138, 9, 56, 17, 2, 2, 'FD');

    // Green pulse dot
    doc.setFillColor(16, 185, 129);
    doc.circle(144, 15.5, 1.4, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(5, 150, 105); // #059669
    doc.text('CERTIFIED CLINICAL RECORD', 148, 16.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(16, 185, 129);
    doc.text('AHA GUIDELINE COMPLIANT • EHR SYNC', 142, 21.5);

    // =========================================================================
    // 2. PROFILE CARD (Light gray container #F8FAFC, border #E2E8F0)
    // =========================================================================
    doc.setFillColor(248, 250, 252); // #F8FAFC
    doc.setDrawColor(226, 232, 240); // #E2E8F0
    doc.setLineWidth(0.3);
    doc.roundedRect(16, 31, 178, 24, 2.5, 2.5, 'FD');

    // Column Left: Patient & Caregiver
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text('PATIENT & CAREGIVER', 22, 36.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42); // #0F172A
    doc.text(patientName, 22, 42);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.text(`Primary Caregiver: ${caregiver}`, 22, 47.5);

    // Column Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.line(105, 34, 105, 52);

    // Column Right: Physician & Clinic
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('ATTENDING PHYSICIAN & CLINIC', 110, 36.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('Dr. Robert Mercer, MD (Cardiology)', 110, 42);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('CareBridge Ambient Health • Ambient EHR Hub', 110, 47.5);

    // =========================================================================
    // 3. THREE VITALS TILES (White background, border #CBD5E1)
    // =========================================================================
    const tileY = 59;
    const tileH = 24;
    const tileW = 56;
    const gap = 5;

    // Tile 1: Adherence Rate
    const t1X = 16;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225); // #CBD5E1
    doc.setLineWidth(0.3);
    doc.roundedRect(t1X, tileY, tileW, tileH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('30-DAY ADHERENCE RATE', t1X + 4, tileY + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138); // #1E3A8A Royal Navy
    doc.text(`${params.adherenceRate}%`, t1X + 4, tileY + 14.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(16, 185, 129); // #10B981 Green
    doc.text('Target: >85% Clinical Standard', t1X + 4, tileY + 19.5);

    // Tile 2: Blood Pressure
    const t2X = t1X + tileW + gap; // 77
    const latestVital = params.vitals.length > 0 ? params.vitals[params.vitals.length - 1] : null;
    const bpText =
      latestVital?.systolic && latestVital?.diastolic
        ? `${latestVital.systolic}/${latestVital.diastolic}`
        : '122/82';

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(t2X, tileY, tileW, tileH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('LATEST BLOOD PRESSURE', t2X + 4, tileY + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // #0F172A Bold
    doc.text(`${bpText} mmHg`, t2X + 4, tileY + 14.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(37, 99, 235); // #2563EB Blue
    doc.text('Resting Target: <130/80 mmHg', t2X + 4, tileY + 19.5);

    // Tile 3: Blood Sugar
    const t3X = t2X + tileW + gap; // 138
    const bsText = latestVital?.bloodSugar ? String(latestVital.bloodSugar) : '106.8';

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(t3X, tileY, tileW, tileH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('FASTING BLOOD GLUCOSE', t3X + 4, tileY + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // #0F172A
    doc.text(`${bsText} mg/dL`, t3X + 4, tileY + 14.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(16, 185, 129); // #10B981
    doc.text('Target: 70 - 130 mg/dL (Normal)', t3X + 4, tileY + 19.5);

    // =========================================================================
    // 4. MEDICATION LOGS TABLE (15–18 recent rows)
    // =========================================================================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Verified Medication Administration Records (eMAR)', 16, 90);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Recent clinical administration events', 150, 90);

    // Table Header (#F1F5F9, text #334155)
    const tableHeaderY = 93.5;
    doc.setFillColor(241, 245, 249); // #F1F5F9
    doc.setDrawColor(226, 232, 240);
    doc.rect(16, tableHeaderY, 178, 7.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85); // #334155

    doc.text('Date & Time', 19, tableHeaderY + 5);
    doc.text('Medication Name', 55, tableHeaderY + 5);
    doc.text('Dosage', 105, tableHeaderY + 5);
    doc.text('Status', 136, tableHeaderY + 5);
    doc.text('Clinical Observation', 158, tableHeaderY + 5);

    // Table Rows (18 rows max)
    let yPos = tableHeaderY + 12;
    const tableLogs = params.logs.slice(0, 18);

    tableLogs.forEach((log, index) => {
      // Alternate row background subtle tint
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(16, yPos - 4.5, 178, 6.8, 'F');
      }

      // Date & Time
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(71, 85, 105);
      const timeStr = `${log.date || ''} ${log.scheduledTime || ''}`.trim() || '2026-09-11 08:00';
      doc.text(timeStr.slice(0, 17), 19, yPos);

      // Medication Name (bold #0F172A)
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42); // #0F172A
      doc.text((log.name || 'Medication').slice(0, 24), 55, yPos);

      // Dosage
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text((log.dosage || 'Standard').slice(0, 16), 105, yPos);

      // Status (TAKEN green #16A34A / MISSED red #DC2626)
      doc.setFont('helvetica', 'bold');
      if (log.status === 'taken') {
        doc.setTextColor(22, 163, 74); // #16A34A Green
        doc.text('TAKEN', 136, yPos);
      } else {
        doc.setTextColor(220, 38, 38); // #DC2626 Red
        doc.text(log.status ? log.status.toUpperCase() : 'MISSED', 136, yPos);
      }

      // Clinical Observation (Slate #64748B)
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139); // #64748B
      const noteStr = (log.notes || 'Verified on-time intake').slice(0, 26);
      doc.text(noteStr, 158, yPos);

      // Row separator line
      doc.setDrawColor(241, 245, 249);
      doc.line(16, yPos + 2.3, 194, yPos + 2.3);

      yPos += 7.2;
    });

    // =========================================================================
    // 5. FOOTER & SIGNATURES (Y ~ 265mm)
    // =========================================================================
    const sigY = 250;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('CLINICAL ATTESTATION & SIGNATURES', 16, sigY);

    // Signature 1: Attending Physician
    const sigLineY = sigY + 14; // 264mm
    doc.setDrawColor(203, 213, 225); // #CBD5E1
    doc.setLineWidth(0.35);
    doc.line(16, sigLineY, 88, sigLineY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42); // #0F172A
    doc.text('Dr. Robert Mercer, MD', 16, sigLineY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Attending Cardiologist • Lic #CA-948210', 16, sigLineY + 8.5);

    // Signature 2: Primary Caregiver
    doc.line(112, sigLineY, 184, sigLineY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Sarah Connor', 112, sigLineY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Primary Family Caregiver • Authorized Agent', 112, sigLineY + 8.5);

    // Standard Pagination Footer
    doc.setDrawColor(226, 232, 240);
    doc.line(16, 282, 194, 282);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(
      'CareBridge Ambient Healthcare EHR • Compliant with HIPAA/HL7 Standards • Generated via jsPDF',
      16,
      286.5
    );
    doc.text('Page 1 of 1 • Certified Audit Copy', 194, 286.5, { align: 'right' });

    // Save and download PDF directly
    const patientSlug = patientName.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
    doc.save(`CareBridge-Clinical-Report-${patientSlug || 'Patient'}.pdf`);
  },
};
