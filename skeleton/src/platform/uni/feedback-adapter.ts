import type { FeedbackPort } from "../../core/feedback/feedback-port";

export class UniFeedbackAdapter implements FeedbackPort {
  error(message: string): void {
    uni.showToast({
      title: message,
      icon: "none",
    });
  }

  success(message: string): void {
    uni.showToast({
      title: message,
      icon: "success",
    });
  }
}
