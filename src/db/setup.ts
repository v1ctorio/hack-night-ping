import { Sequelize, DataTypes, Model } from 'sequelize';
import { TimeZone } from '../types/global';
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'db.sqlite',
});



class User extends Model {
    public id!: string;
    public TZ!: TimeZone;
    public blacklistedDays!: number[];
}

class HackNight extends Model {
    public id!: string;
    public date!: Date;
    public TZ!: TimeZone;
    public participants!: string[];
}


export async function db_setup(sequelize: Sequelize): Promise<Array<typeof User | typeof HackNight>> {
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
        blacklistedDays: DataTypes.ARRAY(DataTypes.NUMBER), // week days are represented from 0-6, 0 is Sunday
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
        participants: DataTypes.ARRAY(DataTypes.STRING),
    },
    {
        sequelize,
        modelName: 'HackNight',
        timestamps: true,
    }
    );

    await sequelize.sync({ force: true });

    return [User, HackNight];
}

db_setup(sequelize);