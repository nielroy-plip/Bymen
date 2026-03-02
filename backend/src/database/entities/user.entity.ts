export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: 'ADMIN' | 'OPERATOR';
  createdAt: Date;
}
