/** Result of analyzing an element's click history */
export interface AnalysisResult {
  /** The element key (pageUrl::selector) */
  key: string;
  /** Whether this element should be hidden */
  shouldHide: boolean;
  /** Reason for hiding */
  reason: 'never-clicked' | 'low-frequency' | null;
  /** Click frequency: clicks per session */
  frequency: number;
  /** Fraction of sessions with zero clicks */
  zeroSessionFraction: number;
}
