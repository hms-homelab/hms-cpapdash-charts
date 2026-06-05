import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CPAPDASH_COLORS } from '../theme';

export interface EventCounts {
  oa: number;
  ca: number;
  h: number;
  rera: number;
}

@Component({
  selector: 'sl-event-badges',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="event-summary" *ngIf="hasEvents">
      <span class="event-badge" [style.background]="colors.eventObstructive">OA: {{ events.oa }}</span>
      <span class="event-badge" [style.background]="colors.eventCentral">CA: {{ events.ca }}</span>
      <span class="event-badge"
        [style.background]="colors.eventHypopnea"
        style="color: #000">H: {{ events.h }}</span>
      <span class="event-badge"
        [style.background]="colors.eventRera"
        style="color: #000">RERA: {{ events.rera }}</span>
    </div>
  `,
  styles: [`
    .event-summary {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .event-badge {
      color: #fff;
      padding: 0.2rem 0.5rem;
      border-radius: 12px;
      font-size: 0.7rem;
      font-weight: 600;
    }
  `]
})
export class EventBadgesComponent {
  @Input() events: EventCounts = { oa: 0, ca: 0, h: 0, rera: 0 };

  colors = CPAPDASH_COLORS;

  get hasEvents(): boolean {
    return (this.events.oa + this.events.ca + this.events.h + this.events.rera) > 0;
  }
}
