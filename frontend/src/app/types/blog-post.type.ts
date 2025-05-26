import { CommentType } from './comment.type';

export type BlogPostType = {
  _id: string;
  title: string;
  slug: string;
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
    posts: number;
    followers?: string[];
    following?: string[];
  };
  published: boolean;
  coverImage?: string;
  images: string[];
  viewCount: number;
  likes: string[];
  comments: CommentType[];
  createdAt: string;
  updatedAt: string;
};
