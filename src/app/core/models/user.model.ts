export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  primaryColor: string;
  secondaryColor: string;
  role?: 'admin' | 'user';
  createdAt: number;
}
