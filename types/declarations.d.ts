// declarations.d.ts
declare module 'react-native-razorpay' {
  interface RazorpayOptions {
    description?: string;
    image?: string;
    currency: string;
    key: string;
    amount: string;
    name: string;
    id?: string;
    prefill?: {
      email?: string;
      contact?: string;
      name?: string;
    };
    theme?: {
      color?: string;
      hide_topbar?: boolean;
      backdrop_color?: string;
    };
    modal?: {
      backdrop?: boolean;
      webref?: boolean;
    };
    notes?: Record<string, string>;
    send_sms_hash?: boolean;
    allow_rotation?: boolean;
    retry?: {
      enabled: boolean;
      max_count: number;
    };
  }

  interface PaymentSuccessResponse {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
  }

  const RazorpayCheckout: {
    open(options: RazorpayOptions): Promise<PaymentSuccessResponse>;
  };

  export default RazorpayCheckout;
}


