import { Sequelize, DataTypes, Model } from 'sequelize';
import { TimeZone } from '../types/global';
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'db.sqlite',
});



class User extends Model {
    declare id: string;
    declare TZ: TimeZone;
    declare aviableDays: number;
}

class HackNight extends Model {
    declare id: string;
    declare date: Date;
    declare TZ: TimeZone;
    declare participants: string;
    declare announcmentMessage: string;
}


export async function db_setup(sequelize: Sequelize): Promise<{Hacker: typeof User,HackNight: typeof HackNight}> {
    //Use db.sqlite for the database

    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
    } catch (error) {
        console.error('Cannot connect to the database:', error);
    }

    

    User.init({
        id: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false,
        },
        TZ: DataTypes.STRING,
        aviableDays: DataTypes.INTEGER, // week days are represented in binary,1 is monday, 64 is saturday
    },
    {
        sequelize,
        modelName: 'User',
        timestamps: true,
    }
    );

    HackNight.init({
        id: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false,
        },
        date: DataTypes.DATE,
        TZ: DataTypes.STRING,
        participants: DataTypes.STRING, // It has to be a comma separated string :(
    },
    {
        sequelize,
        modelName: 'HackNight',
        timestamps: true,
    }
    );

    await sequelize.sync();

    return {Hacker:User, HackNight};
}

db_setup(sequelize);