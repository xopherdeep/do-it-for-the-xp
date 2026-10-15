/**
 * api.js
 * @desc api controller with get/post methods complete with response and error handlers
 * @version 0.0.1
 * @since 1.0.0
 */
import debug from '@/lib/utils/debug';
import type { ApiConfig } from './apiHost';

export interface ApiType {
  url: string;
  base: string;
  uri?: string;
}

// Enhanced Record type that allows for numeric, boolean values
export interface ApiParams {
  [key: string]: string | number | boolean | string[] | null | undefined;
}

export default class Api {
  uri: string;
  nonce?: string;
  private static instance: Api | null = null;

  constructor({ protocol, url, base, nonce }: ApiConfig) {
    this.uri = protocol ? `${protocol}://${url}/${base}` : `${url}/${base}`;
    this.nonce = nonce;
  }

  /**
   * Get a singleton instance of the API
   * @param config Configuration for the API
   */
  static getInstance(config?: ApiConfig): Api {
    const shouldCreateInstance = !Api.instance && config;
    if (shouldCreateInstance) {
      Api.instance = new Api(config);
    }
    const instance = Api.instance;
    if (!instance) {
      throw new Error('API instance not initialized. Call with config first.');
    }
    return instance;
  }

  /**
   * Static convenience method that delegates to the instance
   */
  static get(type: string, params?: string | string[][] | ApiParams | URLSearchParams | undefined) {
    return Api.getInstance().get(type, params);
  }

  get(
    type: string,
    params?:
      | string
      | string[][]
      | ApiParams
      | URLSearchParams
      | undefined
  ) {
    // turn our params into url query string
    const query = new URLSearchParams();
    
    // Handle different parameter types
    if (params) {
      const isRecordParams = typeof params === 'object' && !(params instanceof URLSearchParams) && !Array.isArray(params);
      if (isRecordParams) {
        // Handle record objects with various value types
        Object.entries(params).forEach(([key, value]) => {
          const hasValue = value !== undefined && value !== null;
          if (hasValue) {
            query.append(key, String(value));
          }
        });
      } else {
        // Use the built-in URLSearchParams constructor for other types
        const searchParams = new URLSearchParams(params);
        searchParams.forEach((value, key) => {
          query.append(key, value);
        });
      }
    }

    const queryString = query.toString().replace(/%2C/g, ",");
    const uri = `${this.uri}/${type}${queryString ? `?${queryString}` : ''}`;
    // The hosting site's nonce makes WordPress treat the request as the signed-in visitor
    const options: RequestInit = this.nonce
      ? { method: "GET", headers: { "X-WP-Nonce": this.nonce } }
      : { method: "GET" };
    return fetch(uri, options)
      .then(this.responseHandler)
      .catch(this.errorHandler);
  }

  /**
   * responseHandler
   * handles turning response into usable json object,
   * return error if !response.ok
   * @return response.json() || Promise.reject
   */
  async responseHandler(response: Response) {
    const data = await response.json();

    // check for error response
    const isErrorResponse = !response.ok;
    if (isErrorResponse) {
      // get error message from body or default to response statusText
      const error = (data && data.message) || response.statusText;
      return Promise.reject(error);
    }

    return { data, headers: response.headers };
  }

  /**
   * errorHandler
   * log error to console
   */
  errorHandler(error: any) {
    debug.error("There was an error!", error);
    return Promise.reject(error);
  }
}