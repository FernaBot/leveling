const EventEmitter = require("node:events");
const pack = require("./package.json");

class FernaLeveling extends EventEmitter {
    constructor(mongoose, leveling) {
        super();

        if (!mongoose || !leveling) throw new Error(`${this.constructor.name} Options: '${mongoose ? "leveling model" : "mongoose client"}' !`);

        this.client = mongoose;
        this.model = leveling;
        this.version = pack.version;
    }

    /**
    * @param {string} [userId] - Discord user id.
    * @param {string} [guildId] - Discord guild id.
    */

    async createUser(userId, guildId) {
        if (!userId) throw new TypeError("An user id was not provided.");
        if (!guildId) throw new TypeError("A guild id was not provided.");

        const isUser = await this.model.findOne({ userId, guildId });
        if (isUser) return false;

        const newUser = new this.model({
            userId,
            guildId
        });

        await newUser.save().catch(e => console.log(`Failed to create user: ${e}`));

        this.emit("userCreate", { guildId, userId, data: newUser });

        return newUser;
    }

    /**
    * @param {string} [userId] - Discord user id.
    * @param {string} [guildId] - Discord guild id.
    */

    async deleteUser(userId, guildId) {
        if (!userId) throw new TypeError("An user id was not provided.");
        if (!guildId) throw new TypeError("A guild id was not provided.");

        const user = await this.model.findOne({ userId, guildId });
        if (!user) return false;

        await this.model.findOneAndDelete({ userId, guildId }).catch(e => console.log(`Failed to delete user: ${e}`));

        this.emit("userDelete", { guildId, userId, data: user });

        return user;
    }

    /**
    * @param {string} [userId] - Discord user id.
    * @param {string} [guildId] - Discord guild id.
    * @param {number} [xp] - Amount of xp to append.
    */

    async appendXp(userId, guildId, xp) {
        if (!userId) throw new TypeError("An user id was not provided.");
        if (!guildId) throw new TypeError("A guild id was not provided.");
        if (xp <= 0 || !xp || isNaN(parseInt(xp))) throw new TypeError("An amount of xp was not provided/was invalid.");

        const user = await this.model.findOne({ userId, guildId });

        if (!user) {
            const newUser = new leveling({
                userId,
                guildId,
                xp,
                level: Math.floor(0.1 * Math.sqrt(xp))
            });

            await newUser.save().catch(e => console.log(`Failed to save new user.`));

            return (Math.floor(0.1 * Math.sqrt(xp)) > 0);
        };

        user.xp += parseInt(xp, 10);
        user.level = Math.floor(0.1 * Math.sqrt(user.xp));
        user.lastUpdated = new Date();
 
        await user.save().catch(e => console.log(`Failed to append xp: ${e}`) );

        return (Math.floor(0.1 * Math.sqrt(user.xp -= xp)) < user.level);
    }

    /**
    * @param {string} [userId] - Discord user id.
    * @param {string} [guildId] - Discord guild id.
    * @param {number} [leveling] - Amount of leveling to append.
    */

    async appendLevel(userId, guildId, levelings) {
        if (!userId) throw new TypeError("An user id was not provided.");
        if (!guildId) throw new TypeError("A guild id was not provided.");
        if (!levelings) throw new TypeError("An amount of leveling was not provided.");

        const user = await this.model.findOne({ userId, guildId });
        if (!user) return false;
        
        user.level += parseInt(levelings, 10);
        user.xp = user.level * user.level * 100;
        user.lastUpdated = new Date();
 
        user.save().catch(e => console.log(`Failed to append level: ${e}`) );

        return user;
    }

    /**
    * @param {string} [userId] - Discord user id.
    * @param {string} [guildId] - Discord guild id.
    * @param {number} [xp] - Amount of xp to set.
    */

    async setXp(userId, guildId, xp) {
        if (!userId) throw new TypeError("An user id was not provided.");
        if (!guildId) throw new TypeError("A guild id was not provided.");
        if (xp <= 0 || !xp || isNaN(parseInt(xp))) throw new TypeError("An amount of xp was not provided/was invalid.");

        const user = await this.model.findOne({ userId, guildId });
        if (!user) return false;

        user.xp = xp;
        user.level = Math.floor(0.1 * Math.sqrt(user.xp));
        user.lastUpdated = new Date();
    
        user.save().catch(e => console.log(`Failed to set xp: ${e}`) );

        return user;
    }

    /**
    * @param {string} [userId] - Discord user id.
    * @param {string} [guildId] - Discord guild id.
    * @param {number} [level] - A level to set.
    */

    async setLevel(userId, guildId, level) {
        if (!userId) throw new TypeError("An user id was not provided.");
        if (!guildId) throw new TypeError("A guild id was not provided.");
        if (!level) throw new TypeError("A level was not provided.");

        const user = await this.model.findOne({ userId, guildId });
        if (!user) return false;

        const oldLevel = user.level;
        user.level = level;
        user.xp = level * level * 100;
        user.lastUpdated = new Date();
        
        user.save().catch(e => console.log(`Failed to set level: ${e}`) );

        return user;
    }

    /**
    * @param {string} [userId] - Discord user id.
    * @param {string} [guildId] - Discord guild id.
    */

