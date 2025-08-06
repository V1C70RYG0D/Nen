export declare class ConfigManager {
    private static instance;
    private config;
    private constructor();
    static getInstance(): ConfigManager;
    private validateConfig;
    get(key: string): any;
}
export declare const config: ConfigManager;
export default config;
//# sourceMappingURL=ConfigManager.d.ts.map