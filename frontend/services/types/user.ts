


export interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
}

export interface UpdateUserData {
  first_name: string;
  last_name: string;
  phone_number: string;
}


export interface RegisterForm {
  email: string;
  // username: string;
  // phone_number: string;
  password: string;
}

export interface LoginArgs {
  login: string;
  password: string;
  setLoading: (val: boolean) => void;
  onSuccess: () => void;
}

export interface RegisterArgs {
  form: {
    email: string;
    username: string;
    password: string;
    password_confirm: string;
  };
  setLoading: (val: boolean) => void;
  onSuccess: (email: string) => void;
}

export interface VerifyArgs {
  login: string;
  token: string;
  setLoading: (val: boolean) => void;
  onSuccess: () => void;
}