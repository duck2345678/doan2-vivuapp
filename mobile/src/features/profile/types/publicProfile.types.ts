/**
 * Public Profile Types
 */

import type { Profile } from "./profile.types";

export interface PublicProfile extends Profile {
  threadId?: string;
}

export interface ProfilePostLocation {
  id: string;
  name: string;
}

export interface ProfilePostAuthor {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface ProfilePostReactions {
  likes: number;
  comments: number;
  shares?: number;
  isLiked?: boolean;
}

export interface ProfilePost {
  id: string;
  author: ProfilePostAuthor;
  content: string;
  imageUrl?: string;
  createdAt: string;
  visibility?: string; // PUBLIC, PRIVATE, FRIENDS
  locations: ProfilePostLocation[];
  reactions: ProfilePostReactions;
}

export type PublicProfileTab = "posts" | "saved";
