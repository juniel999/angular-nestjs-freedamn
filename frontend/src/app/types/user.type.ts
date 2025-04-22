export type SocialLinks = {
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  github?: string;
  youtube?: string;
  tiktok?: string;
  website?: string;
};

export type UserType = {
  id: string;
  avatar: string;
  coverphoto: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  pronouns?: string;
  title?: string;
  location?: string;
  bio?: string;
  socials?: SocialLinks;
  birthdate?: string;
  isActive: boolean;
  preferredTags?: string[];
};

export type UserStats = {
  postsCount: number;
  followersCount: number;
  followingCount: number;
};

export type ProfileTabsType = 'posts' | 'saved' | 'followers' | 'following';
