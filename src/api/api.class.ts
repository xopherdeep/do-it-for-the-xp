/**
 * api.js
 * @desc api controller with get/post methods complete with response and error handlers
 * @version 0.0.1
 * @since 1.0.0
 */
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
  private static instance: Api | null = null;

  constructor({ protocol, url, base }: { protocol?: string, url: string, base: string }) {
    this.uri = protocol ? `${protocol}://${url}/${base}` : `${url}/${base}`;
  }

  /**
   * Get a singleton instance of the API
   * @param config Configuration for the API
   */
  static getInstance(config?: { protocol?: string, url: string, base: string }): Api {
    if (!Api.instance && config) {
      Api.instance = new Api(config);
    }
    if (!Api.instance) {
      throw new Error('API instance not initialized. Call with config first.');
    }
    return Api.instance;
  }

  /**
   * Static convenience method that delegates to the instance
   */
  static get(type: string, params?: string | string[][] | ApiParams | URLSearchParams | undefined) {
    return Api.getInstance().get(type, params);
  }

  /**
   * Static convenience method that delegates to the instance
   */
  static post(type: string, params: any) {
    return Api.getInstance().post(type, params);
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
      if (typeof params === 'object' && !(params instanceof URLSearchParams) && !Array.isArray(params)) {
        // Handle record objects with various value types
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
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
    const options = { method: "GET" };
    return fetch(uri, options)
      .then(this.responseHandler)
      .catch(this.errorHandler);
  }

  post(type: string, params: any) {
    const uri = `${this.uri}/${type}`;
    const options = {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    };
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
    if (!response.ok) {
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
    console.error("There was an error!", error);
    return Promise.reject(error);
  }
}