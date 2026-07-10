import { FEATURE_LABELS } from '@/CONSTANTS';
import { apiClient } from '@/services/API/subscription';
import { SubscriptionPlan } from '@/services/types/subscription';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, {
    CustomerInfo,
    PurchasesPackage
} from 'react-native-purchases';

const DEFAULT_GRADIENTS = [
  ['#1E293B', '#0F172A', '#020617'], 

  ['#6366F1', '#4338CA', '#312E81'], 

  ['#262626', '#171717', '#050505'],
] as const;


interface UsePaymentsReturn {
  plans: SubscriptionPlan[];
  currentSubscription: CustomerInfo | null;
  isLoading: boolean;
  error: string | null;
  purchasePlan: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  refreshSubscriptionStatus: () => Promise<void>;
}

export const usePayments = (): UsePaymentsReturn => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeRevenueCat();
  }, []);

  const initializeRevenueCat = async () => {
    try {
      
      const data = await apiClient.getAvailablePlans();
      const rawPlans = data?.plans || []; 
      const transformedPlans: SubscriptionPlan[] = rawPlans.map((p: any, index: number) => {
        const gradientIndex = index % DEFAULT_GRADIENTS.length;
        
        let featuresArray: string[] = [];
        
        if (Array.isArray(p.features)) {
          featuresArray = p.features;
        } else if (typeof p.features === 'object' && p.features !== null) {
          featuresArray = Object.entries(p.features).map(([key, value]) => {
            const label = FEATURE_LABELS[key] || key; 
            
            if (typeof value === 'boolean') {
              return value ? label : `Нет: ${label}`;
            }
            return `${label}: ${value}`;
          });
        }
        return {
          id: String(p.id),
          title: p.name, 
          subtitle: p.duration_display,
          price: `${p.price} $`,
          period: p.duration_type === 'monthly' ? 'мес' : 'год',
          features: featuresArray,
          isPopular: p.plan_type === 'pro',
          gradient: DEFAULT_GRADIENTS[gradientIndex],
        };
      });

      setPlans(transformedPlans);
      
    } catch (e: any) {
      console.error('Initialization error:', e);
      setError('Failed to load plans');
    } finally {
      setIsLoading(false);
    }
  };
  const loadCustomerInfo = async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      setCurrentSubscription(customerInfo);
      
      await SecureStore.setItemAsync(
        'subscription_status',
        JSON.stringify({
          isActive: Object.keys(customerInfo.entitlements.active).length > 0,
          expirationDate: customerInfo.latestExpirationDate,
        })
      );
    } catch (e: any) {
      console.error('Error loading customer info:', e);
    }
  };
  const purchasePlan = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      // Покупка через RevenueCat
      const { customerInfo, productIdentifier } = await Purchases.purchasePackage(pkg);
      setCurrentSubscription(customerInfo);

      // Синхронизация с Django бэкендом
      await syncPurchaseWithBackend(customerInfo, pkg, productIdentifier);

      return true;
    } catch (e: any) {
      console.error('Purchase error:', e);
      
      if (e.userCancelled) {
        setError('Покупка отменена');
      } else {
        setError(e.message || 'Ошибка при покупке');
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const customerInfo = await Purchases.restorePurchases();
      setCurrentSubscription(customerInfo);

      // Синхронизация с бэкендом
      const platform = Platform.OS === 'ios' ? 'app_store' : 'google_play';
      await apiClient.restorePurchases(platform);

      const hasActiveSubscription = Object.keys(customerInfo.entitlements.active).length > 0;
      
      if (!hasActiveSubscription) {
        setError('Нет покупок для восстановления');
        return false;
      }

      return true;
    } catch (e: any) {
      console.error('Restore error:', e);
      setError('Не удалось восстановить покупки');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshSubscriptionStatus = useCallback(async () => {
    try {
      await loadCustomerInfo();
    } catch (e) {
      console.error('Refresh error:', e);
    }
  }, []);

  const syncPurchaseWithBackend = async (
    customerInfo: CustomerInfo,
    pkg: PurchasesPackage,
    productIdentifier: string
  ) => {
    try {
      if (Platform.OS === 'ios') {
        // iOS: Отправляем receipt data
        const receiptData = await getReceiptData();
        const transactionId = customerInfo.originalPurchaseDate;
        
        await apiClient.purchaseAppStore({
          product_id: productIdentifier,
          receipt_data: receiptData,
          transaction_id: transactionId ?? undefined,
        });
      } else {
        const purchaseToken = customerInfo.originalAppUserId;
        
        await apiClient.purchaseGooglePlay({
          product_id: productIdentifier,
          purchase_token: purchaseToken,
        });
      }

      console.log('Successfully synced with backend');
    } catch (e: any) {
      console.error('Backend sync error:', e);
    }
  };

  const getReceiptData = async (): Promise<string> => {
    try {
      const receipt = await SecureStore.getItemAsync('app_receipt');
      return receipt || '';
    } catch (e) {
      console.error('Error getting receipt:', e);
      return '';
    }
  };
  return {
    plans,
    currentSubscription,
    isLoading,
    error,
    purchasePlan,
    restorePurchases,
    refreshSubscriptionStatus,
  };
};