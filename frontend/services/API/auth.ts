
import { ACCESS_TOKEN, API_URL, REFRESH_TOKEN } from '@/CONSTANTS';
import { LoginArgs, RegisterArgs, VerifyArgs } from '@/services/types/user';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

let isRefreshing = false;
let failedQueue: any[] = [];
export const getAuthHeaders = async () => {
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '69420'
  },
});

export const refreshToken = async () => {
  try {
    const refresh = await SecureStore.getItemAsync(REFRESH_TOKEN);
    if (!refresh) throw new Error('No refresh token');

    const response = await axios.post(`${API_URL}api/auth/token/refresh/`, { refresh });

    await SecureStore.setItemAsync(ACCESS_TOKEN, response.data.access);
    if (response.data.refresh) {
      await SecureStore.setItemAsync(REFRESH_TOKEN, response.data.refresh);
    }
    
    return response.data.access;
  } catch (error) {
    throw error;
  }
};

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.request.use(
  async (config) => {
    // if (PUBLIC_ENDPOINTS.some(url => config.url?.includes(url))) {
    //   return config;
    // }
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);



api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // const isVerifyRequest = originalRequest.url?.includes('/api/auth/token/verify/');
    // const isRefreshRequest = originalRequest.url?.includes('/api/auth/token/refresh/');

    // if (error.response?.status === 401 && !originalRequest._retry && !isVerifyRequest && !isRefreshRequest) {
    if (error.response?.status === 401 && !originalRequest._retry) {
      const hasRefreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN);
      
      if (!hasRefreshToken) {
        await SecureStore.deleteItemAsync(ACCESS_TOKEN);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN);
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newAccessToken = await refreshToken();
        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await logout(); 
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);


export const checkToken = async (): Promise<boolean> => {
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN);
  if (!token) return false;

  try {
    await axios.post(`${API_URL}api/auth/token/verify/`, { token }, {
       headers: { 'Content-Type': 'application/json' }
    });
    return true;
  } catch (error: any) {
    try {
      const newToken = await refreshToken();
      return !!newToken;
    } catch {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN);
      return false;
    }
  }
};


export const loginUser = async ({ login, password, setLoading, onSuccess }: LoginArgs) => {
  if (!login || !password) {
    console.error('Ошибка', 'Заполните все поля');
    return;
  }
  setLoading(true);
  try {
    const response = await axios.post(`${API_URL}api/auth/login/`, {
      login,
      password,
    });
    const data = response.data;

    await SecureStore.setItemAsync(ACCESS_TOKEN, data.access);
    await SecureStore.setItemAsync(REFRESH_TOKEN, data.refresh);
    
    onSuccess();

  } catch (error: any) {
    if (error.response) {
      console.error('Ошибка', error.response.data.detail || 'Неверный логин или пароль');
    } else if (error.request) {
      console.error('Ошибка сети', 'Не удалось связаться с сервером. Проверьте запущен ли бэкенд.');
    } else {
      console.error('Ошибка', 'Произошла неизвестная ошибка');
    }
  } finally {
    setLoading(false);
  }
};



export const registerUser = async ({ form, setLoading, onSuccess }: RegisterArgs) => {
  if (!form.email || !form.password) {
    console.error('Ошибка', 'Заполните обязательные поля');
    return;
  }

  setLoading(true);
  try {
    await axios.post(`${API_URL}api/auth/register/`, form);
    
    onSuccess(form.email);

  } catch (error: any) {
    if (error.response && error.response.data) {
      const errorMsg = JSON.stringify(error.response.data).replace(/[{}"]/g, '');
      console.error(errorMsg);
    } else {
      console.error(error);
    }
  } finally {
    setLoading(false);
  }
};



export const verifyCode = async ({ login, token, setLoading, onSuccess }: VerifyArgs) => {
  if (token.length < 6) {
    console.error('Ошибка', 'Введите 6-значный код');
    return;
  }

  setLoading(true);
  try {
    const response = await axios.post(`${API_URL}api/auth/verify-code/`, {
      login,
      token,
    });

    const data = response.data;

    await SecureStore.setItemAsync(ACCESS_TOKEN, data.access);
    await SecureStore.setItemAsync(REFRESH_TOKEN, data.refresh);
    
    onSuccess();

  } catch (error: any) {
    if (error.response) {
       console.error('Ошибка', error.response.data.error || 'Неверный код');
    } else {
       console.error(error);
    }
  } finally {
    setLoading(false);
  }
};

export const logout = async () => {
  try {
    const refresh = await SecureStore.getItemAsync(REFRESH_TOKEN);
    if (refresh) {
      await api.post(`/api/auth/logout/`, { refresh }, { _retry: true } as any);
    }
  } catch (error) {
    console.warn('Logout request failed');
  } finally {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN);
  }
};
