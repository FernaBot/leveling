import { Client } from "discord.js";
import mongoose from "mongoose";

type User = {
  userId: string;
  guildId: string;
  xp: number;
  level: number;
  lastUpdated: Date;
  cleanXp: number;
  cleanNextLevelXp: number;
};

type LeaderboardUser = {
  guildId: string;
  userId: string;
  xp: number;
  level: number;
  position: number;
  username: String | null;
  discriminator: String | null;
};

declare module "@ferna/leveling" {
  export default class FernaLeveling {
    constructor(mongoose: mongoose, leveling: monggose.model) {}
    async setURL(dbURL: string): Promise<typeof mongoose>;
    async createUser(userId: string, guildId: string): Promise<User>;
    async deleteUser(userId: string, guildId: string): Promise<User>;
    async deleteGuild(guildId: string): Promise<Guild>;
    async appendXp(userId: string, guildId: string, xp: number): Promise<boolean>;
    async appendLevel(userId: string, guildId: string, levels: number): Promise<User>;
    async setXp(userId: string, guildId: string, xp: number): Promise<User>;
    async setLevel(userId: string, guildId: string, level: number): Promise<User>;
    async fetch(userId: string, guildId: string, fetchPosition = false): Promise<User>;
    async subtractXp(userId: string, guildId: string, xp: number): Promise<User>;
    async subtractLevel(userId: string, guildId: string, level: number): Promise<User>;
    async fetchLeaderboard(guildId: String, limit: number): Promise<User[] | []>;
    async computeLeaderboard(client: Client, leaderboard: User[], fetchUsers = false): Promise<LeaderboardUser[] | []>;
    xpFor(targetLevel: number): number;
  }
}