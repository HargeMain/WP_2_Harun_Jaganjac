import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TrackersService } from '../../../core/services/trackers.service';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-drawer-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './drawer-menu.html',
  styleUrls: ['./drawer-menu.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DrawerMenu {
  @Input() primaryColor?: string = '#1e3a8a';
  @Input() secondaryColor?: string = '#ffffff';
  @Input() role?: 'admin' | 'user' = 'user';
  @Input() userId?: string = '';
  @Input() userName?: string = 'User';

  @Output() drawerStateChange = new EventEmitter<boolean>();

  isOpen = false;
  showSubmenu = false;
  trackersService = new TrackersService();

  constructor(private router: Router) { }

  toggleDrawer() {
    this.isOpen = !this.isOpen;
    this.drawerStateChange.emit(this.isOpen);
  }

  toggleSubmenu() {
    this.showSubmenu = !this.showSubmenu;
  }

  navigateAndClose(path: string) {
    this.router.navigate([path]);
    this.toggleDrawer();
  }

  async downloadUserDataPdf() {
    if (!this.userId) return;

    const tables = await this.trackersService.getAllTrackersAsTables(this.userId);
    const doc = new jsPDF('p', 'mm', 'a4');

    let y = 20;

    doc.setFontSize(24);
    doc.setTextColor(...this.hexToRgb(this.primaryColor!));
    doc.text('Personal Data Export', 105, y, { align: 'center' });

    y += 10;

    doc.setFontSize(14);
    doc.setTextColor(80);
    doc.text(`User: ${this.userName || 'Unknown User'}`, 105, y, { align: 'center' });

    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 105, y, { align: 'center' });

    y += 15;

    for (const table of tables) {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      doc.setDrawColor(...this.hexToRgb(this.primaryColor!));
      doc.setLineWidth(0.5);
      doc.line(14, y, 196, y);

      y += 6;

      doc.setFontSize(16);
      doc.setTextColor(...this.hexToRgb(this.primaryColor!));
      doc.text(table.trackerName.replace(/([A-Z])/g, ' $1').toUpperCase(), 14, y);

      y += 8;

      if (table.isEmpty) {
        doc.setFontSize(11);
        doc.setTextColor(150);
        doc.text('No data available for this tracker.', 18, y);
        y += 10;
        continue;
      }

      doc.setFontSize(11);
      doc.setTextColor(50);

      let index = 1;

      for (const row of table.rows) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFont('', 'bold');
        doc.text(`• ${index}`, 18, y);
        y += 5;

        doc.setFont('', 'normal');

        if (row.key !== undefined) {
          doc.text(`Key: ${row.key}`, 22, y);
          y += 5;

          doc.text(`Value: ${this.formatValue(row.value)}`, 22, y);
          y += 6;
        } else if (typeof row === 'object') {
          Object.entries(row).forEach(([k, v]) => {
            doc.text(`${k}: ${this.formatValue(v)}`, 22, y);
            y += 5;
          });
          y += 2;
        } else {
          doc.text(this.formatValue(row), 22, y);
          y += 6;
        }

        index++;
      }

      y += 6;
    }

    doc.setFontSize(9);
    doc.setTextColor(160);
    doc.text(
      'This document contains personal data exported by the user.',
      105,
      290,
      { align: 'center' }
    );

    doc.save(`my-data-${new Date().toISOString().split('T')[0]}.pdf`);
    this.toggleDrawer();
  }


  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ]
      : [0, 0, 0];
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return value.toString();
    if (Array.isArray(value)) return `(${value.length} items)`;
    if (typeof value === 'object') return 'Object';
    return String(value);
  }

}