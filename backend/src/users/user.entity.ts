export class User {
  id: number;
  username: string;
  email: string;
  password: string;
  
  // You can extend this with more fields as needed
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  roles?: string[];
  createdAt: Date;
  updatedAt: Date;
} 