    async fetch(userId, guildId, fetchPosition = false) {
        if (!userId) throw new TypeError("An user id was not provided.");
        if (!guildId) throw new TypeError("A guild id was not provided.");

        const user = await this.model.findOne({
            userId,
            guildId
        });
        if (!user) return false;

        if (fetchPosition === true) {
            const leaderboard = await this.model.find({
                guildId
            }).sort([['xp', 'descending']]).exec();

            user.position = leaderboard.findIndex(i => i.userId === userId) + 1;
        }

        user.cleanXp = user.xp - this.xpFor(user.level);
        user.cleanNextLevelXp = this.xpFor(user.level + 1) - this.xpFor(user.level);
        
        return user;
    }

    /**
    * @param {string} [userId] - Discord user id.
    * @param {string} [guildId] - Discord guild id.
    * @param {number} [xp] - Amount of xp to subtract.
    */

    async subtractXp(userId, guildId, xp) {
        if (!userId) throw new TypeError("An user id was not provided.");
        if (!guildId) throw new TypeError("A guild id was not provided.");
        if (xp <= 0 || !xp || isNaN(parseInt(xp))) throw new TypeError("An amount of xp was not provided/was invalid.");

        const user = await this.model.findOne({ userId, guildId });
        if (!user) return false;

        user.xp -= xp;
        user.level = Math.floor(0.1 * Math.sqrt(user.xp));
        user.lastUpdated = new Date();
     
        user.save().catch(e => console.log(`Failed to subtract xp: ${e}`) );

        return user;
    }

    /**
    * @param {string} [userId] - Discord user id.
    * @param {string} [guildId] - Discord guild id.
    * @param {number} [leveling] - Amount of leveling to subtract.
    */

    async subtractLevel(userId, guildId, levelings) {
        if (!userId) throw new TypeError("An user id was not provided.");
        if (!guildId) throw new TypeError("A guild id was not provided.");
        if (!levelings) throw new TypeError("An amount of leveling was not provided.");

        const user = await this.model.findOne({ userId, guildId });
        if (!user) return false;

        user.level -= levelings;
        user.xp = user.level * user.level * 100;
        user.lastUpdated = new Date();
        
        user.save().catch(e => console.log(`Failed to subtract leveling: ${e}`) );

        return user;
    }

    /**
    * @param {string} [guildId] - Discord guild id.
    * @param {number} [limit] - Amount of maximum enteries to return.
    */


    async fetchLeaderboard(guildId, limit) {
        if (!guildId) throw new TypeError("A guild id was not provided.");
        if (!limit) throw new TypeError("A limit was not provided.");

        const users = await this.model.find({ guildId }).sort([['xp', 'descending']]).limit(limit).exec();

        return users;
    }

    /**
    * @param {string} [client] - Your Discord.CLient.
    * @param {array} [leaderboard] - The output from 'fetchLeaderboard' function.
    */

    async computeLeaderboard(client, leaderboard, fetchUsers = false) {
        if (!client) throw new TypeError("A client was not provided.");
        if (!leaderboard) throw new TypeError("A leaderboard id was not provided.");

        if (leaderboard.length < 1) return [];

        const computedArray = [];

        if (fetchUsers) {
            for (const key of leaderboard) {
                const user = await client.users.fetch(key.userId) || { username: "Unknown", discriminator: "0000" };
                computedArray.push({
                    guildId: key.guildId,
                    userId: key.userId,
                    xp: key.xp,
                    level: key.level,
                    position: (leaderboard.findIndex(i => i.guildId === key.guildId && i.userId === key.userId) + 1),
                    username: user.username,
                    discriminator: user.discriminator
                });
            }
        } else {
            leaderboard.map(key => computedArray.push({
                guildId: key.guildId,
                userId: key.userId,
                xp: key.xp,
                level: key.level,
                position: (leaderboard.findIndex(i => i.guildId === key.guildId && i.userId === key.userId) + 1),
                username: client.users.cache.get(key.userId) ? client.users.cache.get(key.userId).username : "Unknown",
                discriminator: client.users.cache.get(key.userId) ? client.users.cache.get(key.userId).discriminator : "0000"
            }));
        }

        return computedArray;
    }
    
    /*
    * @param {number} [targetLevel] - Xp required to reach that level.
    */
    xpFor(targetLevel) {
        if (isNaN(targetLevel) || isNaN(parseInt(targetLevel, 10))) throw new TypeError("Target level should be a valid number.");
        if (isNaN(targetLevel)) targetLevel = parseInt(targetLevel, 10);
        if (targetLevel < 0) throw new RangeError("Target level should be a positive number.");
        return targetLevel * targetLevel * 100;
    }

    /**
    * @param {string} [guildId] - Discord guild id.
    */

     async deleteGuild(guildId) {
        if (!guildId) throw new TypeError("A guild id was not provided.");

        const guild = await this.model.findOne({ guildId });
        if (!guild) return false;

        await this.model.deleteMany({ guildId }).catch(e => console.log(`Failed to delete guild: ${e}`));

        this.emit("dataRemove", { guildId, data: guild });

        return guild;
    }
}

module.exports = FernaLeveling;