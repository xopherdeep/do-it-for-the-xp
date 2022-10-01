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
export default class Api{
  uri: string 

  constructor({protocol, url, base}){
    this.uri = protocol 
      ? `${protocol}://${url}/${base}`
      : `${url}/${base}`
  }


  get(type, params) {
    // turn our params into url query string
    const query = new URLSearchParams(params).toString().replace(/%2C/g,',');
    const uri = `${this.uri}/${type}?${query}`;
    const options = { method: "GET" };
    return fetch(uri, options).then(this.responseHandler).catch(this.errorHandler);
  }

  post(type, params) {
    const uri = `${this.uri}/${type}`;
    const options = {
      method: "POST",
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params),
    };
    return fetch(uri, options).then(this.responseHandler).catch(this.errorHandler);
  }

  /**
   * responseHandler
   * handles turning response into usable json object,
   * return error if !response.ok
   * @return response.json() || Promise.reject
   */
  async responseHandler(response) {
    const data = await response.json();

    // check for error response
    if (!response.ok) {
      // get error message from body or default to response statusText
      const error = (data && data.message) || response.statusText;
      return Promise.reject(error);
    }

    console.log("response", response);

    return { data, headers: response.headers };
  }

  /**
   * errorHandler
   * log error to console
   */
  errorHandler(error){
    console.error("There was an error!", error)
    return Promise.reject(error)
  }
}