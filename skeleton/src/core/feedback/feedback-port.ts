export interface FeedbackPort {
  error(message: string): void;
  success(message: string): void;
}
