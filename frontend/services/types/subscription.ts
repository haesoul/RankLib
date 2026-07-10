
import { PurchasesPackage } from 'react-native-purchases';

export interface SubscriptionPlan {
  id: string;
  title: string;
  subtitle: string;
  price: string;
  period: string;
  features: string[];
  badge?: string;
  isPopular?: boolean;
  package?: PurchasesPackage;
  gradient: readonly [string, string, ...string[]]; 
}

export interface DjangoSubscriptionResponse {
  detail: string;
  subscription: {
    id: number;
    user: number;
    plan: number;
    plan_details: {
      id: number;
      name: string;
      plan_type: string;
      price: string;
      duration_type: string;
      features: Record<string, any>;
    };
    status: 'active' | 'expired' | 'cancelled' | 'pending' | 'trial';
    platform: 'google_play' | 'app_store' | 'web' | 'admin';
    start_date: string;
    end_date: string;
    auto_renew: boolean;
    is_active_now: boolean;
    days_remaining: number;
  };
  transaction: {
    id: number;
    status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
    payment_method: string;
    amount: string;
    currency: string;
    platform_transaction_id: string;
  };
}

export interface UserSubscriptionStatus {
  has_active_subscription: boolean;
  current_subscription: any;
  subscription_plan: any;
  expires_at: string | null;
  days_remaining: number;
  can_upgrade: boolean;
  available_plans: any[];
}
