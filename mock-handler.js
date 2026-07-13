export async function handler(event) {
  return {
    statusCode: 200,
    headers: { 'X-Mock': 'True' },
    body: JSON.stringify(event)
  };
}

export async function customFunc(event) {
  return {
    statusCode: 201,
    body: JSON.stringify({ custom: true, event })
  };
}
