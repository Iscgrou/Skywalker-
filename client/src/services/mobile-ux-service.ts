/**
 * Mobile-First UI Enhancement Service
 * Improves mobile UX with touch-friendly interactions and responsive design
 */

export interface MobileTouchGesture {
  type: 'swipe' | 'tap' | 'long-press' | 'pinch';
  direction?: 'left' | 'right' | 'up' | 'down';
  duration?: number;
  sensitivity?: number;
}

export interface MobileViewportConfig {
  breakpoints: {
    xs: number; // Extra small phones
    sm: number; // Small phones  
    md: number; // Tablets
    lg: number; // Desktops
    xl: number; // Large desktops
  };
  touchMinSize: number; // Minimum touch target size (44px recommended)
  swipeThreshold: number; // Minimum distance for swipe detection
}

export class MobileUXService {
  private config: MobileViewportConfig;
  private touchHandlers: Map<string, (gesture: MobileTouchGesture) => void> = new Map();
  private isTouch: boolean = false;

  constructor(config?: Partial<MobileViewportConfig>) {
    this.config = {
      breakpoints: {
        xs: 375,
        sm: 640, 
        md: 768,
        lg: 1024,
        xl: 1280
      },
      touchMinSize: 44,
      swipeThreshold: 50,
      ...config
    };

    this.detectTouchDevice();
    this.setupGlobalTouchHandlers();
  }

  private detectTouchDevice(): void {
    this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Add touch class to body for CSS targeting
    if (this.isTouch) {
      document.body.classList.add('touch-device');
    } else {
      document.body.classList.add('no-touch');
    }
  }

  private setupGlobalTouchHandlers(): void {
    if (!this.isTouch) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    document.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const touchEndTime = Date.now();
      
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      const deltaTime = touchEndTime - touchStartTime;

      // Detect swipe gestures
      if (Math.abs(deltaX) > this.config.swipeThreshold || Math.abs(deltaY) > this.config.swipeThreshold) {
        let direction: 'left' | 'right' | 'up' | 'down';
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          direction = deltaX > 0 ? 'right' : 'left';
        } else {
          direction = deltaY > 0 ? 'down' : 'up';
        }

        this.triggerGesture({
          type: 'swipe',
          direction,
          duration: deltaTime
        });
      }

