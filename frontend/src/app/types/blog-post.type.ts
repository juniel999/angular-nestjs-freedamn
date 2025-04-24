export type BlogPostType = {
  _id: string;
  title: string;
  content: string;
  tags: string[];
  author: {
    _id: string;
    firstName: string;
    lastName: string;
    username: string;
    avatar?: string;
  };
  published: boolean;
  coverImage?: string;
  images: string[];
  viewCount: number;
  likes: string[];
  comments: any[];
  createdAt: string;
  updatedAt: string;
};
