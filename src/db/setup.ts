import { Sequelize, DataTypes, Model } from 'sequelize';
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'db.sqlite',
});



class User extends Model {
    public id!: string;
    public TZ!: string;
    public blacklistedDays!: number[];
}
export async function db_setup(sequelize: Sequelize): Promise<Array<typeof User>> {
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

    await sequelize.sync({ force: true });

    return [User];
}

db_setup(sequelize);