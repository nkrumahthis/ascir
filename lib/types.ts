export type Member = {
  name: string;
  slug: string;
  role: string;
  bio: string;
  image: string | null;
  order: number;
  type: "team" | "board";
};

export type Post = {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featuredImage: string | null;
  publishedAt: string;
  type: "blog" | "news";
};

export type Event = {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  date: string;
  location: string;
  featuredImage: string | null;
};

export type Tag = {
  name: string;
  slug: string;
};

export type PostTag = {
  postId: string;
  tagId: string;
};
