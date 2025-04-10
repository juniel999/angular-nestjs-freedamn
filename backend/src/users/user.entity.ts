export class User {
  id: number;
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  
  // You can extend this with more fields as needed
  isActive?: boolean;
  roles?: string[];
  createdAt: Date;
  updatedAt: Date;
} 