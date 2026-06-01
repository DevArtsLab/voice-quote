import { Component, computed } from '@angular/core';
import { LiquidGlassThemeService } from '../../services/liquid-glass-theme.service';

@Component({
  selector: 'app-animated-background',
  standalone: true,
  template: `
    <div class="bg-root" [style]="bgStyle()">
      <div class="orb orb-1" [style.background]="theme().orb1"></div>
      <div class="orb orb-2" [style.background]="theme().orb2"></div>
      <div class="orb orb-3" [style.background]="theme().orb3"></div>
      <div class="orb orb-4" [style.background]="theme().orb4"></div>
      <!-- Noise texture overlay for depth -->
      <div class="noise"></div>
    </div>
  `,
  styles: [`
    .bg-root {
      position: fixed;
      inset: 0;
      z-index: 0;
      transition: background 1.2s ease-in-out;
      overflow: hidden;
    }
    .orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      mix-blend-mode: screen;
      opacity: 0.85;
      transition: background 1.2s ease-in-out;
    }
    .orb-1 {
      width: 600px; height: 600px;
      top: -150px; left: -100px;
      animation: orb-drift-1 18s ease-in-out infinite;
    }
    .orb-2 {
      width: 500px; height: 500px;
      top: 30%; right: -80px;
      animation: orb-drift-2 22s ease-in-out infinite;
    }
    .orb-3 {
      width: 450px; height: 450px;
      bottom: -100px; left: 25%;
      animation: orb-drift-3 26s ease-in-out infinite;
    }
    .orb-4 {
      width: 350px; height: 350px;
      top: 55%; left: 10%;
      animation: orb-drift-4 20s ease-in-out infinite;
    }
    .noise {
      position: absolute;
      inset: 0;
      opacity: 0.035;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
      background-size: 200px;
      pointer-events: none;
    }
  `],
})
export class AnimatedBackgroundComponent {
  readonly theme = computed(() => this.themeService.theme());

  readonly bgStyle = computed(() => {
    const t = this.theme();
    return `background: radial-gradient(ellipse at 20% 20%, ${t.orb1} 0%, transparent 60%),
                         radial-gradient(ellipse at 80% 80%, ${t.orb2} 0%, transparent 55%),
                         #0a0a1a`;
  });

  constructor(private themeService: LiquidGlassThemeService) {}
}
