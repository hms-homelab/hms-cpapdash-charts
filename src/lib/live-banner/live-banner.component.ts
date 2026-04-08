import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'sl-live-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="live-banner">
      <span class="live-dot"></span>
      <span class="live-text">LIVE</span>
      <span class="live-info">Started {{ startTime }} &mdash; {{ duration }}</span>
      <span class="live-poll" *ngIf="pollLabel">{{ pollLabel }}</span>
    </div>
  `,
  styles: [`
    .live-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      background: linear-gradient(135deg, rgba(76,175,80,0.15), rgba(76,175,80,0.05));
      border: 1px solid rgba(76,175,80,0.4);
      border-radius: 8px;
      padding: 0.6rem 1rem;
      margin-bottom: 0.75rem;
    }
    .live-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #4caf50;
      animation: pulse-dot 1.5s ease-in-out infinite;
    }
    .live-text {
      color: #4caf50;
      font-weight: 700;
      font-size: 0.85rem;
      letter-spacing: 1px;
    }
    .live-info {
      color: #ccc;
      font-size: 0.8rem;
    }
    .live-poll {
      color: #666;
      font-size: 0.7rem;
      margin-left: auto;
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(76,175,80,0.4); }
      50% { opacity: 0.6; box-shadow: 0 0 0 6px rgba(76,175,80,0); }
    }
  `]
})
export class LiveBannerComponent {
  @Input() startTime = '';
  @Input() duration = '';
  @Input() pollLabel = 'Refreshing every 65s';
}
