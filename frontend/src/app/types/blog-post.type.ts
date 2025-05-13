export type BlogPostType = {
  _id: string;
  title: string;
  content: string;
  contentHtml: string;
  tags: string[];
  author: {
    _id: string;
    firstName: string;
    lastName: string;
    username: string;
    avatar?: string;
    email: string;
    pronouns?: string;
    title?: string;
    location?: string;
    bio?: string;
    posts: number; // Change from any[] to number since it's a virtual count field
    followers?: any[];
    following?: any[];
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