      // Detect long press
      if (deltaTime > 500 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
        this.triggerGesture({
          type: 'long-press',
          duration: deltaTime
        });
      }
    }, { passive: true });
  }

  private triggerGesture(gesture: MobileTouchGesture): void {
    const handlerKey = `${gesture.type}${gesture.direction ? ':' + gesture.direction : ''}`;
    const handler = this.touchHandlers.get(handlerKey);
    if (handler) {
      handler(gesture);
    }
  }

  // Register touch gesture handler
  public onGesture(type: string, direction: string | null, handler: (gesture: MobileTouchGesture) => void): void {
    const key = direction ? `${type}:${direction}` : type;
    this.touchHandlers.set(key, handler);
  }

  // Get current viewport size category
  public getViewportSize(): 'xs' | 'sm' | 'md' | 'lg' | 'xl' {
    const width = window.innerWidth;
    
    if (width < this.config.breakpoints.xs) return 'xs';
    if (width < this.config.breakpoints.sm) return 'sm';
    if (width < this.config.breakpoints.md) return 'md';
    if (width < this.config.breakpoints.lg) return 'lg';
    return 'xl';
  }

  // Check if device is mobile
  public isMobileDevice(): boolean {
    return this.getViewportSize() <= 'md';
  }

  // Check if device supports touch
  public isTouchDevice(): boolean {
    return this.isTouch;
  }

  // Optimize element for touch interaction
  public optimizeForTouch(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    
    if (rect.width < this.config.touchMinSize || rect.height < this.config.touchMinSize) {
      // Add touch-friendly padding
      element.style.minWidth = `${this.config.touchMinSize}px`;
      element.style.minHeight = `${this.config.touchMinSize}px`;
      element.classList.add('touch-optimized');
    }

    // Add touch feedback
    element.addEventListener('touchstart', () => {
      element.classList.add('touch-active');
    }, { passive: true });

    element.addEventListener('touchend', () => {
      setTimeout(() => element.classList.remove('touch-active'), 100);
    }, { passive: true });
  }

  // Show mobile keyboard-friendly input
  public optimizeInputForMobile(input: HTMLInputElement): void {
    if (!this.isMobileDevice()) return;

    // Set appropriate input modes
    switch (input.type) {
      case 'email':
        input.inputMode = 'email';
        break;
      case 'tel':
        input.inputMode = 'tel';
        break;
      case 'number':
        input.inputMode = 'numeric';
        break;
      case 'url':
        input.inputMode = 'url';
        break;
    }

    // Add mobile-friendly attributes
    input.autocomplete = 'off';
    (input as any).autocorrect = 'off';
    (input as any).autocapitalize = 'off';
    input.spellcheck = false;

    // Add focus handling for viewport adjustment
    input.addEventListener('focus', () => {
      setTimeout(() => {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    });
  }

  // Apply mobile-first CSS classes
  public applyMobileCSS(): void {
    const style = document.createElement('style');
    style.textContent = `
      /* Mobile-First Touch Optimizations */
      .touch-device .touch-optimized {
        cursor: pointer;
        user-select: none;
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
        transition: transform 0.1s ease, box-shadow 0.1s ease;
      }

      .touch-device .touch-optimized.touch-active {
        transform: scale(0.98);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }

      /* Enhanced button touch targets */
      .touch-device button, 
      .touch-device a, 
      .touch-device [role="button"] {
        min-height: 44px;
        min-width: 44px;
        touch-action: manipulation;
      }

      /* Mobile table scrolling */
      @media (max-width: 768px) {
        .mobile-table-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .mobile-table-scroll table {
          min-width: 600px;
        }

        /* Mobile card layout for tables */
        .mobile-card-table {
          display: block;
        }

        .mobile-card-table thead {
          display: none;
        }

        .mobile-card-table tbody {
          display: block;
        }

        .mobile-card-table tr {
          display: block;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin-bottom: 16px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .mobile-card-table td {
          display: block;
          text-align: right;
          border: none;
          padding: 8px 0;
          position: relative;
        }

        .mobile-card-table td:before {
          content: attr(data-label) ': ';
          font-weight: bold;
          color: #374151;
          display: inline-block;
          margin-left: 8px;
        }
      }

      /* Mobile navigation improvements */
      @media (max-width: 768px) {
        .mobile-nav-bottom {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-top: 1px solid #e5e7eb;
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
          z-index: 50;
          display: flex;
          justify-content: space-around;
          padding: 8px 0;
        }

        .mobile-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px 12px;
          min-width: 60px;
          text-decoration: none;
          color: #6b7280;
          transition: color 0.2s ease;
        }

        .mobile-nav-item.active {
          color: #3b82f6;
        }

        .mobile-nav-item svg {
          width: 24px;
          height: 24px;
          margin-bottom: 4px;
        }

        .mobile-nav-item span {
          font-size: 12px;
          text-align: center;
        }
      }

      /* Mobile drawer/sheet improvements */
      .mobile-drawer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: white;
        border-radius: 16px 16px 0 0;
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
        transform: translateY(100%);
        transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        z-index: 60;
        max-height: 90vh;
        overflow-y: auto;
      }

      .mobile-drawer.open {
        transform: translateY(0);
      }

      .mobile-drawer-handle {
        width: 40px;
        height: 4px;
        background: #d1d5db;
        border-radius: 2px;
        margin: 12px auto;
      }

      /* Mobile form optimizations */
      @media (max-width: 768px) {
        .mobile-form input,
        .mobile-form select,
        .mobile-form textarea {
          font-size: 16px; /* Prevents zoom on iOS */
          padding: 12px;
          border-radius: 8px;
        }

        .mobile-form .form-row {
          flex-direction: column;
        }

        .mobile-form .form-row > * {
          margin-bottom: 16px;
        }
      }

      /* Mobile modal/dialog improvements */
      @media (max-width: 768px) {
        .mobile-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: white;
          z-index: 70;
          overflow-y: auto;
        }

        .mobile-modal-header {
          position: sticky;
          top: 0;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .mobile-modal-content {
          padding: 16px;
          padding-bottom: 100px; /* Space for fixed buttons */
        }

        .mobile-modal-footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-top: 1px solid #e5e7eb;
          padding: 16px;
        }
      }

      /* Better loading states for mobile */
      .mobile-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        color: #6b7280;
      }

      .mobile-loading-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #f3f4f6;
        border-top: 3px solid #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 16px;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      /* Mobile pull-to-refresh */
      .mobile-pull-refresh {
        touch-action: pan-y;
        overflow-y: auto;
      }

      .mobile-pull-indicator {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
        transform: translateY(-100%);
        transition: transform 0.3s ease;
      }

      .mobile-pull-indicator.active {
        transform: translateY(0);
      }
    `;
    
    document.head.appendChild(style);
  }

  // Initialize mobile optimizations for existing elements
  public initializePage(): void {
    this.applyMobileCSS();

    // Optimize all buttons for touch
    document.querySelectorAll('button, [role="button"], a').forEach(element => {
      this.optimizeForTouch(element as HTMLElement);
    });

    // Optimize all inputs for mobile
    document.querySelectorAll('input').forEach(input => {
      this.optimizeInputForMobile(input as HTMLInputElement);
    });

    // Add mobile classes to tables
    document.querySelectorAll('table').forEach(table => {
      table.classList.add('mobile-table-scroll');
      
      if (this.isMobileDevice()) {
        table.classList.add('mobile-card-table');
        
        // Add data labels for mobile card view
        const headers = table.querySelectorAll('th');
        const rows = table.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          cells.forEach((cell, index) => {
            if (headers[index]) {
              cell.setAttribute('data-label', headers[index].textContent || '');
            }
          });
        });
      }
    });
  }

  // Create mobile bottom navigation
  public createMobileBottomNav(items: Array<{
    icon: string;
    label: string;
    href: string;
    active?: boolean;
  }>): HTMLElement {
    const nav = document.createElement('nav');
    nav.className = 'mobile-nav-bottom';

    items.forEach(item => {
      const link = document.createElement('a');
      link.href = item.href;
      link.className = `mobile-nav-item ${item.active ? 'active' : ''}`;
      
      link.innerHTML = `
        <svg>
          <use href="#${item.icon}"></use>
        </svg>
        <span>${item.label}</span>
      `;
      
      nav.appendChild(link);
    });

    return nav;
  }

  // Create mobile drawer
  public createMobileDrawer(content: string): HTMLElement {
    const drawer = document.createElement('div');
    drawer.className = 'mobile-drawer';
    
    drawer.innerHTML = `
      <div class="mobile-drawer-handle"></div>
      <div class="mobile-drawer-content">
        ${content}
      </div>
    `;

    return drawer;
  }

  // Mobile performance optimizations
  public optimizePerformance(): void {
    // Add viewport meta tag if not present
    if (!document.querySelector('meta[name="viewport"]')) {
      const viewport = document.createElement('meta');
      viewport.name = 'viewport';
      viewport.content = 'width=device-width, initial-scale=1.0, user-scalable=no';
      document.head.appendChild(viewport);
    }

    // Add touch-action to prevent default behaviors
    document.documentElement.style.touchAction = 'manipulation';

    // Disable 300ms click delay
    document.documentElement.style.touchAction = 'manipulation';

    // Add passive event listeners for better scroll performance
    document.addEventListener('touchstart', () => {}, { passive: true });
    document.addEventListener('touchmove', () => {}, { passive: true });
  }
}

// Export singleton instance
export const mobileUXService = new MobileUXService();

// Auto-initialize when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      mobileUXService.initializePage();
      mobileUXService.optimizePerformance();
    });
  } else {
    mobileUXService.initializePage();
    mobileUXService.optimizePerformance();
  }
}
