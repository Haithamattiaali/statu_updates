// Netlify Function
exports.handler = async (event) => {
  return {
    statusCode: 200,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({ 
      status: 'ok', 
      message: 'API is running',
      path: event.path,
      method: event.httpMethod
    })
  };
};
