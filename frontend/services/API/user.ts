import { API_URL } from "@/CONSTANTS";
import { UpdateUserData, UserProfile } from "@/services/types/user";
import * as SecureStore from 'expo-secure-store';
import { api } from "./auth";



export const updateUserInfo = async (data: UpdateUserData): Promise<UserProfile> => {
  const token = await SecureStore.getItemAsync('access_token');
  const formData = new FormData();

  formData.append('first_name', data.first_name);
  formData.append('last_name', data.last_name);
  formData.append('phone_number', data.phone_number);

  const response = await api.patch(`${API_URL}api/auth/profile/`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};


export const updateUserAvatar = async (avatarUri: string): Promise<UserProfile> => {
  const token = await SecureStore.getItemAsync('access_token');
  const formData = new FormData();

  // @ts-ignore: React Native FormData hack
  formData.append('photo', {
    uri: avatarUri,
    name: 'avatar.jpg',
    type: 'image/jpeg',
  });

  const response = await api.patch(`${API_URL}api/auth/profile/`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const getProfile = async () => {
  const response = await api.get(`api/auth/profile/`,);
  return response.data
}