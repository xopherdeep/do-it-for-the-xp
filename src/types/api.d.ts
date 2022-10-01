declare module '@/api' {
    export interface ApiType {
        protocol: string;
        url: string;
        base: string;
        uri?: string;
    }

    class Api {
        constructor({ protocol, url, base }: ApiType);
        uri: string;
        get(type: string, params: any): Promise<any>;
        post(type: string, params: any): Promise<any>;
        responseHandler(response: any): Promise<any>;
        errorHandler(error: any): Promise<any>;
    }

    export default Api;
}





