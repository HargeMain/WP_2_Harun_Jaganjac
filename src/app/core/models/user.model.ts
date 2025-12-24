export interface AppUser {
  uid?: string;
  email?: string;
  userName?: string;
  name?: string;
  imageBase64?: string;
  surname?: string;
  password?: string;
  primaryColor?: string;
  secondaryColor?: string;
  age?: number;
  role?: 'admin' | 'user';
  createdAt?: number;
}
