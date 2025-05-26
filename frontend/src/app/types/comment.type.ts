export type CommentType = {
  _id: string;
  content: string;
  userId: {
    _id: string;
    username: string;
    avatar?: string;
  };
  blogId: string;
  likes: string[];
  parentId: string | null;
  replyCount: number;
  replies?: CommentType[];
  createdAt: string;
  updatedAt: string;
};
