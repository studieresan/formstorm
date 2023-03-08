export function getFetchErr(dataType) {
  return async function(resp) {
    if (resp.ok) {
      if (dataType === 'json')
        return resp.json();
      else
        return resp.text(); 
    } else {
      let res = await resp.text();
      if (res === undefined || res === null || res === '')
        return Promise.reject(resp.statusText);  
      else
        return Promise.reject('Error: ' + res);
    }
  }
}
