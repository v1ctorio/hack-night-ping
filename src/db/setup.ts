import { Sequelize, DataTypes, Model } from 'sequelize';
import { TimeZone } from '../types/global';
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'db.sqlite',
});



class User extends Model {
    public id!: string;
    public TZ!: TimeZone;
    public aviableDays!: number;
}

class HackNight extends Model {
    public id!: string;
    public date!: Date;
    public TZ!: TimeZone;
    public participants!: string;
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

    await sequelize.sync({ force: true });

    return {Hacker:User, HackNight};
}

db_setup(sequelize);