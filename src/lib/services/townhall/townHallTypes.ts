import type { SitePowers } from "./townHallDesk";

/** What this device keeps about the Town Hall: the family's WordPress link and the posts waiting to be sent. */

/** The family's WordPress account on the Town Hall site, linked through an Application Password. */
export interface TownHallLink {
  siteUrl: string;
  userLogin: string;
  appPassword: string;
  displayName: string;
  linkedAt: number;
  /** The Application Password's id on the site, read after linking; it lets Unlink remove it there too. */
  appPasswordUuid?: string;
  /** What the account may do on the site, read when linking and refreshed each visit; an older link has none until read. */
  powers?: SitePowers;
}

/** What the Account page shows of the family's account on the site; read fresh each time, never kept. */
export interface TownHallProfile {
  login: string;
  displayName: string;
  email?: string;
}

/** One topic, comment or bug report, from the hero's draft until the site has it. */
export interface TownHallPost {
  id: string; // uuid, made on the device
  kind: "topic" | "comment" | "bug";
  heroId: string;
  heroName: string;
  createdAt: number;
  status: "awaiting-gm" | "queued" | "sending" | "sent" | "rejected" | "failed";
  board?: string; // topic: board slug
  postId?: number; // comment: the post or topic it answers
  title?: string;
  body: string;
  bug?: { route: string; environment: string };
  /** A topic on the Pack Exchange: the pack as compact JSON (packShare.ts), sent after the body */
  pack?: string;
  remoteId?: number; // the site's id once sent
  error?: string;
}

export type TownHallPostKind = TownHallPost["kind"];
export type PostStatus = TownHallPost["status"];
