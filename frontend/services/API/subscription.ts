import { ACCESS_TOKEN, API_URL } from '@/CONSTANTS';
import { DjangoSubscriptionResponse, UserSubscriptionStatus } from '@/services/types/subscription';
import * as SecureStore from 'expo-secure-store';


class ApiClient {
  private async getAuthToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(ACCESS_TOKEN);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: 'Network request failed',
      }));
      throw new Error(error.detail || 'Request failed');
    }

    return response.json();
  }

  // Подписки
  async purchaseGooglePlay(data: {
    product_id: string;
    purchase_token: string;
    receipt_data?: string;
  }): Promise<DjangoSubscriptionResponse> {
    return this.request('api/subscription/subscriptions/purchase_google_play/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async purchaseAppStore(data: {
    product_id: string;
    receipt_data: string;
    transaction_id?: string;
  }): Promise<DjangoSubscriptionResponse> {
    return this.request('api/subscription/subscriptions/purchase_app_store/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCurrentSubscription(): Promise<any> {
    return this.request('api/subscription/subscriptions/current/');
  }

  async getSubscriptionStatus(): Promise<UserSubscriptionStatus> {
    return this.request('api/subscription/subscriptions/status/');
  }

  async cancelSubscription(
    subscriptionId: number,
    reason?: string
  ): Promise<any> {
    return this.request(
      `api/subscription/subscriptions/${subscriptionId}/cancel/`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }
    );
  }

  async restorePurchases(platform: 'google_play' | 'app_store'): Promise<any> {
    return this.request('api/subscription/user-info/restore_purchases/', {
      method: 'POST',
      body: JSON.stringify({ platform }),
    });
  }

  async getAvailablePlans(): Promise<any> {
    return this.request('api/subscription/plans/available/');
  }

  async getTransactionHistory(): Promise<any> {
    return this.request('api/subscription/transactions/history/');
  }
}

export const apiClient = new ApiClient();

export const saveAuthToken = async (token: string): Promise<void> => {
  await SecureStore.setItemAsync(ACCESS_TOKEN, token);
};

export const removeAuthToken = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN);
};

export const getAuthToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync(ACCESS_TOKEN);
};
