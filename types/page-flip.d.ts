declare module 'page-flip' {
  export type FlipCorner = 'top' | 'bottom';
  export type FlipState = 'user_fold' | 'fold_corner' | 'flipping' | 'read';
  export type FlipOrientation = 'portrait' | 'landscape';

  export type PageFlipEvent<T> = {
    data: T;
    object: PageFlip;
  };

  export type PageFlipSettings = {
    startPage?: number;
    size?: 'fixed' | 'stretch';
    width: number;
    height: number;
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    drawShadow?: boolean;
    flippingTime?: number;
    usePortrait?: boolean;
    startZIndex?: number;
    autoSize?: boolean;
    maxShadowOpacity?: number;
    showCover?: boolean;
    mobileScrollSupport?: boolean;
    clickEventForward?: boolean;
    useMouseEvents?: boolean;
    swipeDistance?: number;
    showPageCorners?: boolean;
    disableFlipByClick?: boolean;
  };

  export class PageFlip {
    constructor(root: HTMLElement, settings: PageFlipSettings);
    on(
      event: 'init',
      callback: (
        event: PageFlipEvent<{ page: number; mode: FlipOrientation }>,
      ) => void,
    ): this;
    on(event: 'flip', callback: (event: PageFlipEvent<number>) => void): this;
    on(
      event: 'changeState',
      callback: (event: PageFlipEvent<FlipState>) => void,
    ): this;
    on(
      event: 'changeOrientation',
      callback: (event: PageFlipEvent<FlipOrientation>) => void,
    ): this;
    loadFromHTML(items: HTMLElement[]): void;
    updateFromHtml(items: HTMLElement[]): void;
    flipNext(corner?: FlipCorner): void;
    flipPrev(corner?: FlipCorner): void;
    flip(pageIndex: number, corner?: FlipCorner): void;
    turnToPage(pageIndex: number): void;
    turnToNextPage(): void;
    turnToPrevPage(): void;
    getPageCount(): number;
    getCurrentPageIndex(): number;
    getOrientation(): FlipOrientation;
    getState(): FlipState;
    update(): void;
    destroy(): void;
  }
}
