export const environment = {
  production: false,
  apiUrl: (typeof window !== 'undefined' && window.location.hostname === 'localhost')
    ? 'http://localhost:3001/api'
    : 'https://persianeitor.onrender.com/api'
};