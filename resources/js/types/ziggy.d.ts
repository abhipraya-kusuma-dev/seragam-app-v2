declare global {
    interface Window {
        Ziggy: {
            port: string;
            secure: boolean;
            scheme: string;
            host: string;
            basePath: string;
            location: Location;
            routes: {
                [key: string]: {
                    uri: string;
                    methods: string[];
                };
            };
        };
    }
}
