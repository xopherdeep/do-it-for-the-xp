declare module "@/lib/api" {
  export interface ApiType {
    protocol?: string;
    url: string;
    base: string;
    uri?: string;
  }

  // Enhanced Record type that allows for numeric, boolean values
  export interface ApiParams {
    [key: string]: string | number | boolean | string[] | null | undefined;
  }

  class ApiProps {
    private static instance: ApiProps | null;
    constructor({ protocol, url, base }: ApiType);
    uri: string;

    // Instance methods
    get(
      type: string,
      params?: string | string[][] | ApiParams | URLSearchParams | undefined
    ): Promise<any>;
    post(type: string, params: any): Promise<any>;
    responseHandler(response: any): Promise<any>;
    errorHandler(error: any): Promise<any>;

    // Static methods
    static getInstance(config?: ApiType): ApiProps;
    static get(
      type: string,
      params?: string | string[][] | ApiParams | URLSearchParams | undefined
    ): Promise<any>;
    static post(type: string, params: any): Promise<any>;
  }

  export default ApiProps;
}
