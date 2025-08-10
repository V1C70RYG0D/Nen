import dotenv from 'dotenv';
import path from 'path';
import Joi from 'joi';

export class ConfigManager {
  private static instance: ConfigManager;
  private config: any;

  private constructor() {
    dotenv.config({ path: path.resolve(process.cwd(), '.env') });
    this.config = this.validateConfig(process.env);
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private validateConfig(env: NodeJS.ProcessEnv): any {
    const schema = Joi.object({
      DB_HOST: Joi.string().required(),
      DB_USER: Joi.string().required(),
      DB_PASS: Joi.string().required(),
      DB_NAME: Joi.string().required(),
      LOG_LEVEL: Joi.string().default('INFO'),
    }).unknown();

    const { error, value } = schema.validate(env);
    if (error) {
      throw new Error(`Config validation error: ${error.message}`);
    }
    return value;
  }

  public get(key: string): any {
    return this.config[key];
  }
}

export const config = ConfigManager.getInstance();
export default config;
